/**
 * Rule: require-route-documentation
 *
 * Requires JSDoc-style comments above route definitions documenting:
 * - HTTP method and path
 * - Required permission (Action field)
 * - Brief description
 *
 * Example:
 * /**
 *  * GET /api/admin/users
 *  * Action: users.view
 *  * Get all users from the database
 *  *\/
 * app.get("/api/admin/users", requireAuth, requirePermission("users.view", "system"), handler)
 */

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Require documentation comments for API routes",
      category: "Documentation",
      recommended: true,
    },
    messages: {
      missingDocs:
        "Route is missing documentation comment. Add a comment describing the endpoint, required permission, and purpose.",
      missingAction:
        "Route documentation is missing 'Action:' field specifying required permission.",
      missingDescription: "Route documentation is missing a description of what the endpoint does.",
    },
    schema: [
      {
        type: "object",
        properties: {
          exemptRoutes: {
            type: "array",
            items: { type: "string" },
            description: "Routes to exempt from documentation requirement",
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const exemptRoutes = context.options[0]?.exemptRoutes || ["/api/csrf-token"];

    /**
     * Check if a route path matches an exempt pattern
     */
    function isExemptRoute(routePath) {
      if (!routePath) return false;
      return exemptRoutes.some((pattern) => {
        if (typeof pattern === "string") {
          return routePath.includes(pattern);
        }
        return false;
      });
    }

    /**
     * Extract route path from CallExpression arguments
     */
    function getRoutePath(node) {
      if (node.arguments.length > 0) {
        const firstArg = node.arguments[0];
        if (firstArg.type === "Literal") {
          return firstArg.value;
        }
        if (firstArg.type === "TemplateLiteral") {
          if (firstArg.quasis.length > 0) {
            return firstArg.quasis[0].value.cooked;
          }
        }
      }
      return null;
    }

    /**
     * Check if a comment contains required documentation
     */
    function parseRouteComment(comment) {
      const text = comment.value;

      // Look for "Action:" field
      const hasAction = /Action:\s*[\w.]+/i.test(text);

      // Look for HTTP method and path (e.g., "GET /api/admin/users")
      const hasMethodPath = /(GET|POST|PUT|PATCH|DELETE)\s+\/api\//i.test(text);

      // Check for description (at least one line that's not Action or method/path)
      const lines = text.split("\n").map((l) => l.trim().replace(/^\*\s*/, ""));
      const descriptionLines = lines.filter(
        (line) =>
          line.length > 10 &&
          !line.match(/^(GET|POST|PUT|PATCH|DELETE)\s+\/api\//i) &&
          !line.match(/^Action:/i)
      );
      const hasDescription = descriptionLines.length > 0;

      return {
        hasAction,
        hasMethodPath,
        hasDescription,
        isDocComment: comment.type === "Block" && text.startsWith("*"),
      };
    }

    /**
     * Get comment immediately preceding a node
     */
    function getPrecedingComment(node) {
      const sourceCode = context.getSourceCode();
      const comments = sourceCode.getCommentsBefore(node);

      if (comments.length === 0) {
        return null;
      }

      // Get the last comment before the node
      return comments[comments.length - 1];
    }

    return {
      CallExpression(node) {
        // Match app.METHOD() calls
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.object.name === "app" &&
          ["get", "post", "put", "patch", "delete"].includes(node.callee.property.name)
        ) {
          const routePath = getRoutePath(node);

          // Skip exempt routes
          if (isExemptRoute(routePath)) {
            return;
          }

          // Skip if no middleware (likely test or public route)
          if (node.arguments.length < 3) {
            return;
          }

          // Get preceding comment
          const comment = getPrecedingComment(node);

          if (!comment) {
            context.report({
              node,
              messageId: "missingDocs",
            });
            return;
          }

          // Parse comment content
          const parsed = parseRouteComment(comment);

          if (!parsed.isDocComment) {
            context.report({
              node,
              messageId: "missingDocs",
            });
            return;
          }

          if (!parsed.hasAction) {
            context.report({
              node,
              messageId: "missingAction",
            });
          }

          if (!parsed.hasDescription) {
            context.report({
              node,
              messageId: "missingDescription",
            });
          }
        }
      },
    };
  },
};
