module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'jsx-a11y',
    'vitest',
    'testing-library',
    'jest-dom',
    'rbac',
    'filenames',
  ],
  extends: ['eslint:recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended', 'plugin:@typescript-eslint/recommended', 'plugin:jsx-a11y/recommended', 'prettier', 'plugin:storybook/recommended'],
  rules: {
    // General
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-var': 'error',
    'prefer-const': 'error',
    'no-param-reassign': ['error', { props: true }],
    'prefer-template': 'error',
    'no-nested-ternary': 'warn',
    'no-unneeded-ternary': 'warn',
    'object-shorthand': ['warn', 'always'],
    'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    // Fully relax underscore-dangle so `_`-prefixed unused vars don't clash with lint
    'no-underscore-dangle': 'off',
    'no-empty': ['warn', { allowEmptyCatch: true }],

    // TypeScript
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { 
        argsIgnorePattern: '^_', 
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        args: 'after-used',
        caughtErrors: 'none',
      },
    ],
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn', // Warn on any types (will fix systematically)
    '@typescript-eslint/no-floating-promises': 'warn', // Warn on floating promises (will fix systematically)
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],

    // React
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off',
    'react/display-name': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/jsx-key': ['error', { checkFragmentShorthand: true }],
    'react/self-closing-comp': ['error', { component: true, html: true }],
    'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': [
      'warn',
      {
        additionalHooks: '(useCustomHook|useAnotherCustomHook)'
      }
    ],

    // Import/Export rules temporarily disabled due to compatibility issues

    // File naming conventions (Phase 0)
    'filenames/match-regex': [2, '^[A-Z][a-zA-Z]+$|^[a-z][a-z0-9-]+(\\.[a-z]+)?$', true],
    'filenames/match-exported': [2, 'kebab'],

    // SDK Import Restrictions (Phase 0: Integration Removal)
    // Block direct imports of external SDKs - use provider abstractions instead
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@hubspot/api-client',
            message: 'Direct HubSpot SDK imports are restricted. Use server/services/providers instead. See docs/INTEGRATION_REMOVAL_PLAN.md',
          },
          {
            name: 'box-node-sdk',
            message: 'Direct Box SDK imports are restricted. Use server/services/storage-service.ts abstraction. See docs/INTEGRATION_REMOVAL_PLAN.md',
          },
          {
            name: 'airtable',
            message: 'Airtable integration is deprecated and will be removed. Use internal CLIENTIQ instead. See docs/INTEGRATION_REMOVAL_PLAN.md',
          },
        ],
        patterns: [
          {
            group: ['@hubspot/*'],
            message: 'Direct HubSpot imports are restricted. Use provider abstraction.',
          },
          {
            group: ['box-node-sdk*'],
            message: 'Direct Box imports are restricted. Use storage service abstraction.',
          },
        ],
      },
    ],

    // Security: Prevent inline authorization checks
    // All routes must use requirePermission middleware instead
    'no-restricted-syntax': [
      'error',
      {
        selector: "MemberExpression[object.object.name='req'][object.property.name='user'][property.name='role']",
        message: 'Avoid inline auth checks like req.user.role or req.user?.role. Use requirePermission() middleware instead. See docs/AUTHORIZATION_PATTERN.md'
      },
      {
        selector: "MemberExpression[object.object.name='req'][object.property.name='user'][property.name='permissionLevel']",
        message: 'Avoid inline auth checks like req.user.permissionLevel. Use requirePermission() middleware instead. See docs/AUTHORIZATION_PATTERN.md'
      },
    ],

    // Performance: Prevent heavy debug logging in production paths
    // Use shared environment config instead of direct process.env checks
    'no-restricted-properties': [
      'error',
      {
        object: 'env',
        property: 'DEBUG_HTTP',
        message: 'Use shouldDebugRequests() or shouldLogResponses() from server/config/environment instead of direct process.env.DEBUG_HTTP checks. This ensures production safety.'
      },
    ],

    // RBAC: Prevent direct role checks in frontend (use usePermissions hook instead)
    'rbac/no-direct-role-checks': ['warn', {
      allowedFiles: [
        'shared/permissions.ts',
        'hooks/use-permissions.tsx',
        'lib/can.ts',
      ],
    }],
  },
  overrides: [
    // TypeScript files
    {
      files: ['**/*.ts', '**/*.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-module-boundary-types': [
          'warn',
          {
            allowArgumentsExplicitlyTypedAsAny: true,
            allowDirectConstAssertionInArrowFunctions: true,
            allowHigherOrderFunctions: true,
            allowTypedFunctionExpressions: true,
          },
        ],
      },
    },
    // JavaScript files (exclude TypeScript files)
    {
      files: ['**/*.js', '**/*.jsx'],
      parser: 'espree',
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      rules: {
        // Disable TypeScript-specific rules for JS files
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/restrict-plus-operands': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
      },
    },
    // Test files
    {
      files: ['**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**/*.{js,jsx,ts,tsx}'],
      env: {
        node: true,
      },
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'vitest/no-focused-tests': 'error',
        'vitest/expect-expect': 'warn',
      },
    },
    // Frontend components - enforce authenticated API usage
    {
      files: [
        'client/src/components/**/*.{ts,tsx}',
        'client/src/pages/**/*.{ts,tsx}',
        'client/src/features/**/*.{ts,tsx}',
      ],
      excludedFiles: ['**/*.test.{ts,tsx}', '**/__tests__/**'],
      rules: {
        // Prevent raw fetch() in components - use apiFetch() instead
        'no-restricted-globals': [
          'error',
          {
            name: 'fetch',
            message: [
              'Do not use raw fetch() in components for authenticated API calls.',
              'Use apiFetch() from @/lib/api which automatically adds Authorization headers.',
              'Example: apiFetch<T>("GET", "/api/admin/rbac/users")',
              '',
              'If you need unauthenticated fetch (e.g., public APIs), add an ESLint disable comment:',
              '// eslint-disable-next-line no-restricted-globals',
            ].join('\n'),
          },
        ],
      },
    },
    // Server/middleware files - allow Express patterns + enforce RBAC
    {
      files: ['server/**/*.ts', 'server/**/*.js'],
      rules: {
        // Express middleware commonly mutates req/res properties (e.g., req.user, res.locals)
        // This is an intentional and standard pattern in Express
        'no-param-reassign': ['error', { props: false }],

        // RBAC: Enforce permission middleware on routes
        'rbac/require-permission-middleware': ['warn', {
          exemptRoutes: [
            '/api/user',
            '/api/csrf-token',
            '/api/auth',
            '/api/health',
          ],
        }],

        // RBAC: Prevent inline auth checks (use middleware)
        'rbac/no-inline-auth-checks': 'warn',

        // RBAC: Require route documentation
        'rbac/require-route-documentation': ['warn', {
          exemptRoutes: ['/api/csrf-token', '/api/health'],
        }],
      },
    },
    // Provider implementation files - allow SDK imports (temporary during Phase 0-1)
    {
      files: [
        'server/services/providers/hubspot-provider.ts',
        'server/services/hubspot/**/*.ts',
        'server/services/storage-service.ts',
        'server/box-integration.ts',
        'server/services/crm-service.ts',
        'server/airtable.ts',
        'server/client-intel.ts',
      ],
      rules: {
        'no-restricted-imports': 'off',
      },
    },
  ],
};
