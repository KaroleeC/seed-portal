#!/usr/bin/env tsx

/**
 * Feature Generator Script
 *
 * Creates a new feature directory with standard structure and placeholder files.
 *
 * Usage:
 *   npm run generate:feature my-feature-name
 *   tsx scripts/new-feature.ts my-feature-name
 */

/* eslint-disable no-console */
// Console output is appropriate for CLI scripts

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get feature name from command line args
const featureName = process.argv[2];

// Validation
if (!featureName) {
  console.error('❌ Error: Feature name is required');
  console.log('');
  console.log('Usage:');
  console.log('  npm run generate:feature my-feature-name');
  console.log('  tsx scripts/new-feature.ts my-feature-name');
  process.exit(1);
}

// Validate kebab-case naming
if (!/^[a-z][a-z0-9-]*$/.test(featureName)) {
  console.error('❌ Error: Feature name must be in kebab-case');
  console.log('  Examples: user-profile, quote-calculator, client-intel');
  console.log('  Invalid: UserProfile, user_profile, User-Profile');
  process.exit(1);
}

// Convert kebab-case to PascalCase for component names
function toPascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

const featurePascalCase = toPascalCase(featureName);

// Paths
const projectRoot = path.resolve(__dirname, '..');
const featuresDir = path.join(projectRoot, 'client', 'src', 'features');
const featurePath = path.join(featuresDir, featureName);

// Check if feature already exists
if (fs.existsSync(featurePath)) {
  console.error(`❌ Error: Feature "${featureName}" already exists at:`);
  console.log(`  ${featurePath}`);
  process.exit(1);
}

console.log(`🚀 Creating feature: ${featureName}`);
console.log('');

// Create directory structure
const directories = [
  featurePath,
  path.join(featurePath, 'components'),
  path.join(featurePath, 'hooks'),
  path.join(featurePath, 'utils'),
  path.join(featurePath, 'types'),
  path.join(featurePath, 'api'),
  path.join(featurePath, '__tests__'),
];

directories.forEach((dir) => {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`  ✅ Created ${path.relative(projectRoot, dir)}/`);
});

// Create index.ts (barrel export file)
const indexContent = `/**
 * ${featurePascalCase} Feature
 *
 * Description: TODO: Add feature description
 *
 * This feature includes:
 * - TODO: List key components
 * - TODO: List key hooks
 * - TODO: List key utilities
 */

// Export components
// export { ${featurePascalCase}Component } from './components/${featurePascalCase}Component';

// Export hooks
// export { use${featurePascalCase} } from './hooks/use-${featureName}';

// Export utilities
// export { ${featureName}Util } from './utils/${featureName}-util';

// Export types
export type * from './types';
`;

fs.writeFileSync(path.join(featurePath, 'index.ts'), indexContent);
console.log(`  ✅ Created ${path.relative(projectRoot, path.join(featurePath, 'index.ts'))}`);

// Create types/index.ts
const typesContent = `/**
 * Types for ${featurePascalCase} feature
 */

export interface ${featurePascalCase}Data {
  id: string;
  // Add your type fields here
}

export interface ${featurePascalCase}State {
  data: ${featurePascalCase}Data | null;
  isLoading: boolean;
  error: Error | null;
}
`;

fs.writeFileSync(path.join(featurePath, 'types', 'index.ts'), typesContent);
console.log(`  ✅ Created ${path.relative(projectRoot, path.join(featurePath, 'types', 'index.ts'))}`);

// Create README.md
const readmeContent = `# ${featurePascalCase} Feature

## Overview

TODO: Add feature overview

## Structure

\`\`\`
${featureName}/
├── components/     # Feature-specific components
├── hooks/          # Feature-specific hooks
├── utils/          # Feature-specific utilities
├── types/          # Feature-specific TypeScript types
├── api/            # API calls for this feature
├── __tests__/      # Tests for this feature
└── index.ts        # Public exports (barrel file)
\`\`\`

## Usage

\`\`\`typescript
import { ${featurePascalCase}Component, use${featurePascalCase} } from '@features/${featureName}';

function MyPage() {
  const { data, isLoading } = use${featurePascalCase}();
  
  return <${featurePascalCase}Component data={data} />;
}
\`\`\`

## Components

### ${featurePascalCase}Component

TODO: Document components

## Hooks

### use${featurePascalCase}

TODO: Document hooks

## API

TODO: Document API endpoints used by this feature

## Testing

Run tests:
\`\`\`bash
npm test -- ${featureName}
\`\`\`

## Notes

TODO: Add any additional notes, dependencies, or considerations
`;

fs.writeFileSync(path.join(featurePath, 'README.md'), readmeContent);
console.log(`  ✅ Created ${path.relative(projectRoot, path.join(featurePath, 'README.md'))}`);

// Helper function to replace placeholders in template content
function replacePlaceholders(content: string, replacements: Record<string, string | undefined>): string {
  let result = content;
  for (const [placeholder, replacement] of Object.entries(replacements)) {
    if (replacement !== undefined) {
      result = result.replace(new RegExp(placeholder, 'g'), replacement);
    }
  }
  return result;
}

// Copy and customize template files
const templatesDir = path.join(projectRoot, '.templates');
const templateFiles = [
  {
    template: 'Component.tsx',
    dest: path.join(featurePath, 'components', `${featurePascalCase}.tsx`),
    placeholders: {
      'ComponentName': featurePascalCase,
      '\\[Brief description of what this component does\\]': `Main component for ${featureName} feature`,
      '\\[Detailed description including:': `This component handles the ${featureName} feature functionality including:`,
      'Component description': `${featurePascalCase} component`,
    },
  },
  {
    template: 'Hook.ts',
    dest: path.join(featurePath, 'hooks', `use-${featureName}.ts`),
    placeholders: {
      'useHookName': `use${featurePascalCase}`,
      '\\[Brief description of what this hook does\\]': `Hook for managing ${featureName} state and logic`,
    },
  },
  {
    template: 'Test.test.ts',
    dest: path.join(featurePath, '__tests__', `${featurePascalCase}.test.tsx`),
    placeholders: {
      'FeatureName': featurePascalCase,
      'functionName': featureName,
    },
  },
];

templateFiles.forEach(({ template, dest, placeholders }) => {
  const templatePath = path.join(templatesDir, template);
  
  if (fs.existsSync(templatePath)) {
    let content = fs.readFileSync(templatePath, 'utf-8');
    content = replacePlaceholders(content, placeholders);
    fs.writeFileSync(dest, content);
    console.log(`  ✅ Created ${path.relative(projectRoot, dest)} (from template)`);
  }
});

// Create .gitkeep files for empty directories
[
  'utils',
  'api',
].forEach((dir) => {
  const gitkeepPath = path.join(featurePath, dir, '.gitkeep');
  fs.writeFileSync(gitkeepPath, '');
});

console.log('');
console.log('✨ Feature created successfully!');
console.log('');
console.log('📍 Location:');
console.log(`  ${path.relative(projectRoot, featurePath)}`);
console.log('');
console.log('📝 Next steps:');
console.log(`  1. Update ${featureName}/index.ts with your exports`);
console.log(`  2. Create components in ${featureName}/components/`);
console.log(`  3. Create hooks in ${featureName}/hooks/`);
console.log(`  4. Add tests in ${featureName}/__tests__/`);
console.log(`  5. Import using: import { ... } from '@features/${featureName}'`);
console.log('');
console.log('📚 See docs/CONTRIBUTING.md for conventions and best practices');
console.log('');
