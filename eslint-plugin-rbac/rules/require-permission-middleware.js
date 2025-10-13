/**
 * Rule: require-permission-middleware
 *
 * Enforces that all Express route handlers use requirePermission middleware.
 * Flags routes that only use requireAuth or have no auth middleware.
 *
 * Examples:
 * ❌ app.get("/api/admin/users", requireAuth, handler)
 * ✅ app.get("/api/admin/users", requireAuth, requirePermission("users.view", "system"), handler)
 */

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce requirePermission middleware on API routes",
      category: "Security",
      recommended: true,
    },
    messages: {
      missingPermission:
        "Route is missing requirePermission middleware. Add permission check after requireAuth.",
      onlyAuth:
        "Route only has requireAuth. Add requirePermission to enforce granular access control.",
    },
    schema: [
      {
        type: "object",
        properties: {
          exemptRoutes: {
            type: "array",
            items: { type: "string" },
            description: "Routes to exempt from this rule (e.g., public endpoints)",
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const exemptRoutes = context.options[0]?.exemptRoutes || [
      "/api/user",
      "/api/csrf-token",
      "/api/auth",
    ];

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
     * Check if middleware array includes requirePermission
     */
    function hasRequirePermission(middlewareArgs) {
      return middlewareArgs.some((arg) => {
        // Check if it's a CallExpression to requirePermission
        if (arg.type === "CallExpression") {
          if (arg.callee.type === "Identifier" && arg.callee.name === "requirePermission") {
            return true;
          }
        }
        // Check if it's an identifier named requirePermission
        if (arg.type === "Identifier" && arg.name === "requirePermission") {
          return true;
        }
        return false;
      });
    }

    /**
     * Check if middleware array includes requireAuth
     */
    function hasRequireAuth(middlewareArgs) {
      return middlewareArgs.some((arg) => {
        if (arg.type === "Identifier" && arg.name === "requireAuth") {
          return true;
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
          // For template literals, try to extract static parts
          if (firstArg.quasis.length > 0) {
            return firstArg.quasis[0].value.cooked;
          }
        }
      }
      return null;
    }

    return {
      /**
       * Check Express route definitions: app.get(), app.post(), etc.
       */
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

          // Get all middleware arguments (everything except the route path and final handler)
          const middlewareArgs = node.arguments.slice(1, -1);

          // Skip if no middleware (likely a public route or test code)
          if (middlewareArgs.length === 0) {
            return;
          }

          // Check for requirePermission
          const hasPermission = hasRequirePermission(middlewareArgs);
          const hasAuth = hasRequireAuth(middlewareArgs);

          // Report if missing requirePermission but has requireAuth
          if (hasAuth && !hasPermission) {
            context.report({
              node,
              messageId: "onlyAuth",
              data: {
                route: routePath || "unknown",
              },
            });
          }
        }
      },
    };
  },
};
