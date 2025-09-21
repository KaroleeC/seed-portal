/**
 * Enhanced Quote Routes with Box Integration and MSA Generation
 */

import express from 'express';
import { storage } from './storage';
import { logger } from './logger';
import { boxService } from './box-integration';
import { msaGenerator } from './msa-generator';
import { requireAuth } from './auth';
import { sendOk, sendError } from './utils/responses';
import { doesHubSpotQuoteExist } from './hubspot';

const router = express.Router();

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

// Helper to verify HubSpot quote existence for an array of quotes with hubspotQuoteId
async function verifyHubSpotQuotes(
  items: Array<{ id: number; hubspotQuoteId?: string | null }>
): Promise<Array<{ id: number; hubspotQuoteId: string | null; existsInHubSpot: boolean }>> {
  return await Promise.all(
    items.map(async ({ id, hubspotQuoteId }) => {
      let existsInHubSpot = false;
      if (hubspotQuoteId) {
        try {
          existsInHubSpot = await doesHubSpotQuoteExist(String(hubspotQuoteId));
        } catch {
          existsInHubSpot = false;
        }
      }
      return { id, hubspotQuoteId: hubspotQuoteId || null, existsInHubSpot };
    })
  );
}

/**
 * Generate MSA and create Box folder for quote
 */
router.post('/quotes/:id/generate-documents', requireAuth, async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const quote = await storage.getQuote(quoteId);

    if (!quote) {
      return sendError(res, 'NOT_FOUND', 'Quote not found', 404);
    }

    logger.info('[Quote] Generating documents for quote', { quoteId, client: quote.companyName });

    // Extract selected services from quote
    const selectedServices = [];
    if (quote.serviceBookkeeping) selectedServices.push('bookkeeping');
    if (quote.serviceTaas) selectedServices.push('taas');
    if (quote.servicePayroll) selectedServices.push('payroll');
    if (quote.serviceApArLite) selectedServices.push('ap_ar_lite');
    if (quote.serviceFpaLite) selectedServices.push('fpa_lite');

    // Create Box folder structure
    const boxResult = await boxService.createClientFolder(
      quote.companyName || quote.contactEmail,
      process.env.BOX_TEMPLATE_FOLDER_ID
    );

    // Generate MSA document
    const msaData = {
      clientLegalName: quote.companyName || 'Client Company',
      entityType: quote.entityType || 'LLC',
      stateJurisdiction: quote.clientState || 'California',
      clientAddress: [
        quote.clientStreetAddress,
        quote.clientCity,
        quote.clientState,
        quote.clientZipCode,
        quote.clientCountry
      ].filter(Boolean).join(', '),
      effectiveDate: new Date().toLocaleDateString(),
      selectedServices,
      contactEmail: quote.contactEmail,
      industry: quote.industry || '',
      monthlyFee: Number(quote.monthlyFee) || 0,
      setupFee: Number(quote.setupFee) || 0
    };

    const msaBuffer = await msaGenerator.generateMSA(msaData);

    // Upload MSA to Box
    const msaFileName = `${quote.companyName || 'Client'}_Master_Services_Agreement.docx`;
    const msaUploadResult = await boxService.uploadMSA(
      boxResult.folderId,
      msaBuffer,
      msaFileName
    );

    // Upload SOW documents for selected services
    const sowResults = await boxService.uploadSOWDocuments(
      boxResult.folderId,
      selectedServices
    );

    // Update quote with Box information
    await storage.updateQuote({
      id: quoteId,
      boxFolderId: boxResult.folderId,
      boxFolderUrl: boxResult.webUrl,
      msaFileId: msaUploadResult.fileId,
      msaFileUrl: msaUploadResult.webUrl
    } as any);

    return sendOk(
      res,
      {
        boxFolder: boxResult,
        msaDocument: msaUploadResult,
        sowDocuments: sowResults,
        documentsGenerated: selectedServices.length + 1
      },
      undefined,
      {
        boxFolder: boxResult,
        msaDocument: msaUploadResult,
        sowDocuments: sowResults,
        documentsGenerated: selectedServices.length + 1
      }
    );

    logger.info('[Quote] Documents generated successfully', {
      quoteId,
      folderId: boxResult.folderId,
      documentsCount: selectedServices.length + 1
    });

  } catch (error) {
    logger.error('[Quote] Error generating documents', { error: getErrorMessage(error) });
    return sendError(res, 'GENERATE_DOCS_FAILED', 'Failed to generate documents', 500, { error: 'Failed to generate documents', message: getErrorMessage(error) });
  }
});

/**
 * Enhanced HubSpot sync with industry and address fields
 */
router.post('/quotes/:id/sync-hubspot', requireAuth, async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const quote = await storage.getQuote(quoteId);

    if (!quote) {
      return sendError(res, 'NOT_FOUND', 'Quote not found', 404);
    }

    // Prepare enhanced data for HubSpot sync
    const hubspotData = {
      // Core quote data
      email: quote.contactEmail,
      company: quote.companyName,
      industry: quote.industry,
      // Address fields
      address: quote.clientStreetAddress,
      city: quote.clientCity,
      state: quote.clientState,
      zip: quote.clientZipCode,
      country: quote.clientCountry,
      // Entity information
      entity_type: quote.entityType,
      // Service selections
      services: [
        quote.serviceBookkeeping && 'Bookkeeping',
        quote.serviceTaas && 'TaaS',
        quote.servicePayroll && 'Payroll',
        quote.serviceApArLite && 'AP/AR Lite',
        quote.serviceFpaLite && 'FP&A Lite'
      ].filter(Boolean).join(', '),
      // Pricing
      monthly_fee: quote.monthlyFee,
      setup_fee: quote.setupFee,
      // Box integration
      box_folder_url: (quote as any).boxFolderUrl,
      msa_document_url: (quote as any).msaFileUrl
    };

    // Import HubSpot service
    const { hubSpotService } = await import('./hubspot');
    
    if (!hubSpotService) {
      return sendError(res, 'HUBSPOT_NOT_CONFIGURED', 'HubSpot service not available', 500);
    }

    // First, verify the contact exists in HubSpot
    const contactVerification = await hubSpotService.verifyContactByEmail(quote.contactEmail);
    
    if (!contactVerification.verified || !contactVerification.contact) {
      return sendError(
        res,
        'NOT_FOUND',
        'Contact not found in HubSpot',
        404,
        { error: 'Contact not found in HubSpot', message: 'Cannot sync quote data - contact must exist in HubSpot first' }
      );
    }

    const contactId = contactVerification.contact.id;
    const syncResults = { contact: false, company: false };

    // Prepare contact properties for sync (2-way sync with HubSpot override)
    const contactProperties: any = {};
    
    // Basic contact fields - 2-way sync
    if (quote.contactFirstName) contactProperties.firstname = quote.contactFirstName;
    if (quote.contactLastName) contactProperties.lastname = quote.contactLastName;
    if ((quote as any).contactPhone) contactProperties.phone = (quote as any).contactPhone;
    
    // Business fields for contacts
    if (quote.industry) contactProperties.industry = quote.industry;
    
    // Monthly revenue mapping with correct field name and value mapping
    if (quote.monthlyRevenueRange) {
      let mappedRevenue = quote.monthlyRevenueRange;
      // Map to HubSpot dropdown values
      switch (quote.monthlyRevenueRange) {
        case '<$10K':
          mappedRevenue = 'less_than_$10,000';
          break;
        case '$10K-$25K':
        case '$25K-$50K':
          mappedRevenue = '$10,000-$50,000';
          break;
        case '$50K-$100K':
        case '$100K-$200K':
          mappedRevenue = '$50,000-$200,000';
          break;
        case '$200K+':
          mappedRevenue = '$200,000 or more';
          break;
        default:
          mappedRevenue = 'less_than_$10,000'; // Default fallback
      }
      contactProperties.monthly_revenue = mappedRevenue;
    }
    
    // Note: Address fields moved to Company sync only, entity_type removed from contacts

    // Update contact if we have properties to sync
    if (Object.keys(contactProperties).length > 0) {
      const contactResult = await hubSpotService.updateContact(contactId, contactProperties);
      syncResults.contact = !!contactResult;
      logger.info('[Quote] Contact sync result', { 
        contactId, 
        success: syncResults.contact,
        propertiesCount: Object.keys(contactProperties).length 
      });
    }

    // Update or create company if company name exists
    if (quote.companyName) {
      try {
        await hubSpotService.updateOrCreateCompanyFromQuote(contactId, quote);
        syncResults.company = true;
        logger.info('[Quote] Company sync completed', { companyName: quote.companyName });
      } catch (error) {
        logger.error('[Quote] Company sync failed', { error: getErrorMessage(error) });
        syncResults.company = false;
      }
    }

    logger.info('[Quote] HubSpot sync completed', { 
      quoteId, 
      email: quote.contactEmail,
      syncResults 
    });

    return sendOk(
      res,
      {
        message: 'Quote synced to HubSpot with enhanced data',
        syncedFields: Object.keys(hubspotData),
        syncResults: {
          contact: syncResults.contact,
          company: syncResults.company,
          contactPropertiesUpdated: Object.keys(contactProperties).length
        }
      },
      undefined,
      {
        message: 'Quote synced to HubSpot with enhanced data',
        syncedFields: Object.keys(hubspotData),
        syncResults: {
          contact: syncResults.contact,
          company: syncResults.company,
          contactPropertiesUpdated: Object.keys(contactProperties).length
        }
      }
    );

  } catch (error) {
    logger.error('[Quote] Error syncing to HubSpot', { error: getErrorMessage(error) });
    return sendError(res, 'SYNC_HUBSPOT_FAILED', 'Failed to sync to HubSpot', 500, { error: 'Failed to sync to HubSpot', message: getErrorMessage(error) });
  }
});

/**
 * Google address autocomplete endpoint
 */
router.get('/address/autocomplete', requireAuth, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return sendError(res, 'INVALID_REQUEST', 'Query parameter is required', 400);
    }

    // Use Nominatim API for address autocomplete (as already used in the project)
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'SeedFinancial-QuoteCalculator/1.0'
      }
    });

    const data = await response.json();

    const suggestions = data.map((result: any) => ({
      description: result.display_name,
      place_id: result.place_id,
      structured_formatting: {
        main_text: result.address?.road || result.address?.house_number || result.name,
        secondary_text: [
          result.address?.city,
          result.address?.state,
          result.address?.country
        ].filter(Boolean).join(', ')
      },
      address_components: {
        street_number: result.address?.house_number || '',
        route: result.address?.road || '',
        locality: result.address?.city || result.address?.town || result.address?.village || '',
        administrative_area_level_1: result.address?.state || '',
        postal_code: result.address?.postcode || '',
        country: result.address?.country || ''
      }
    }));

    return sendOk(res, { predictions: suggestions }, undefined, { predictions: suggestions });

  } catch (error) {
    logger.error('[Address] Error fetching autocomplete suggestions', { error: getErrorMessage(error) });
    return sendError(res, 'ADDRESS_AUTOCOMPLETE_FAILED', 'Failed to fetch address suggestions', 500, { error: 'Failed to fetch address suggestions' });
  }
});

/**
 * Check for existing quotes for an email and verify HubSpot quote existence
 */
router.post('/quotes/check-existing', requireAuth, async (req, res) => {
  try {
    const { email } = (req.body || {}) as { email?: string };
    if (!email || typeof email !== 'string') {
      return sendError(res, 'INVALID_REQUEST', 'Email is required', 400);
    }

    const allQuotes = await storage.getQuotesByEmail(email);
    // Filter to quotes owned by the current user to preserve existing behavior
    const userId = (req as any).user?.id;
    const quotes = userId ? allQuotes.filter(q => (q as any).ownerId === userId) : allQuotes;

    const input = quotes.map((q: any) => ({ id: q.id, hubspotQuoteId: q.hubspotQuoteId || null }));
    const verified = await verifyHubSpotQuotes(input);

    const payload = {
      hasExistingQuotes: quotes.length > 0,
      quotes,
      verified,
    };

    return sendOk(res, payload, undefined, { hasExistingQuotes: payload.hasExistingQuotes, quotes });
  } catch (error) {
    logger.error('[Quote] Error checking existing quotes', { error: getErrorMessage(error) });
    return sendError(res, 'CHECK_EXISTING_QUOTES_FAILED', 'Failed to check existing quotes', 500);
  }
});

/**
 * Verify HubSpot quote existence for a list of quote IDs
 * Body: { quoteIds: number[] }
 * Response: { results: Array<{ id: number; hubspotQuoteId?: string | null; existsInHubSpot: boolean }> }
 */
// Removed redundant POST /quotes/verify-hubspot. Use /quotes/check-existing instead.

export default router;