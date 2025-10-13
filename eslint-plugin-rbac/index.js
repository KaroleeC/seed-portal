/**
 * Custom ESLint plugin for RBAC enforcement
 *
 * This plugin provides rules to enforce RBAC patterns and flag legacy code
 * that needs migration to the new permission-based system.
 */

module.exports = {
  rules: {
    "require-permission-middleware": require("./rules/require-permission-middleware"),
    "no-inline-auth-checks": require("./rules/no-inline-auth-checks"),
    "require-route-documentation": require("./rules/require-route-documentation"),
    "no-direct-role-checks": require("./rules/no-direct-role-checks"),
  },
  configs: {
    recommended: {
      plugins: ["rbac"],
      rules: {
        "rbac/require-permission-middleware": "warn",
        "rbac/no-inline-auth-checks": "warn",
        "rbac/require-route-documentation": "warn",
        "rbac/no-direct-role-checks": "warn",
      },
    },
    strict: {
      plugins: ["rbac"],
      rules: {
        "rbac/require-permission-middleware": "error",
        "rbac/no-inline-auth-checks": "error",
        "rbac/require-route-documentation": "error",
        "rbac/no-direct-role-checks": "error",
      },
    },
  },
};
