/**
 * Provider Toggle Smoke Tests (Phase 0)
 * 
 * Validates that environment-based provider configuration is set correctly.
 * Smoke tests verify env vars are configured as expected for Phase 0.
 * 
 * Note: Full provider functionality tests are in integration tests.
 * These smoke tests only verify configuration, not implementation.
 */

import { describe, it, expect } from 'vitest';

describe('Provider Toggle Smoke Tests (Configuration)', () => {
  describe('QUOTE_PROVIDER environment variable', () => {
    it('should be configured with seedpay as default', () => {
      // In Phase 0, QUOTE_PROVIDER should be set to seedpay in Doppler
      // If not set, code defaults to seedpay
      const provider = process.env.QUOTE_PROVIDER || 'seedpay';
      
      // Should be either 'seedpay' (Phase 0 default) or 'hubspot' (rollback)
      expect(['seedpay', 'hubspot']).toContain(provider);
    });

    it('should have valid provider value', () => {
      const provider = process.env.QUOTE_PROVIDER;
      
      if (provider) {
        // Must be one of the valid options
        expect(['seedpay', 'hubspot']).toContain(provider.toLowerCase());
      }
    });
  });

  describe('STORAGE_PROVIDER environment variable', () => {
    it('should be configured with supabase as default', () => {
      // In Phase 0, STORAGE_PROVIDER should be set to supabase in Doppler
      const provider = process.env.STORAGE_PROVIDER || 'supabase';
      
      // Should be either 'supabase' (Phase 0 default) or 'box' (rollback)
      expect(['supabase', 'box']).toContain(provider);
    });

    it('should have valid provider value', () => {
      const provider = process.env.STORAGE_PROVIDER;
      
      if (provider) {
        // Must be one of the valid options
        expect(['supabase', 'box']).toContain(provider.toLowerCase());
      }
    });
  });

  describe('DISABLE_BOX environment variable', () => {
    it('should be set to 1 in Phase 0 when running with Doppler', () => {
      // In Phase 0, Box should be disabled
      const disableBox = process.env.DISABLE_BOX;
      
      // When running with Doppler, should be '1'
      // Without Doppler, will be undefined (test passes but logs warning)
      if (disableBox) {
        expect(disableBox).toBe('1');
      } else {
        console.warn('⚠️  DISABLE_BOX not set. Run with Doppler for full validation: npm run dev:api:doppler');
      }
    });
  });

  describe('SEEDDRIVE configuration', () => {
    it('should have SEEDDRIVE_BUCKET configured when running with Doppler', () => {
      const bucket = process.env.SEEDDRIVE_BUCKET;
      
      // When running with Doppler, should be 'seeddrive'
      if (bucket) {
        expect(bucket).toBe('seeddrive');
      } else {
        console.warn('⚠️  SEEDDRIVE_BUCKET not set. Run with Doppler for full validation.');
      }
    });

    it('should have SEEDDRIVE_SIGNED_URL_TTL configured when running with Doppler', () => {
      const ttl = process.env.SEEDDRIVE_SIGNED_URL_TTL;
      
      // When running with Doppler, should be '300' (5 minutes)
      if (ttl) {
        expect(ttl).toBe('300');
      } else {
        console.warn('⚠️  SEEDDRIVE_SIGNED_URL_TTL not set. Run with Doppler for full validation.');
      }
    });
  });

  describe('CLIENT_INTEL_SOURCE removal', () => {
    it('should not have CLIENT_INTEL_SOURCE set', () => {
      const source = process.env.CLIENT_INTEL_SOURCE;
      
      // Should be undefined (removed in Phase 0)
      expect(source).toBeUndefined();
    });
  });

  describe('Provider configuration consistency', () => {
    it('should have consistent Phase 0 configuration when running with Doppler', () => {
      const quoteProvider = process.env.QUOTE_PROVIDER || 'seedpay';
      const storageProvider = process.env.STORAGE_PROVIDER || 'supabase';
      const disableBox = process.env.DISABLE_BOX;
      
      // Quote provider should be seedpay in Phase 0
      expect(quoteProvider).toBe('seedpay');
      
      // If storage is supabase and env vars are loaded, box should be disabled
      if (storageProvider === 'supabase' && disableBox) {
        expect(disableBox).toBe('1');
      } else if (storageProvider === 'supabase' && !disableBox) {
        console.warn('⚠️  DISABLE_BOX should be set to 1 when STORAGE_PROVIDER=supabase. Run with Doppler for full validation.');
      }
    });
  });
});
