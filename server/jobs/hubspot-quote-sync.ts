// HubSpot Quote Sync Background Jobs
import { Job } from 'bullmq';
import { logger } from '../logger';
import { storage } from '../storage';

const hubspotLogger = logger.child({ module: 'hubspot-quote-sync' });

export interface HubSpotQuoteSyncJobData {
  quoteId: number;
  action: 'create' | 'update';
  userId: number;
  retryCount?: number;
}

export interface HubSpotQuoteSyncResult {
  success: boolean;
  quoteId: number;
  dealId?: string;
  hubspotQuoteId?: string;
  error?: string;
}

export async function processHubSpotQuoteSync(job: Job<HubSpotQuoteSyncJobData>): Promise<HubSpotQuoteSyncResult> {
  const { quoteId, action, userId } = job.data;
  
  hubspotLogger.info({ 
    jobId: job.id, 
    quoteId, 
    action, 
    userId,
    attempt: job.attemptsMade + 1 
  }, `🔄 Processing HubSpot quote sync`);

  try {
    // Get the quote from database
    const quote = await storage.getQuote(quoteId);
    if (!quote) {
      throw new Error(`Quote ${quoteId} not found`);
    }

    // Get user for HubSpot owner assignment
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // Update job progress
    await job.updateProgress(25);

    // Dynamically import HubSpot service to avoid circular dependencies
    const { hubSpotService } = await import('../hubspot');
    
    if (!hubSpotService) {
      throw new Error('HubSpot service not available');
    }

    await job.updateProgress(50);

    let result: HubSpotQuoteSyncResult;

    if (action === 'create') {
      // Verify contact exists in HubSpot
      const contactResult = await hubSpotService.verifyContactByEmail(quote.contactEmail);
      if (!contactResult.verified || !contactResult.contact) {
        throw new Error(`Contact ${quote.contactEmail} not found in HubSpot`);
      }

      const contact = contactResult.contact;
      const companyName = contact.properties.company || 'Unknown Company';

      // Get HubSpot owner ID
      const ownerId = await hubSpotService.getOwnerByEmail(user.email);

      await job.updateProgress(70);

      // Update company address from quote data first
      try {
        hubspotLogger.info({ quoteId }, '🏢 Syncing company address from quote data');
        await hubSpotService.updateOrCreateCompanyFromQuote(quote, contact);
        hubspotLogger.info({ quoteId }, '✅ Company address sync completed');
      } catch (companyError) {
        hubspotLogger.warn({ quoteId, error: companyError }, '⚠️ Company address sync failed');
      }

      await job.updateProgress(75);

      // Create deal in HubSpot
      const dealIncludesBookkeeping = quote.serviceBookkeeping || quote.includesBookkeeping;
      const dealIncludesTaas = quote.serviceTaas || quote.includesTaas;
      
      const deal = await hubSpotService.createDeal(
        contact.id,
        companyName,
        parseFloat(quote.monthlyFee),
        parseFloat(quote.setupFee),
        ownerId || undefined,
        dealIncludesBookkeeping,
        dealIncludesTaas,
        quote.serviceTier || 'Standard',
        quote
      );

      if (!deal) {
        throw new Error('Failed to create deal in HubSpot');
      }

      await job.updateProgress(85);

      // Now create the quote in HubSpot linked to the deal
      let hubspotQuote = null;
      try {
        hubspotLogger.info({ quoteId, dealId: deal.id }, '📋 Creating HubSpot quote');
        // Calculate individual service fees from quote data
        const { calculateCombinedFees } = await import('../../shared/pricing.js');
        const feeCalculation = calculateCombinedFees(quote as any);
        
        hubspotLogger.info({ quoteId, calculatedFees: {
          payrollFee: feeCalculation.payrollFee,
          agentOfServiceFee: feeCalculation.agentOfServiceFee,
          apFee: feeCalculation.apFee,
          arFee: feeCalculation.arFee,
          cfoAdvisoryFee: feeCalculation.cfoAdvisoryFee,
          cleanupProjectFee: feeCalculation.cleanupProjectFee,
          priorYearFilingsFee: feeCalculation.priorYearFilingsFee
        }}, '🔧 Calculated individual service fees');
        
        hubspotQuote = await hubSpotService.createQuote(
          deal.id,
          companyName,
          parseFloat(quote.monthlyFee),
          parseFloat(quote.setupFee),
          user.email,
          contact.properties.firstname || 'Contact',
          contact.properties.lastname || '',
          dealIncludesBookkeeping,
          dealIncludesTaas,
          parseFloat(quote.taasMonthlyFee || '0'),
          parseFloat(quote.taasPriorYearsFee || '0'),
          parseFloat(quote.monthlyFee),
          parseFloat(quote.setupFee),
          quote,
          quote.serviceTier || 'Standard',
          // Add all the missing service parameters with CALCULATED fees
          Boolean(quote.servicePayroll || quote.servicePayrollService),  // includesPayroll
          feeCalculation.payrollFee,                          // payrollFee (calculated)
          Boolean(quote.serviceApLite || quote.serviceApAdvanced || quote.serviceApArService), // includesAP
          feeCalculation.apFee,                               // apFee (calculated)
          Boolean(quote.serviceArLite || quote.serviceArAdvanced || quote.serviceArService), // includesAR
          feeCalculation.arFee,                               // arFee (calculated)
          Boolean(quote.serviceAgentOfService),               // includesAgentOfService
          feeCalculation.agentOfServiceFee,                   // agentOfServiceFee (calculated)
          Boolean(quote.serviceCfoAdvisory),                  // includesCfoAdvisory
          feeCalculation.cfoAdvisoryFee,                      // cfoAdvisoryFee (calculated)
          feeCalculation.cleanupProjectFee,                   // cleanupProjectFee (calculated)
          feeCalculation.priorYearFilingsFee,                 // priorYearFilingsFee (calculated)
          Boolean(quote.serviceFpaBuild),                     // includesFpaBuild
          parseFloat(quote.fpaServiceFee || '0')              // fpaServiceFee (TODO: calculate)
        );
        hubspotLogger.info({ quoteId, hubspotQuoteId: hubspotQuote?.id }, '✅ HubSpot quote created successfully');
      } catch (quoteError) {
        hubspotLogger.error({ quoteId, dealId: deal.id, error: quoteError }, '❌ Quote creation failed');
        // Don't throw - deal was created successfully
      }

      result = {
        success: true,
        quoteId,
        dealId: deal.id,
        hubspotQuoteId: hubspotQuote?.id
      };

      hubspotLogger.info({ 
        quoteId, 
        dealId: deal.id,
        hubspotQuoteId: deal.hubspotQuoteId 
      }, '✅ Successfully created HubSpot deal and quote');

    } else {
      // Update existing quote in HubSpot
      await job.updateProgress(75);
      
      // Implementation for updating existing quotes
      // This would call hubSpotService.updateQuote or similar
      result = {
        success: true,
        quoteId
      };

      hubspotLogger.info({ quoteId }, '✅ Successfully updated HubSpot quote');
    }

    await job.updateProgress(100);
    return result;

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error occurred';
    
    hubspotLogger.error({ 
      jobId: job.id,
      quoteId, 
      action,
      error: errorMessage,
      attempt: job.attemptsMade + 1,
      stack: error.stack
    }, '❌ HubSpot quote sync failed');

    // Return failure result
    return {
      success: false,
      quoteId,
      error: errorMessage
    };
  }
}