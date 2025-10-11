/**
 * Lead Test Factory
 * 
 * Creates test lead data for integration tests matching crmLeads schema
 */

import { nanoid } from 'nanoid';

export interface TestLead {
  id: string;
  contactId: string | null;
  source: string;
  status: string;
  stage: string;
  assignedTo: string | null;
  payload: any | null;
  archived: boolean;
  convertedAt: Date | null;
  convertedContactId: string | null;
  lastContactedAt: Date | null;
  nextActionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create a test lead with randomized data
 */
export function createTestLead(overrides: Partial<TestLead> = {}): TestLead {
  const id = overrides.id || nanoid();
  const now = new Date();
  
  return {
    id,
    contactId: null,
    source: 'manual',
    status: 'new',
    stage: 'unassigned',
    assignedTo: null,
    payload: { email: `test-${id}@example.com`, name: 'Test User' },
    archived: false,
    convertedAt: null,
    convertedContactId: null,
    lastContactedAt: null,
    nextActionAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Create multiple test leads
 */
export function createTestLeads(count: number, overrides: Partial<TestLead> = {}): TestLead[] {
  return Array.from({ length: count }, () => createTestLead(overrides));
}
