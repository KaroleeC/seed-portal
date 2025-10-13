/**
 * Rule: no-inline-auth-checks
 *
 * Prevents inline authentication/authorization checks in route handlers.
 * Auth should be handled by middleware (requireAuth, requirePermission).
 *
 * Examples:
 * ❌ if (!req.user) return res.status(401).json(...)
 * ❌ if (req.user.role !== "admin") return res.status(403).json(...)
 * ✅ Use requireAuth and requirePermission middleware instead
 */

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Prevent inline authentication checks in route handlers",
      category: "Security",
      recommended: true,
    },
    messages: {
      inlineAuthCheck: "Avoid inline auth checks. Use requireAuth middleware instead.",
      inlineRoleCheck: "Avoid inline role checks. Use requirePermission middleware instead.",
      inlinePermissionCheck:
        "Use requirePermission middleware instead of inline permission checks.",
    },
    schema: [],
  },

  create(context) {
    /**
     * Check if we're inside a route handler function
     */
    function isInRouteHandler(node) {
      let parent = node.parent;
      let depth = 0;
      const maxDepth = 10; // Prevent infinite loops

      while (parent && depth < maxDepth) {
        // Check if parent is a CallExpression to app.METHOD
        if (
          parent.type === "CallExpression" &&
          parent.callee.type === "MemberExpression" &&
          parent.callee.object.name === "app" &&
          ["get", "post", "put", "patch", "delete"].includes(parent.callee.property.name)
        ) {
          return true;
        }
        parent = parent.parent;
        depth++;
      }
      return false;
    }

    /**
     * Check if an if statement is checking user authentication
     */
    function isAuthCheck(node) {
      if (node.type !== "IfStatement") return false;

      const test = node.test;

      // Check for: if (!req.user)
      if (test.type === "UnaryExpression" && test.operator === "!") {
        const arg = test.argument;
        if (
          arg.type === "MemberExpression" &&
          arg.object.name === "req" &&
          arg.property.name === "user"
        ) {
          return "auth";
        }
      }

      // Check for: if (!user)
      if (test.type === "UnaryExpression" && test.operator === "!") {
        const arg = test.argument;
        if (arg.type === "Identifier" && arg.name === "user") {
          return "auth";
        }
      }

      // Check for: if (req.user.role === "admin")
      if (test.type === "BinaryExpression") {
        const left = test.left;
        if (
          left.type === "MemberExpression" &&
          left.object.type === "MemberExpression" &&
          left.object.object.name === "req" &&
          left.object.property.name === "user" &&
          left.property.name === "role"
        ) {
          return "role";
        }

        // Check for: if (user.role === "admin")
        if (
          left.type === "MemberExpression" &&
          left.object.name === "user" &&
          left.property.name === "role"
        ) {
          return "role";
        }
      }

      return false;
    }

    return {
      IfStatement(node) {
        // Only check if we're inside a route handler
        if (!isInRouteHandler(node)) {
          return;
        }

        const checkType = isAuthCheck(node);

        if (checkType === "auth") {
          context.report({
            node,
            messageId: "inlineAuthCheck",
          });
        } else if (checkType === "role") {
          context.report({
            node,
            messageId: "inlineRoleCheck",
          });
        }
      },
    };
  },
};
