import { apiRequest } from '@/lib/queryClient';

export interface VerifyContactResponse {
  verified: boolean;
  contact?: any;
}

export async function verifyContact(email: string): Promise<VerifyContactResponse> {
  return await apiRequest('POST', '/api/hubspot/verify-contact', { email });
}

export async function searchContacts(searchTerm: string): Promise<{ contacts?: any[] }>{
  return await apiRequest('POST', '/api/hubspot/search-contacts', { searchTerm });
}

export async function syncQuote(quoteId: number, action: 'auto' | 'create' | 'update' = 'auto'): Promise<any> {
  // Prefer the unified queue endpoint; server falls back to direct sync if needed
  return await apiRequest('POST', '/api/hubspot/queue-sync', { quoteId, action });
}
