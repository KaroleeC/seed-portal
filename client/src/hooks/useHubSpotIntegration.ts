import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface HubSpotContact {
  companyName?: string;
  [key: string]: any;
}

export function useHubSpotIntegration() {
  const [hubspotVerificationStatus, setHubspotVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'not-found'>('idle');
  const [hubspotContact, setHubspotContact] = useState<HubSpotContact | null>(null);
  const [lastVerifiedEmail, setLastVerifiedEmail] = useState('');
  const [verificationTimeoutId, setVerificationTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const verifyHubSpotEmail = async (email: string) => {
    if (!email || email === lastVerifiedEmail) return;
    
    // Clear any pending verification timeout
    if (verificationTimeoutId) {
      clearTimeout(verificationTimeoutId);
    }
    
    setHubspotVerificationStatus('verifying');
    setLastVerifiedEmail(email);
    
    try {
      // Verify HubSpot contact first - this is critical
      const hubspotData = await apiRequest('POST', '/api/hubspot/verify-contact', { email });

      if (hubspotData.verified && hubspotData.contact) {
        setHubspotVerificationStatus('verified');
        setHubspotContact(hubspotData.contact);
      } else {
        setHubspotVerificationStatus('not-found');
        setHubspotContact(null);
      }

      // Try to check for existing quotes, but don't fail if this fails
      let existingQuotesData = null;
      try {
        existingQuotesData = await apiRequest('POST', '/api/quotes/check-existing', { email });
      } catch (quotesError) {
        console.warn('Failed to check existing quotes, continuing without this data:', quotesError);
        existingQuotesData = null;
      }

      return {
        hubspotData,
        existingQuotesData
      };
    } catch (error) {
      console.error('Error verifying HubSpot email:', error);
      setHubspotVerificationStatus('not-found');
      setHubspotContact(null);
      throw error;
    }
  };

  const pushQuoteToHubSpot = async (quoteId: number) => {
    try {
      console.log('[HubSpot] Attempting to push quote ID:', quoteId);
      const response = await apiRequest('POST', '/api/hubspot/push-quote', { quoteId });
      const result = await response.json();
      console.log('[HubSpot] Push successful:', result);
      return result;
    } catch (error: any) {
      console.error('[HubSpot] Raw error object:', error);
      console.error('[HubSpot] Error type:', typeof error);
      console.error('[HubSpot] Error constructor:', error?.constructor?.name);
      console.error('[HubSpot] Error message:', error?.message);
      console.error('[HubSpot] Error status:', error?.status);
      console.error('[HubSpot] Error statusText:', error?.statusText);
      console.error('[HubSpot] Error response:', error?.response);
      console.error('[HubSpot] Error body:', error?.body);
      console.error('[HubSpot] Error details stringified:', JSON.stringify(error, null, 2));
      
      // Try to extract more meaningful error message
      let errorMessage = 'Failed to push quote to HubSpot';
      if (error?.message && error.message !== '[object Object]') {
        errorMessage = error.message;
      } else if (error?.body && typeof error.body === 'string') {
        errorMessage = error.body;
      } else if (error?.statusText) {
        errorMessage = error.statusText;
      } else if (error?.status) {
        errorMessage = `HTTP Error ${error.status}`;
      }
      
      console.error('[HubSpot] Final error message:', errorMessage);
      
      // Re-throw with better error message
      const enhancedError = new Error(errorMessage);
      enhancedError.name = 'HubSpotPushError';
      throw enhancedError;
    }
  };

  return {
    hubspotVerificationStatus,
    hubspotContact,
    lastVerifiedEmail,
    verifyHubSpotEmail,
    pushQuoteToHubSpot,
    setVerificationTimeoutId
  };
}