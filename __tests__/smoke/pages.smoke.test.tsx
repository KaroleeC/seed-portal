/**
 * Smoke Tests - Page Loading
 * 
 * These tests catch basic errors like:
 * - Missing imports (ComposeModal is not defined)
 * - Syntax errors
 * - Broken component references
 * 
 * Run fast (<5s) and fail immediately on page load issues.
 */

import { describe, it, expect } from 'vitest';

describe('Page Smoke Tests', () => {
  it('should import SeedMail page without errors', async () => {
    // This will throw if there are any import errors, undefined references, etc.
    const module = await import('@/pages/seedmail/index');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });

  it('should import Leads Inbox page without errors', async () => {
    const module = await import('@/pages/leads-inbox/index');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });

  it('should import Commission Tracker page without errors', async () => {
    const module = await import('@/pages/commission-tracker');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });

  it('should import Home page without errors', async () => {
    const module = await import('@/pages/home');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
  
  it('should import Knowledge Base page without errors', async () => {
    const module = await import('@/pages/knowledge-base');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
});

describe('Component Smoke Tests', () => {
  it('should import EmailThreadMenu without errors', async () => {
    const module = await import('@/pages/seedmail/components/EmailThreadMenu');
    expect(module.EmailThreadMenu).toBeDefined();
  });

  it('should import LeadAssociationModal without errors', async () => {
    const module = await import('@/pages/seedmail/components/LeadAssociationModal');
    expect(module.LeadAssociationModal).toBeDefined();
  });

  it('should import EmailDetail without errors', async () => {
    const module = await import('@/pages/seedmail/components/EmailDetail');
    expect(module.EmailDetail).toBeDefined();
  });
});

describe('Hook Smoke Tests', () => {
  it('should import useThreadLeads without errors', async () => {
    const module = await import('@/pages/seedmail/hooks/useThreadLeads');
    expect(module.useThreadLeads).toBeDefined();
  });

  it('should import useLeadSearch without errors', async () => {
    const module = await import('@/pages/seedmail/hooks/useLeadSearch');
    expect(module.useLeadSearch).toBeDefined();
  });

  it('should import useLeadEmails without errors', async () => {
    const module = await import('@/pages/seedmail/hooks/useLeadEmails');
    expect(module.useLeadEmails).toBeDefined();
  });
});
