/**
 * Rule: no-direct-role-checks
 *
 * Prevents direct user.role checks in frontend code.
 * Use usePermissions() hook or PermissionGuard component instead.
 *
 * Examples:
 * ❌ if (user.role === "admin") { ... }
 * ❌ user?.role === "admin" && <Button />
 * ❌ const isAdmin = user.role === "admin"
 * ✅ const { hasPermission } = usePermissions(); if (hasPermission("admin.view:system")) { ... }
 * ✅ <PermissionGuard permissions="admin.view:system"><Button /></PermissionGuard>
 */

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Prevent direct user.role checks in frontend code",
      category: "RBAC Migration",
      recommended: true,
    },
    messages: {
      directRoleCheck:
        "Avoid direct user.role checks. Use usePermissions() hook or PermissionGuard component instead.",
      directRoleCheckSuggestion:
        "Replace with: const { hasPermission } = usePermissions(); hasPermission('permission:scope')",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowedFiles: {
            type: "array",
            items: { type: "string" },
            description: "Files allowed to use direct role checks (e.g., legacy files)",
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const filename = context.getFilename();
    const allowedFiles = context.options[0]?.allowedFiles || [
      "shared/permissions.ts", // Legacy permission system
      "hooks/use-permissions.tsx", // Hook implementation itself
      "lib/can.ts", // Legacy helper (deprecated)
    ];

    /**
     * Check if current file is allowed to use direct role checks
     */
    function isAllowedFile() {
      return allowedFiles.some((pattern) => filename.includes(pattern));
    }

    /**
     * Check if a MemberExpression is accessing user.role
     */
    function isUserRoleAccess(node) {
      if (node.type !== "MemberExpression") return false;

      // Check for user.role
      if (node.object.name === "user" && node.property.name === "role") {
        return true;
      }

      // Check for user?.role (optional chaining)
      if (node.optional && node.object.name === "user" && node.property.name === "role") {
        return true;
      }

      // Check for req.user.role
      if (
        node.object.type === "MemberExpression" &&
        node.object.object.name === "req" &&
        node.object.property.name === "user" &&
        node.property.name === "role"
      ) {
        return true;
      }

      // Check for currentUser.role
      if (node.object.name === "currentUser" && node.property.name === "role") {
        return true;
      }

      return false;
    }

    return {
      MemberExpression(node) {
        // Skip if in allowed file
        if (isAllowedFile()) {
          return;
        }

        // Check if this is accessing user.role
        if (isUserRoleAccess(node)) {
          // Skip if it's just a type annotation or import
          if (node.parent.type === "TSTypeAnnotation") {
            return;
          }

          context.report({
            node,
            messageId: "directRoleCheck",
          });
        }
      },

      /**
       * Also catch role checks in logical expressions
       * e.g., user?.role === "admin" && <Button />
       */
      BinaryExpression(node) {
        if (isAllowedFile()) {
          return;
        }

        // Check left side
        if (isUserRoleAccess(node.left)) {
          context.report({
            node: node.left,
            messageId: "directRoleCheck",
          });
        }

        // Check right side
        if (isUserRoleAccess(node.right)) {
          context.report({
            node: node.right,
            messageId: "directRoleCheck",
          });
        }
      },
    };
  },
};
