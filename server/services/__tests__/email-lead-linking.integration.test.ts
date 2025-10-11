/**
 * Email Lead Linking Service Integration Tests
 * 
 * Tests the lead linking service with a real database
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  withTestDb, 
  createTestLead, 
  createTestThread, 
  createTestEmailAccount,
} from '../../../test/api-test-utils';
import {
  linkThreadToLead,
  unlinkThreadFromLead,
  getThreadLeads,
  getLeadThreads,
  autoLinkThreadToLeads,
} from '../email-lead-linking.service';
import { crmLeads } from '../../../shared/schema';
import { emailThreads, emailAccounts } from '../../../shared/email-schema';

describe('Email Lead Linking Service', () => {
  beforeEach(async () => {
    // Clean database before each test
    await withTestDb(async () => {});
  });

  describe('linkThreadToLead', () => {
    it('should successfully link a thread to a lead', async () => {
      await withTestDb(async (db) => {
        // Arrange: Create test data
        const lead = createTestLead();
        const account = createTestEmailAccount();
        const thread = createTestThread({ accountId: account.id });
        
        await db.insert(crmLeads).values(lead);
        await db.insert(emailAccounts).values(account);
        await db.insert(emailThreads).values(thread);
        
        // Act: Link thread to lead
        await linkThreadToLead(thread.id, lead.id, 'manual');
        
        // Assert: Verify link was created
        const linkedLeads = await getThreadLeads(thread.id);
        expect(linkedLeads).toHaveLength(1);
        expect(linkedLeads[0]).toBe(lead.id);
      });
    });

    it('should not create duplicate links', async () => {
      await withTestDb(async (db) => {
        const lead = createTestLead();
        const account = createTestEmailAccount();
        const thread = createTestThread({ accountId: account.id });
        
        await db.insert(crmLeads).values(lead);
        await db.insert(emailAccounts).values(account);
        await db.insert(emailThreads).values(thread);
        
        // Link twice
        await linkThreadToLead(thread.id, lead.id, 'manual');
        await linkThreadToLead(thread.id, lead.id, 'manual');
        
        // Should still only have one link
        const linkedLeads = await getThreadLeads(thread.id);
        expect(linkedLeads).toHaveLength(1);
      });
    });

    it('should support linking multiple leads to one thread', async () => {
      await withTestDb(async (db) => {
        const lead1 = createTestLead();
        const lead2 = createTestLead();
        const account = createTestEmailAccount();
        const thread = createTestThread({ accountId: account.id });
        
        await db.insert(crmLeads).values([lead1, lead2]);
        await db.insert(emailAccounts).values(account);
        await db.insert(emailThreads).values(thread);
        
        await linkThreadToLead(thread.id, lead1.id, 'manual');
        await linkThreadToLead(thread.id, lead2.id, 'manual');
        
        const linkedLeads = await getThreadLeads(thread.id);
        expect(linkedLeads).toHaveLength(2);
        expect(linkedLeads).toContain(lead1.id);
        expect(linkedLeads).toContain(lead2.id);
      });
    });
  });

  describe('unlinkThreadFromLead', () => {
    it('should successfully unlink a thread from a lead', async () => {
      await withTestDb(async (db) => {
        const lead = createTestLead();
        const account = createTestEmailAccount();
        const thread = createTestThread({ accountId: account.id });
        
        await db.insert(crmLeads).values(lead);
        await db.insert(emailAccounts).values(account);
        await db.insert(emailThreads).values(thread);
        
        // Link then unlink
        await linkThreadToLead(thread.id, lead.id, 'manual');
        await unlinkThreadFromLead(thread.id, lead.id);
        
        const linkedLeads = await getThreadLeads(thread.id);
        expect(linkedLeads).toHaveLength(0);
      });
    });
  });

  describe('getLeadThreads', () => {
    it('should return all threads linked to a lead', async () => {
      await withTestDb(async (db) => {
        const lead = createTestLead();
        const account = createTestEmailAccount();
        const thread1 = createTestThread({ accountId: account.id });
        const thread2 = createTestThread({ accountId: account.id });
        
        await db.insert(crmLeads).values(lead);
        await db.insert(emailAccounts).values(account);
        await db.insert(emailThreads).values([thread1, thread2]);
        
        await linkThreadToLead(thread1.id, lead.id, 'manual');
        await linkThreadToLead(thread2.id, lead.id, 'manual');
        
        const linkedThreads = await getLeadThreads(lead.id);
        expect(linkedThreads).toHaveLength(2);
        expect(linkedThreads).toContain(thread1.id);
        expect(linkedThreads).toContain(thread2.id);
      });
    });
  });

  describe('autoLinkThreadToLeads', () => {
    it('should auto-link thread based on participant emails', async () => {
      await withTestDb(async (db) => {
        const leadEmail = 'customer@example.com';
        const lead = createTestLead({ 
          payload: { email: leadEmail, name: 'Customer' }
        });
        const account = createTestEmailAccount();
        const thread = createTestThread({ 
          accountId: account.id,
          participants: [
            { email: leadEmail, name: 'Customer' },
            { email: 'sender@example.com', name: 'Sender' },
          ],
        });
        
        await db.insert(crmLeads).values(lead);
        await db.insert(emailAccounts).values(account);
        await db.insert(emailThreads).values(thread);
        
        // Auto-link should find the lead by email
        const links = await autoLinkThreadToLeads(thread.id);
        
        expect(links.length).toBeGreaterThan(0);
        
        const linkedLeads = await getThreadLeads(thread.id);
        expect(linkedLeads).toContain(lead.id);
      });
    });

    it('should return 0 if no matching leads found', async () => {
      await withTestDb(async (db) => {
        const account = createTestEmailAccount();
        const thread = createTestThread({ 
          accountId: account.id,
          participants: [
            { email: 'unknown@example.com', name: 'Unknown' },
          ],
        });
        
        await db.insert(emailAccounts).values(account);
        await db.insert(emailThreads).values(thread);
        
        const links = await autoLinkThreadToLeads(thread.id);
        expect(links.length).toBe(0);
      });
    });
  });
});
