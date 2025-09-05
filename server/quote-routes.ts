/**
 * Enhanced Quote Routes with Box Integration and MSA Generation
 */

import express from 'express';
import { storage } from './storage';
import { logger } from './logger';
import { boxService } from './box-integration';
import { msaGenerator } from './msa-generator';
import { requireAuth } from './auth';

const router = express.Router();

/**
 * Generate MSA and create Box folder for quote
 */
router.post('/quotes/:id/generate-documents', requireAuth, async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const quote = await storage.getQuote(quoteId);

    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
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
      monthlyFee: quote.monthlyFee,
      setupFee: quote.setupFee
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
    await storage.updateQuote(quoteId, {
      boxFolderId: boxResult.folderId,
      boxFolderUrl: boxResult.webUrl,
      msaFileId: msaUploadResult.fileId,
      msaFileUrl: msaUploadResult.webUrl
    });

    res.json({
      success: true,
      boxFolder: boxResult,
      msaDocument: msaUploadResult,
      sowDocuments: sowResults,
      documentsGenerated: selectedServices.length + 1 // MSA + SOWs
    });

    logger.info('[Quote] Documents generated successfully', {
      quoteId,
      folderId: boxResult.folderId,
      documentsCount: selectedServices.length + 1
    });

  } catch (error) {
    logger.error('[Quote] Error generating documents', error);
    res.status(500).json({
      error: 'Failed to generate documents',
      message: error.message
    });
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
      return res.status(404).json({ error: 'Quote not found' });
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
      box_folder_url: quote.boxFolderUrl,
      msa_document_url: quote.msaFileUrl
    };

    // Import HubSpot service
    const { hubSpotService } = await import('./hubspot');
    
    if (!hubSpotService) {
      return res.status(500).json({ error: 'HubSpot service not available' });
    }

    // First, verify the contact exists in HubSpot
    const contactVerification = await hubSpotService.verifyContactByEmail(quote.contactEmail);
    
    if (!contactVerification.verified || !contactVerification.contact) {
      return res.status(404).json({ 
        error: 'Contact not found in HubSpot',
        message: 'Cannot sync quote data - contact must exist in HubSpot first'
      });
    }

    const contactId = contactVerification.contact.id;
    const syncResults = { contact: false, company: false };

    // Prepare contact properties for sync (2-way sync with HubSpot override)
    const contactProperties: any = {};
    
    // Basic contact fields - 2-way sync
    if (quote.contactFirstName) contactProperties.firstname = quote.contactFirstName;
    if (quote.contactLastName) contactProperties.lastname = quote.contactLastName;
    if (quote.contactPhone) contactProperties.phone = quote.contactPhone;
    
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
        logger.error('[Quote] Company sync failed', { error: error.message });
        syncResults.company = false;
      }
    }

    logger.info('[Quote] HubSpot sync completed', { 
      quoteId, 
      email: quote.contactEmail,
      syncResults 
    });

    res.json({
      success: true,
      message: 'Quote synced to HubSpot with enhanced data',
      syncedFields: Object.keys(hubspotData),
      syncResults: {
        contact: syncResults.contact,
        company: syncResults.company,
        contactPropertiesUpdated: Object.keys(contactProperties).length
      }
    });

  } catch (error) {
    logger.error('[Quote] Error syncing to HubSpot', error);
    res.status(500).json({
      error: 'Failed to sync to HubSpot',
      message: error.message
    });
  }
});

/**
 * Google address autocomplete endpoint
 */
router.get('/address/autocomplete', requireAuth, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
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

    res.json({ predictions: suggestions });

  } catch (error) {
    logger.error('[Address] Error fetching autocomplete suggestions', error);
    res.status(500).json({ error: 'Failed to fetch address suggestions' });
  }
});

export default router;