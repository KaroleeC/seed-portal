/**
 * Unit tests for new-feature.ts generator script
 *
 * Tests the feature generator functionality including:
 * - Valid feature name generation
 * - Invalid feature name rejection
 * - Directory structure creation
 * - Template file copying
 * - Idempotency (error if feature exists)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');
const featuresDir = path.join(projectRoot, 'client', 'src', 'features');

// Helper to run the generator script
function runGenerator(featureName: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(
      `npm run generate:feature ${featureName}`,
      {
        cwd: projectRoot,
        encoding: 'utf-8',
        stdio: 'pipe',
      }
    );
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      exitCode: error.status || 1,
    };
  }
}

// Helper to clean up test features
function cleanupFeature(featureName: string) {
  const featurePath = path.join(featuresDir, featureName);
  if (fs.existsSync(featurePath)) {
    fs.rmSync(featurePath, { recursive: true, force: true });
  }
}

describe('new-feature.ts generator script', () => {
  const testFeatureName = 'test-feature-unit';

  afterEach(() => {
    // Clean up after each test
    cleanupFeature(testFeatureName);
  });

  describe('Valid feature name generation', () => {
    it('should create a feature with valid kebab-case name', () => {
      const result = runGenerator(testFeatureName);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Feature created successfully');
      expect(fs.existsSync(path.join(featuresDir, testFeatureName))).toBe(true);
    });

    it('should create all required directories', () => {
      runGenerator(testFeatureName);
      
      const featurePath = path.join(featuresDir, testFeatureName);
      const expectedDirs = [
        'components',
        'hooks',
        'utils',
        'types',
        'api',
        '__tests__',
      ];

      expectedDirs.forEach((dir) => {
        expect(fs.existsSync(path.join(featurePath, dir))).toBe(true);
      });
    });

    it('should create index.ts barrel export file', () => {
      runGenerator(testFeatureName);
      
      const indexPath = path.join(featuresDir, testFeatureName, 'index.ts');
      expect(fs.existsSync(indexPath)).toBe(true);
      
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('TestFeatureUnit');
      expect(content).toContain('export type * from');
    });

    it('should create types/index.ts with starter interfaces', () => {
      runGenerator(testFeatureName);
      
      const typesPath = path.join(featuresDir, testFeatureName, 'types', 'index.ts');
      expect(fs.existsSync(typesPath)).toBe(true);
      
      const content = fs.readFileSync(typesPath, 'utf-8');
      expect(content).toContain('TestFeatureUnitData');
      expect(content).toContain('TestFeatureUnitState');
    });

    it('should create README.md with feature documentation', () => {
      runGenerator(testFeatureName);
      
      const readmePath = path.join(featuresDir, testFeatureName, 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
      
      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content).toContain('# TestFeatureUnit Feature');
      expect(content).toContain('## Structure');
      expect(content).toContain('## Usage');
    });
  });

  describe('Template file copying with placeholder replacement', () => {
    it('should copy and customize Component.tsx template', () => {
      runGenerator(testFeatureName);
      
      const componentPath = path.join(
        featuresDir,
        testFeatureName,
        'components',
        'TestFeatureUnit.tsx'
      );
      expect(fs.existsSync(componentPath)).toBe(true);
      
      const content = fs.readFileSync(componentPath, 'utf-8');
      expect(content).toContain('TestFeatureUnit');
      expect(content).toContain('interface TestFeatureUnitProps');
      expect(content).toContain('export function TestFeatureUnit');
      expect(content).not.toContain('ComponentName'); // Placeholder should be replaced
    });

    it('should copy and customize Hook.ts template', () => {
      runGenerator(testFeatureName);
      
      const hookPath = path.join(
        featuresDir,
        testFeatureName,
        'hooks',
        'use-test-feature-unit.ts'
      );
      expect(fs.existsSync(hookPath)).toBe(true);
      
      const content = fs.readFileSync(hookPath, 'utf-8');
      expect(content).toContain('useTestFeatureUnit');
      expect(content).not.toContain('useHookName'); // Placeholder should be replaced
    });

    it('should copy and customize Test.test.ts template', () => {
      runGenerator(testFeatureName);
      
      const testPath = path.join(
        featuresDir,
        testFeatureName,
        '__tests__',
        'TestFeatureUnit.test.tsx'
      );
      expect(fs.existsSync(testPath)).toBe(true);
      
      const content = fs.readFileSync(testPath, 'utf-8');
      expect(content).toContain('TestFeatureUnit');
      expect(content).toContain('describe');
      expect(content).toContain('it');
    });

    it('should create .gitkeep files in empty directories', () => {
      runGenerator(testFeatureName);
      
      const featurePath = path.join(featuresDir, testFeatureName);
      expect(fs.existsSync(path.join(featurePath, 'utils', '.gitkeep'))).toBe(true);
      expect(fs.existsSync(path.join(featurePath, 'api', '.gitkeep'))).toBe(true);
    });
  });

  describe('Invalid feature name rejection', () => {
    afterEach(() => {
      // Clean up various test names
      cleanupFeature('InvalidName');
      cleanupFeature('invalid_name');
      cleanupFeature('invalid name');
    });

    it('should reject PascalCase names', () => {
      const result = runGenerator('InvalidName');
      
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('must be in kebab-case');
      expect(fs.existsSync(path.join(featuresDir, 'InvalidName'))).toBe(false);
    });

    it('should reject snake_case names', () => {
      const result = runGenerator('invalid_name');
      
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('must be in kebab-case');
    });

    it('should reject names with spaces', () => {
      const result = runGenerator('invalid name');
      
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('must be in kebab-case');
    });

    it('should reject empty feature name', () => {
      const result = runGenerator('');
      
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('Feature name is required');
    });

    it('should reject names starting with numbers', () => {
      const result = runGenerator('123-invalid');
      
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('must be in kebab-case');
    });

    it('should reject names with special characters', () => {
      const result = runGenerator('invalid@feature');
      
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('must be in kebab-case');
    });
  });

  describe('Directory structure validation', () => {
    it('should create exactly 7 directories', () => {
      runGenerator(testFeatureName);
      
      const featurePath = path.join(featuresDir, testFeatureName);
      const items = fs.readdirSync(featurePath);
      const directories = items.filter((item) => {
        return fs.statSync(path.join(featurePath, item)).isDirectory();
      });
      
      expect(directories).toHaveLength(6); // components, hooks, utils, types, api, __tests__
    });

    it('should log each directory creation', () => {
      const result = runGenerator(testFeatureName);
      
      expect(result.stdout).toContain('Created client/src/features/test-feature-unit/');
      expect(result.stdout).toContain('components/');
      expect(result.stdout).toContain('hooks/');
      expect(result.stdout).toContain('utils/');
      expect(result.stdout).toContain('types/');
      expect(result.stdout).toContain('api/');
      expect(result.stdout).toContain('__tests__/');
    });
  });

  describe('Idempotency and duplicate prevention', () => {
    it('should error if feature already exists', () => {
      // Create feature first time
      runGenerator(testFeatureName);
      
      // Try to create again
      const result = runGenerator(testFeatureName);
      
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('already exists');
    });

    it('should not modify existing feature on duplicate attempt', () => {
      // Create feature and add custom file
      runGenerator(testFeatureName);
      const customFilePath = path.join(
        featuresDir,
        testFeatureName,
        'custom-file.txt'
      );
      fs.writeFileSync(customFilePath, 'custom content');
      
      // Try to create again
      runGenerator(testFeatureName);
      
      // Custom file should still exist
      expect(fs.existsSync(customFilePath)).toBe(true);
      expect(fs.readFileSync(customFilePath, 'utf-8')).toBe('custom content');
    });
  });

  describe('Success message formatting', () => {
    it('should display formatted success message with next steps', () => {
      const result = runGenerator(testFeatureName);
      
      expect(result.stdout).toContain('✨ Feature created successfully!');
      expect(result.stdout).toContain('📍 Location:');
      expect(result.stdout).toContain('📝 Next steps:');
      expect(result.stdout).toContain('1. Update');
      expect(result.stdout).toContain('2. Create components');
      expect(result.stdout).toContain('3. Create hooks');
      expect(result.stdout).toContain('4. Add tests');
      expect(result.stdout).toContain('5. Import using');
    });

    it('should include path alias import example', () => {
      const result = runGenerator(testFeatureName);
      
      expect(result.stdout).toContain('@features/test-feature-unit');
    });

    it('should reference CONTRIBUTING.md', () => {
      const result = runGenerator(testFeatureName);
      
      expect(result.stdout).toContain('docs/CONTRIBUTING.md');
    });
  });

  describe('PascalCase conversion', () => {
    const testCases = [
      { input: 'user-profile', expected: 'UserProfile' },
      { input: 'quote-calculator', expected: 'QuoteCalculator' },
      { input: 'multi-word-feature', expected: 'MultiWordFeature' },
      { input: 'single', expected: 'Single' },
    ];

    testCases.forEach(({ input, expected }) => {
      it(`should convert ${input} to ${expected}`, () => {
        const result = runGenerator(input);
        
        expect(result.exitCode).toBe(0);
        
        const componentPath = path.join(
          featuresDir,
          input,
          'components',
          `${expected}.tsx`
        );
        expect(fs.existsSync(componentPath)).toBe(true);
        
        // Cleanup
        cleanupFeature(input);
      });
    });
  });
});
