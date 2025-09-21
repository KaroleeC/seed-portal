import type { Express } from 'express';
import { requireAuth } from './auth';
import { cache, CachePrefix, CacheTTL } from './cache';
import { hubSpotService } from './hubspot';
import { syncQuoteToHubSpot } from './services/hubspot/sync';
import { storage } from './storage';
import { calculateCombinedFees } from '@shared/pricing';
import { sendOk, sendError } from './utils/responses';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

// Normalize arbitrary quote-like objects into PricingData-like input
function toPricingData(input: any) {
  const num = (v: any): number | undefined => {
    if (v === null || v === undefined) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    monthlyRevenueRange: input?.monthlyRevenueRange || undefined,
    monthlyTransactions: input?.monthlyTransactions || undefined,
    industry: input?.industry || undefined,
    cleanupMonths: num(input?.cleanupMonths),
    cleanupComplexity: input?.cleanupComplexity || undefined,
    cleanupOverride: input?.cleanupOverride ?? undefined,
    overrideReason: input?.overrideReason ?? undefined,
    customSetupFee: input?.customSetupFee || undefined,
    serviceTier: input?.serviceTier || undefined,
    includesTaas: input?.includesTaas ?? undefined,
    numEntities: num(input?.numEntities ?? input?.customNumEntities),
    customNumEntities: num(input?.customNumEntities) ?? null,
    statesFiled: num(input?.statesFiled ?? input?.customStatesFiled),
    customStatesFiled: num(input?.customStatesFiled) ?? null,
    internationalFiling: input?.internationalFiling ?? undefined,
    numBusinessOwners: num(input?.numBusinessOwners ?? input?.customNumBusinessOwners),
    customNumBusinessOwners: num(input?.customNumBusinessOwners) ?? null,
    include1040s: input?.include1040s ?? undefined,
    priorYearsUnfiled: num(input?.priorYearsUnfiled),
    qboSubscription: input?.qboSubscription ?? null,
    entityType: input?.entityType || undefined,
    bookkeepingQuality: input?.bookkeepingQuality || undefined,
  };
}

export function registerHubspotRoutes(app: Express) {
  // POST /api/hubspot/verify-contact
  app.post('/api/hubspot/verify-contact', requireAuth, async (req, res) => {
    try {
      const { email } = (req.body || {}) as { email?: string };
      if (!email) return sendError(res, 'INVALID_REQUEST', 'Email is required', 400);
      if (!hubSpotService) return sendError(res, 'HUBSPOT_NOT_CONFIGURED', 'HubSpot integration not configured', 400, { verified: false, data: { verified: false } });
      const cacheKey = cache.generateKey(CachePrefix.HUBSPOT_CONTACT, email);
      const result = await cache.wrap(cacheKey, () => (hubSpotService as NonNullable<typeof hubSpotService>).verifyContactByEmail(email), { ttl: CacheTTL.HUBSPOT_CONTACT });
      return sendOk(res, result, undefined, result);
    } catch (error) {
      console.error('Error verifying contact:', error);
      return sendError(res, 'VERIFY_CONTACT_FAILED', 'Failed to verify contact', 500);
    }
  });

  // POST /api/hubspot/search-contacts
  app.post('/api/hubspot/search-contacts', requireAuth, async (req, res) => {
    try {
      const { searchTerm } = (req.body || {}) as { searchTerm?: string };
      if (!searchTerm || searchTerm.length < 2) return sendOk(res, { contacts: [] }, undefined, { contacts: [] });
      if (!hubSpotService) return sendError(res, 'HUBSPOT_NOT_CONFIGURED', 'HubSpot integration not configured', 400, { contacts: [] });
      const contacts = await hubSpotService.searchContacts(searchTerm);
      return sendOk(res, { contacts }, undefined, { contacts });
    } catch (error) {
      console.error('HubSpot search contacts error:', error);
      return sendError(res, 'HUBSPOT_SEARCH_FAILED', 'Failed to search HubSpot contacts', 500);
    }
  });

  // POST /api/hubspot/queue-sync (queue-first, fallback to direct sync)
  app.post('/api/hubspot/queue-sync', requireAuth, async (req, res) => {
    try {
      const { quoteId } = (req.body || {}) as { quoteId?: number };
      const action = ((req.body || {}) as any).action || 'create';
      if (!quoteId) return sendError(res, 'INVALID_REQUEST', 'Quote ID is required', 400);
      if (!req.user) return sendError(res, 'UNAUTHENTICATED', 'User not authenticated', 401);

      try {
        const { scheduleQuoteSync } = await import('./jobs/hubspot-queue-manager');
        const job = await scheduleQuoteSync(quoteId, action, (req.user as any).id, 1);
        return sendOk(res, { jobId: job.id, quoteId, action, method: 'queued' }, undefined, { jobId: job.id, message: 'HubSpot sync queued successfully', quoteId, action, method: 'queued' });
      } catch (queueError) {
        console.log('Queue unavailable, falling back to direct sync:', getErrorMessage(queueError));
      }

      try {
        const unified = await syncQuoteToHubSpot(quoteId, action as any, (req.user as any).email);
        return sendOk(res, { quoteId, action, method: 'direct', hubspotDealId: unified.hubspotDealId, hubspotQuoteId: unified.hubspotQuoteId, totals: unified.totals }, undefined, { message: 'HubSpot sync completed successfully', quoteId, action, method: 'direct', hubspotDealId: unified.hubspotDealId, hubspotQuoteId: unified.hubspotQuoteId, totals: unified.totals });
      } catch (unifiedError) {
        console.error('Unified direct sync failed:', unifiedError);
        return sendError(res, 'HUBSPOT_SYNC_FAILED', 'HubSpot sync failed', 500, { quoteId, action, method: 'direct' });
      }
    } catch (error) {
      console.error('Failed to sync to HubSpot:', error);
      return sendError(res, 'HUBSPOT_SYNC_FAILED', 'Failed to sync to HubSpot', 500);
    }
  });

  // GET /api/hubspot/queue-status
  app.get('/api/hubspot/queue-status', requireAuth, async (_req, res) => {
    try {
      const { getQueueStatus } = await import('./jobs/hubspot-queue-manager');
      const status = await getQueueStatus();
      return sendOk(res, status, undefined, status as any);
    } catch (error) {
      console.error('Failed to get queue status:', error);
      return sendError(res, 'QUEUE_STATUS_FAILED', 'Failed to get queue status', 500);
    }
  });

  // GET /api/hubspot/debug/products
  app.get('/api/hubspot/debug/products', requireAuth, async (_req, res) => {
    try {
      if (!hubSpotService) return sendError(res, 'HUBSPOT_NOT_CONFIGURED', 'HubSpot integration not configured', 400);
      const productIds = await hubSpotService.verifyAndGetProductIds();
      const allProducts = await hubSpotService.getProducts();
      return sendOk(res, { productIds, totalProducts: allProducts.length, sampleProducts: allProducts.slice(0, 5).map(p => ({ id: p.id, name: p.properties?.name, sku: p.properties?.hs_sku })) }, undefined, { productIds, totalProducts: allProducts.length });
    } catch (error) {
      console.error('Error debugging products:', error);
      return sendError(res, 'DEBUG_PRODUCTS_FAILED', 'Failed to debug products', 500);
    }
  });

  // GET /api/hubspot/health
  app.get('/api/hubspot/health', requireAuth, async (_req, res) => {
    try {
      const { checkHubSpotApiHealth } = await import('./hubspot-background-jobs.js');
      const isHealthy = await checkHubSpotApiHealth();
      return sendOk(res, { status: isHealthy ? 'healthy' : 'unhealthy', hasApiAccess: isHealthy, timestamp: new Date().toISOString() }, undefined, { status: isHealthy ? 'healthy' : 'unhealthy', timestamp: new Date().toISOString(), hasApiAccess: isHealthy });
    } catch (error) {
      console.error('HubSpot health check error:', error);
      return sendError(res, 'HEALTH_CHECK_FAILED', 'Failed to check HubSpot health', 500);
    }
  });

  // POST /api/hubspot/cleanup-queue
  app.post('/api/hubspot/cleanup-queue', requireAuth, async (_req, res) => {
    try {
      const { cleanupHubSpotQueue } = await import('./hubspot-background-jobs.js');
      await cleanupHubSpotQueue();
      return sendOk(res, { message: 'HubSpot queue cleanup completed successfully' }, undefined, { message: 'HubSpot queue cleanup completed successfully' });
    } catch (error) {
      console.error('HubSpot queue cleanup error:', error);
      return sendError(res, 'QUEUE_CLEANUP_FAILED', 'Failed to cleanup HubSpot queue', 500);
    }
  });

  // POST /api/hubspot/diagnostics/create (dry-run preview)
  app.post('/api/hubspot/diagnostics/create', requireAuth, async (req, res) => {
    try {
      const { quoteId } = (req.body || {}) as { quoteId?: number | string };
      if (!quoteId) return sendError(res, 'INVALID_REQUEST', 'quoteId required', 400);
      if (!hubSpotService) return sendError(res, 'HUBSPOT_NOT_CONFIGURED', 'HubSpot integration not configured', 400);
      const idNum = typeof quoteId === 'string' ? parseInt(quoteId, 10) : quoteId;
      if (!idNum || Number.isNaN(idNum)) return sendError(res, 'INVALID_REQUEST', 'invalid quoteId', 400);
      const quote = await storage.getQuote(idNum);
      if (!quote) return sendError(res, 'NOT_FOUND', `Quote ${quoteId} not found`, 404);

      const contactResult = await hubSpotService.verifyContactByEmail(quote.contactEmail);
      const contact = contactResult.contact || null;
      const companyName = contact?.properties?.company || 'Unknown Company';
      const ownerEmail = (req.user as any)?.email || null;
      const ownerId = ownerEmail ? await hubSpotService.getOwnerByEmail(ownerEmail) : null;

      const pricingInput = toPricingData(quote);
      const calc: any = calculateCombinedFees(pricingInput);

      const includesBookkeeping = Boolean((quote as any).serviceBookkeeping || (quote as any).includesBookkeeping || (quote as any).serviceMonthlyBookkeeping);
      const includesTaas = Boolean((quote as any).serviceTaas || (quote as any).includesTaas || (quote as any).serviceTaasMonthly || (quote as any).servicePriorYearFilings);
      const includesPayroll = Boolean((quote as any).servicePayroll || (quote as any).servicePayrollService);
      const includesAP = Boolean((quote as any).serviceApLite || (quote as any).serviceApAdvanced || (quote as any).serviceApArService);
      const includesAR = Boolean((quote as any).serviceArLite || (quote as any).serviceArAdvanced || (quote as any).serviceArService);
      const includesAgentOfService = Boolean((quote as any).serviceAgentOfService);
      const includesCfoAdvisory = Boolean((quote as any).serviceCfoAdvisory);
      const includesFpaBuild = Boolean((quote as any).serviceFpaBuild);

      const productIds = await hubSpotService.verifyAndGetProductIds();

      const lineItemsPreview: Array<{ productKey: string; productId: string | null; price: number; quantity: number; note?: string }> = [];
      if (includesBookkeeping && calc.bookkeeping.monthlyFee > 0) lineItemsPreview.push({ productKey: 'MONTHLY_BOOKKEEPING', productId: productIds.bookkeeping || null, price: calc.bookkeeping.monthlyFee, quantity: 1 });
      if (includesBookkeeping && calc.bookkeeping.setupFee > 0) lineItemsPreview.push({ productKey: 'MONTHLY_BOOKKEEPING_SETUP', productId: null, price: calc.bookkeeping.setupFee, quantity: 1, note: 'bookkeepingSetupFee (separate from combined setup)' });
      if (includesTaas && calc.taas.monthlyFee > 0) lineItemsPreview.push({ productKey: 'TAAS', productId: null, price: calc.taas.monthlyFee, quantity: 1 });
      if (calc.cleanupProjectFee > 0) lineItemsPreview.push({ productKey: 'CLEANUP_PROJECT', productId: productIds.cleanup || null, price: calc.cleanupProjectFee, quantity: 1 });
      if (calc.priorYearFilingsFee > 0) lineItemsPreview.push({ productKey: 'PRIOR_YEAR_FILINGS', productId: null, price: calc.priorYearFilingsFee, quantity: 1 });
      if (includesPayroll && calc.payrollFee > 0) lineItemsPreview.push({ productKey: 'PAYROLL_SERVICE', productId: null, price: calc.payrollFee, quantity: 1 });
      if (includesAP && calc.apFee > 0) lineItemsPreview.push({ productKey: (quote as any).apServiceTier === 'advanced' ? 'AP_ADVANCED_SERVICE' : 'AP_LITE_SERVICE', productId: null, price: calc.apFee, quantity: 1 });
      if (includesAR && calc.arFee > 0) lineItemsPreview.push({ productKey: (quote as any).arServiceTier === 'advanced' ? 'AR_ADVANCED_SERVICE' : 'AR_LITE_SERVICE', productId: null, price: calc.arFee, quantity: 1 });
      if (includesAgentOfService && calc.agentOfServiceFee > 0) lineItemsPreview.push({ productKey: 'AGENT_OF_SERVICE', productId: null, price: calc.agentOfServiceFee, quantity: 1 });
      if ((quote as any).serviceTier === 'Concierge' && calc.serviceTierFee > 0) lineItemsPreview.push({ productKey: 'CONCIERGE_SERVICE_TIER', productId: null, price: calc.serviceTierFee, quantity: 1 });
      else if ((quote as any).serviceTier === 'Guided' && calc.serviceTierFee > 0) lineItemsPreview.push({ productKey: 'GUIDED_SERVICE_TIER', productId: null, price: calc.serviceTierFee, quantity: 1 });
      const qboFee = calc.qboFee || (pricingInput.qboSubscription ? 60 : 0);
      if (pricingInput.qboSubscription) lineItemsPreview.push({ productKey: 'MANAGED_QBO_SUBSCRIPTION', productId: null, price: qboFee, quantity: 1 });

      const payload = { mode: 'create', quoteId, contactVerified: contactResult.verified, contactId: contact?.id || null, companyName, ownerEmail, ownerId, includes: { bookkeeping: includesBookkeeping, taas: includesTaas, payroll: includesPayroll, ap: includesAP, ar: includesAR, agentOfService: includesAgentOfService, cfoAdvisory: includesCfoAdvisory, fpaBuild: includesFpaBuild }, totals: { monthly: calc.combined.monthlyFee, setup: calc.combined.setupFee, bookkeepingSetupFee: calc.bookkeeping.setupFee }, productIds, lineItemsPreview };
      return sendOk(res, payload, undefined, payload as any);
    } catch (error) {
      console.error('Create diagnostics failed:', error);
      return sendError(res, 'DIAGNOSTICS_CREATE_FAILED', 'Create diagnostics failed', 500);
    }
  });

  // POST /api/hubspot/diagnostics/update (dry-run preview)
  app.post('/api/hubspot/diagnostics/update', requireAuth, async (req, res) => {
    try {
      const { quoteId } = (req.body || {}) as { quoteId?: number | string };
      if (!quoteId) return sendError(res, 'INVALID_REQUEST', 'quoteId required', 400);
      if (!hubSpotService) return sendError(res, 'HUBSPOT_NOT_CONFIGURED', 'HubSpot integration not configured', 400);
      const idNum = typeof quoteId === 'string' ? parseInt(quoteId, 10) : quoteId;
      if (!idNum || Number.isNaN(idNum)) return sendError(res, 'INVALID_REQUEST', 'invalid quoteId', 400);
      const quote = await storage.getQuote(idNum);
      if (!quote) return sendError(res, 'NOT_FOUND', `Quote ${quoteId} not found`, 404);
      if (!(quote as any).hubspotDealId || !(quote as any).hubspotQuoteId) return sendError(res, 'INVALID_STATE', 'Quote missing hubspotDealId or hubspotQuoteId; cannot update', 400);

      const contactResult = await hubSpotService.verifyContactByEmail(quote.contactEmail);
      const contact = contactResult.contact || null;
      const companyName = contact?.properties?.company || 'Unknown Company';
      const ownerEmail = (req.user as any)?.email || null;
      const ownerId = ownerEmail ? await hubSpotService.getOwnerByEmail(ownerEmail) : null;

      const pricingInput = toPricingData(quote);
      const calc: any = calculateCombinedFees(pricingInput);

      const includesBookkeeping = Boolean((quote as any).serviceBookkeeping || (quote as any).includesBookkeeping || (quote as any).serviceMonthlyBookkeeping);
      const includesTaas = Boolean((quote as any).serviceTaas || (quote as any).includesTaas || (quote as any).serviceTaasMonthly || (quote as any).servicePriorYearFilings);
      const includesPayroll = Boolean((quote as any).servicePayroll || (quote as any).servicePayrollService);
      const includesAP = Boolean((quote as any).serviceApLite || (quote as any).serviceApAdvanced || (quote as any).serviceApArService);
      const includesAR = Boolean((quote as any).serviceArLite || (quote as any).serviceArAdvanced || (quote as any).serviceArService);
      const includesAgentOfService = Boolean((quote as any).serviceAgentOfService);
      const includesCfoAdvisory = Boolean((quote as any).serviceCfoAdvisory);
      const includesFpaBuild = Boolean((quote as any).serviceFpaBuild);

      const productIds = await hubSpotService.verifyAndGetProductIds();

      const lineItemsPreview: Array<{ productKey: string; productId: string | null; price: number; quantity: number; note?: string }> = [];
      if (includesBookkeeping && calc.bookkeeping.monthlyFee > 0) lineItemsPreview.push({ productKey: 'MONTHLY_BOOKKEEPING', productId: productIds.bookkeeping || null, price: calc.bookkeeping.monthlyFee, quantity: 1 });
      if (includesBookkeeping && calc.bookkeeping.setupFee > 0) lineItemsPreview.push({ productKey: 'MONTHLY_BOOKKEEPING_SETUP', productId: null, price: calc.bookkeeping.setupFee, quantity: 1 });
      if (includesTaas && calc.taas.monthlyFee > 0) lineItemsPreview.push({ productKey: 'TAAS', productId: null, price: calc.taas.monthlyFee, quantity: 1 });
      if (calc.cleanupProjectFee > 0) lineItemsPreview.push({ productKey: 'CLEANUP_PROJECT', productId: productIds.cleanup || null, price: calc.cleanupProjectFee, quantity: 1 });
      if (calc.priorYearFilingsFee > 0) lineItemsPreview.push({ productKey: 'PRIOR_YEAR_FILINGS', productId: null, price: calc.priorYearFilingsFee, quantity: 1 });
      if (includesPayroll && calc.payrollFee > 0) lineItemsPreview.push({ productKey: 'PAYROLL_SERVICE', productId: null, price: calc.payrollFee, quantity: 1 });
      if (includesAP && calc.apFee > 0) lineItemsPreview.push({ productKey: (quote as any).apServiceTier === 'advanced' ? 'AP_ADVANCED_SERVICE' : 'AP_LITE_SERVICE', productId: null, price: calc.apFee, quantity: 1 });
      if (includesAR && calc.arFee > 0) lineItemsPreview.push({ productKey: (quote as any).arServiceTier === 'advanced' ? 'AR_ADVANCED_SERVICE' : 'AR_LITE_SERVICE', productId: null, price: calc.arFee, quantity: 1 });
      if (includesAgentOfService && calc.agentOfServiceFee > 0) lineItemsPreview.push({ productKey: 'AGENT_OF_SERVICE', productId: null, price: calc.agentOfServiceFee, quantity: 1 });
      if ((quote as any).serviceTier === 'Concierge' && calc.serviceTierFee > 0) lineItemsPreview.push({ productKey: 'CONCIERGE_SERVICE_TIER', productId: null, price: calc.serviceTierFee, quantity: 1 });
      else if ((quote as any).serviceTier === 'Guided' && calc.serviceTierFee > 0) lineItemsPreview.push({ productKey: 'GUIDED_SERVICE_TIER', productId: null, price: calc.serviceTierFee, quantity: 1 });
      const qboFee2 = calc.qboFee || (pricingInput.qboSubscription ? 60 : 0);
      if (pricingInput.qboSubscription) lineItemsPreview.push({ productKey: 'MANAGED_QBO_SUBSCRIPTION', productId: null, price: qboFee2, quantity: 1 });

      const updatePreview = { monthlyFeeDb: parseFloat(((quote as any).monthlyFee || '0') as string), setupFeeDb: parseFloat(((quote as any).setupFee || '0') as string), recalculated: { bookkeepingMonthlyFee: calc.bookkeeping.monthlyFee, bookkeepingSetupFee: calc.bookkeeping.setupFee, taasMonthlyFee: calc.taas.monthlyFee, serviceTierFee: calc.serviceTierFee, payrollFee: calc.payrollFee, apFee: calc.apFee, arFee: calc.arFee, agentOfServiceFee: calc.agentOfServiceFee, cfoAdvisoryFee: calc.cfoAdvisoryFee, cleanupProjectFee: calc.cleanupProjectFee, priorYearFilingsFee: calc.priorYearFilingsFee, qboFee: calc.qboFee || 0 } };

      const payload = { mode: 'update', quoteId, existing: { hubspotDealId: (quote as any).hubspotDealId || null, hubspotQuoteId: (quote as any).hubspotQuoteId || null }, contactVerified: contactResult.verified, contactId: contact?.id || null, companyName, ownerEmail, ownerId, includes: { bookkeeping: includesBookkeeping, taas: includesTaas, payroll: includesPayroll, ap: includesAP, ar: includesAR, agentOfService: includesAgentOfService, cfoAdvisory: includesCfoAdvisory, fpaBuild: includesFpaBuild }, totals: { monthly: calc.combined.monthlyFee, setup: calc.combined.setupFee, bookkeepingSetupFee: calc.bookkeeping.setupFee }, productIds, lineItemsPreview, updatePreview };
      return sendOk(res, payload, undefined, payload as any);
    } catch (error) {
      console.error('Update diagnostics failed:', error);
      return sendError(res, 'DIAGNOSTICS_UPDATE_FAILED', 'Update diagnostics failed', 500);
    }
  });

  // GET convenience variants for diagnostics
  app.get('/api/hubspot/diagnostics/create', requireAuth, async (req, res) => {
    try {
      const quoteId = typeof (req.query as any).quoteId === 'string' ? (req.query as any).quoteId : undefined;
      if (!quoteId) return sendError(res, 'INVALID_REQUEST', 'quoteId required', 400);
      if (!hubSpotService) return sendError(res, 'HUBSPOT_NOT_CONFIGURED', 'HubSpot integration not configured', 400);
      const idNum = parseInt(String(quoteId), 10);
      if (Number.isNaN(idNum)) return sendError(res, 'INVALID_REQUEST', 'invalid quoteId', 400);
      const quote = await storage.getQuote(idNum);
      if (!quote) return sendError(res, 'NOT_FOUND', `Quote ${quoteId} not found`, 404);

      const contactResult = await hubSpotService.verifyContactByEmail(quote.contactEmail);
      const contact = contactResult.contact || null;
      const companyName = contact?.properties?.company || 'Unknown Company';
      const ownerEmail = (req.user as any)?.email || null;
      const ownerId = ownerEmail ? await hubSpotService.getOwnerByEmail(ownerEmail) : null;
      const pricingInput = toPricingData(quote);
      const calc: any = calculateCombinedFees(pricingInput);

      const includesBookkeeping = Boolean((quote as any).serviceBookkeeping || (quote as any).includesBookkeeping || (quote as any).serviceMonthlyBookkeeping);
      const includesTaas = Boolean((quote as any).serviceTaas || (quote as any).includesTaas || (quote as any).serviceTaasMonthly || (quote as any).servicePriorYearFilings);
      const includesPayroll = Boolean((quote as any).servicePayroll || (quote as any).servicePayrollService);
      const includesAP = Boolean((quote as any).serviceApLite || (quote as any).serviceApAdvanced || (quote as any).serviceApArService);
      const includesAR = Boolean((quote as any).serviceArLite || (quote as any).serviceArAdvanced || (quote as any).serviceArService);
      const includesAgentOfService = Boolean((quote as any).serviceAgentOfService);
      const includesCfoAdvisory = Boolean((quote as any).serviceCfoAdvisory);
      const includesFpaBuild = Boolean((quote as any).serviceFpaBuild);
      const productIds = await hubSpotService.verifyAndGetProductIds();
      const lineItemsPreview: Array<{ productKey: string; productId: string | null; price: number; quantity: number; note?: string }> = [];
      if (includesBookkeeping && calc.bookkeeping.monthlyFee > 0) lineItemsPreview.push({ productKey: 'MONTHLY_BOOKKEEPING', productId: productIds.bookkeeping || null, price: calc.bookkeeping.monthlyFee, quantity: 1 });
      if (includesBookkeeping && calc.bookkeeping.setupFee > 0) lineItemsPreview.push({ productKey: 'MONTHLY_BOOKKEEPING_SETUP', productId: null, price: calc.bookkeeping.setupFee, quantity: 1 });
      if (includesTaas && calc.taas.monthlyFee > 0) lineItemsPreview.push({ productKey: 'TAAS', productId: null, price: calc.taas.monthlyFee, quantity: 1 });
      if (calc.cleanupProjectFee > 0) lineItemsPreview.push({ productKey: 'CLEANUP_PROJECT', productId: productIds.cleanup || null, price: calc.cleanupProjectFee, quantity: 1 });
      if (calc.priorYearFilingsFee > 0) lineItemsPreview.push({ productKey: 'PRIOR_YEAR_FILINGS', productId: null, price: calc.priorYearFilingsFee, quantity: 1 });
      if (includesPayroll && calc.payrollFee > 0) lineItemsPreview.push({ productKey: 'PAYROLL_SERVICE', productId: null, price: calc.payrollFee, quantity: 1 });
      if (includesAP && calc.apFee > 0) lineItemsPreview.push({ productKey: (quote as any).apServiceTier === 'advanced' ? 'AP_ADVANCED_SERVICE' : 'AP_LITE_SERVICE', productId: null, price: calc.apFee, quantity: 1 });
      if (includesAR && calc.arFee > 0) lineItemsPreview.push({ productKey: (quote as any).arServiceTier === 'advanced' ? 'AR_ADVANCED_SERVICE' : 'AR_LITE_SERVICE', productId: null, price: calc.arFee, quantity: 1 });
      if (includesAgentOfService && calc.agentOfServiceFee > 0) lineItemsPreview.push({ productKey: 'AGENT_OF_SERVICE', productId: null, price: calc.agentOfServiceFee, quantity: 1 });
      if ((quote as any).serviceTier === 'Concierge' && calc.serviceTierFee > 0) lineItemsPreview.push({ productKey: 'CONCIERGE_SERVICE_TIER', productId: null, price: calc.serviceTierFee, quantity: 1 });
      else if ((quote as any).serviceTier === 'Guided' && calc.serviceTierFee > 0) lineItemsPreview.push({ productKey: 'GUIDED_SERVICE_TIER', productId: null, price: calc.serviceTierFee, quantity: 1 });
      const qboFee = calc.qboFee || (pricingInput.qboSubscription ? 60 : 0);
      if (pricingInput.qboSubscription) lineItemsPreview.push({ productKey: 'MANAGED_QBO_SUBSCRIPTION', productId: null, price: qboFee, quantity: 1 });
      const payload = { mode: 'create', quoteId, contactVerified: contactResult.verified, contactId: contact?.id || null, companyName, ownerEmail, ownerId, includes: { bookkeeping: includesBookkeeping, taas: includesTaas, payroll: includesPayroll, ap: includesAP, ar: includesAR, agentOfService: includesAgentOfService, cfoAdvisory: includesCfoAdvisory, fpaBuild: includesFpaBuild }, totals: { monthly: calc.combined.monthlyFee, setup: calc.combined.setupFee, bookkeepingSetupFee: calc.bookkeeping.setupFee }, productIds, lineItemsPreview };
      return sendOk(res, payload, undefined, payload as any);
    } catch (error) {
      console.error('Create diagnostics (GET) failed:', error);
      return sendError(res, 'DIAGNOSTICS_CREATE_FAILED', 'Create diagnostics failed', 500);
    }
  });

  app.get('/api/hubspot/diagnostics/update', requireAuth, async (req, res) => {
    try {
      const quoteId = typeof (req.query as any).quoteId === 'string' ? (req.query as any).quoteId : undefined;
      if (!quoteId) return sendError(res, 'INVALID_REQUEST', 'quoteId required', 400);
      if (!hubSpotService) return sendError(res, 'HUBSPOT_NOT_CONFIGURED', 'HubSpot integration not configured', 400);
      const idNum = parseInt(String(quoteId), 10);
      if (Number.isNaN(idNum)) return sendError(res, 'INVALID_REQUEST', 'invalid quoteId', 400);
      const quote = await storage.getQuote(idNum);
      if (!quote) return sendError(res, 'NOT_FOUND', `Quote ${quoteId} not found`, 404);
      if (!(quote as any).hubspotDealId || !(quote as any).hubspotQuoteId) return sendError(res, 'INVALID_STATE', 'Quote missing hubspotDealId or hubspotQuoteId; cannot update', 400);

      const contactResult = await hubSpotService.verifyContactByEmail(quote.contactEmail);
      const contact = contactResult.contact || null;
      const companyName = contact?.properties?.company || 'Unknown Company';
      const ownerEmail = (req.user as any)?.email || null;
      const ownerId = ownerEmail ? await hubSpotService.getOwnerByEmail(ownerEmail) : null;
      const pricingInput = toPricingData(quote);
      const calc: any = calculateCombinedFees(pricingInput);
      const includesBookkeeping = Boolean((quote as any).serviceBookkeeping || (quote as any).includesBookkeeping || (quote as any).serviceMonthlyBookkeeping);
      const includesTaas = Boolean((quote as any).serviceTaas || (quote as any).includesTaas || (quote as any).serviceTaasMonthly || (quote as any).servicePriorYearFilings);
      const includesPayroll = Boolean((quote as any).servicePayroll || (quote as any).servicePayrollService);
      const includesAP = Boolean((quote as any).serviceApLite || (quote as any).serviceApAdvanced || (quote as any).serviceApArService);
      const includesAR = Boolean((quote as any).serviceArLite || (quote as any).serviceArAdvanced || (quote as any).serviceArService);
      const includesAgentOfService = Boolean((quote as any).serviceAgentOfService);
      const includesCfoAdvisory = Boolean((quote as any).serviceCfoAdvisory);
      const includesFpaBuild = Boolean((quote as any).serviceFpaBuild);
      const productIds = await hubSpotService.verifyAndGetProductIds();
      const lineItemsPreview: Array<{ productKey: string; productId: string | null; price: number; quantity: number; note?: string }> = [];
      if (includesBookkeeping && calc.bookkeeping.monthlyFee > 0) lineItemsPreview.push({ productKey: 'MONTHLY_BOOKKEEPING', productId: productIds.bookkeeping || null, price: calc.bookkeeping.monthlyFee, quantity: 1 });
      if (includesBookkeeping && calc.bookkeeping.setupFee > 0) lineItemsPreview.push({ productKey: 'MONTHLY_BOOKKEEPING_SETUP', productId: null, price: calc.bookkeeping.setupFee, quantity: 1 });
      if (includesTaas && calc.taas.monthlyFee > 0) lineItemsPreview.push({ productKey: 'TAAS', productId: null, price: calc.taas.monthlyFee, quantity: 1 });
      if (calc.cleanupProjectFee > 0) lineItemsPreview.push({ productKey: 'CLEANUP_PROJECT', productId: productIds.cleanup || null, price: calc.cleanupProjectFee, quantity: 1 });
      if (calc.priorYearFilingsFee > 0) lineItemsPreview.push({ productKey: 'PRIOR_YEAR_FILINGS', productId: null, price: calc.priorYearFilingsFee, quantity: 1 });
      if (includesPayroll && calc.payrollFee > 0) lineItemsPreview.push({ productKey: 'PAYROLL_SERVICE', productId: null, price: calc.payrollFee, quantity: 1 });
      if (includesAP && calc.apFee > 0) lineItemsPreview.push({ productKey: (quote as any).apServiceTier === 'advanced' ? 'AP_ADVANCED_SERVICE' : 'AP_LITE_SERVICE', productId: null, price: calc.apFee, quantity: 1 });
      if (includesAR && calc.arFee > 0) lineItemsPreview.push({ productKey: (quote as any).arServiceTier === 'advanced' ? 'AR_ADVANCED_SERVICE' : 'AR_LITE_SERVICE', productId: null, price: calc.arFee, quantity: 1 });
      if (includesAgentOfService && calc.agentOfServiceFee > 0) lineItemsPreview.push({ productKey: 'AGENT_OF_SERVICE', productId: null, price: calc.agentOfServiceFee, quantity: 1 });
      if ((quote as any).serviceTier === 'Concierge' && calc.serviceTierFee > 0) lineItemsPreview.push({ productKey: 'CONCIERGE_SERVICE_TIER', productId: null, price: calc.serviceTierFee, quantity: 1 });
      else if ((quote as any).serviceTier === 'Guided' && calc.serviceTierFee > 0) lineItemsPreview.push({ productKey: 'GUIDED_SERVICE_TIER', productId: null, price: calc.serviceTierFee, quantity: 1 });
      const qboFee2 = calc.qboFee || (pricingInput.qboSubscription ? 60 : 0);
      if (pricingInput.qboSubscription) lineItemsPreview.push({ productKey: 'MANAGED_QBO_SUBSCRIPTION', productId: null, price: qboFee2, quantity: 1 });
      const updatePreview = { monthlyFeeDb: parseFloat(((quote as any).monthlyFee || '0') as string), setupFeeDb: parseFloat(((quote as any).setupFee || '0') as string), recalculated: { bookkeepingMonthlyFee: calc.bookkeeping.monthlyFee, bookkeepingSetupFee: calc.bookkeeping.setupFee, taasMonthlyFee: calc.taas.monthlyFee, serviceTierFee: calc.serviceTierFee, payrollFee: calc.payrollFee, apFee: calc.apFee, arFee: calc.arFee, agentOfServiceFee: calc.agentOfServiceFee, cfoAdvisoryFee: calc.cfoAdvisoryFee, cleanupProjectFee: calc.cleanupProjectFee, priorYearFilingsFee: calc.priorYearFilingsFee, qboFee: calc.qboFee || 0 } };
      const payload = { mode: 'update', quoteId, existing: { hubspotDealId: (quote as any).hubspotDealId || null, hubspotQuoteId: (quote as any).hubspotQuoteId || null }, contactVerified: contactResult.verified, contactId: contact?.id || null, companyName, ownerEmail, ownerId, includes: { bookkeeping: includesBookkeeping, taas: includesTaas, payroll: includesPayroll, ap: includesAP, ar: includesAR, agentOfService: includesAgentOfService, cfoAdvisory: includesCfoAdvisory, fpaBuild: includesFpaBuild }, totals: { monthly: calc.combined.monthlyFee, setup: calc.combined.setupFee, bookkeepingSetupFee: calc.bookkeeping.setupFee }, productIds, lineItemsPreview, updatePreview };
      return sendOk(res, payload, undefined, payload as any);
    } catch (error) {
      console.error('Update diagnostics (GET) failed:', error);
      return sendError(res, 'DIAGNOSTICS_UPDATE_FAILED', 'Update diagnostics failed', 500);
    }
  });

  // POST /api/hubspot/retry-job (admin only)
  app.post('/api/hubspot/retry-job', requireAuth, async (req, res) => {
    try {
      if ((req.user as any)?.role !== 'admin') return sendError(res, 'FORBIDDEN', 'Admin access required', 403);
      const { jobId } = (req.body || {}) as { jobId?: string };
      if (!jobId) return sendError(res, 'INVALID_REQUEST', 'Job ID is required', 400);
      const { retryFailedJob } = await import('./jobs/hubspot-queue-manager');
      await retryFailedJob(jobId);
      return sendOk(res, { jobId }, undefined, { jobId, message: 'Job retry initiated' });
    } catch (error) {
      console.error('Failed to retry job:', error);
      return sendError(res, 'RETRY_JOB_FAILED', 'Failed to retry job', 500);
    }
  });

  // GET /api/hubspot/queue-metrics
  app.get('/api/hubspot/queue-metrics', requireAuth, async (_req, res) => {
    try {
      const { getHubSpotQueueMetrics } = await import('./hubspot-background-jobs.js');
      const metrics = await getHubSpotQueueMetrics();
      return sendOk(res, metrics, undefined, metrics as any);
    } catch (error) {
      console.error('HubSpot queue metrics error:', error);
      return sendError(res, 'QUEUE_METRICS_FAILED', 'Failed to get HubSpot queue metrics', 500);
    }
  });

  // POST /api/hubspot/schedule-sync
  app.post('/api/hubspot/schedule-sync', requireAuth, async (req, res) => {
    try {
      const { type, contactId, dealId } = (req.body || {}) as { type?: string; contactId?: string; dealId?: string };
      const { scheduleFullSync, scheduleIncrementalSync, scheduleContactEnrichment, scheduleDealSync } = await import('./hubspot-background-jobs.js');
      let jobId: string | null = null;
      switch (type) {
        case 'full-sync':
          jobId = await scheduleFullSync((req.user as any)?.id);
          break;
        case 'incremental-sync':
          jobId = await scheduleIncrementalSync();
          break;
        case 'contact-enrichment':
          if (!contactId) return sendError(res, 'INVALID_REQUEST', 'Contact ID required for contact enrichment', 400);
          jobId = await scheduleContactEnrichment(contactId, (req.user as any)?.id);
          break;
        case 'deal-sync':
          jobId = await scheduleDealSync(dealId);
          break;
        default:
          return sendError(res, 'INVALID_REQUEST', 'Invalid sync type', 400);
      }
      if (jobId) return sendOk(res, { message: `${type} scheduled successfully`, jobId }, undefined, { message: `${type} scheduled successfully`, jobId });
      return sendError(res, 'SCHEDULE_FAILED', `Failed to schedule ${type}`, 500);
    } catch (error) {
      console.error('Schedule HubSpot sync error:', error);
      return sendError(res, 'SCHEDULE_FAILED', 'Failed to schedule HubSpot sync', 500);
    }
  });

  // POST /api/hubspot/push-quote (legacy direct push via unified path)
  app.post('/api/hubspot/push-quote', requireAuth, async (req, res) => {
    try {
      const { quoteId } = (req.body || {}) as { quoteId?: number | string };
      if (!quoteId) return sendError(res, 'INVALID_REQUEST', 'Quote ID is required', 400);
      if (!req.user) return sendError(res, 'UNAUTHENTICATED', 'User not authenticated', 401);
      if (!hubSpotService) return sendError(res, 'HUBSPOT_NOT_CONFIGURED', 'HubSpot integration not configured', 400);
      const idNum = typeof quoteId === 'string' ? parseInt(quoteId, 10) : quoteId;
      if (!idNum || Number.isNaN(idNum)) return sendError(res, 'INVALID_REQUEST', 'Invalid quote ID', 400);
      const quote = await storage.getQuote(idNum);
      if (!quote) return sendError(res, 'NOT_FOUND', 'Quote not found', 404);
      const result = await syncQuoteToHubSpot(idNum, 'create', (req.user as any)!.email);
      return sendOk(res, { hubspotDealId: result.hubspotDealId, hubspotQuoteId: result.hubspotQuoteId }, undefined, { hubspotDealId: result.hubspotDealId, hubspotQuoteId: result.hubspotQuoteId, message: 'Successfully pushed to HubSpot (unified)' });
    } catch (error) {
      console.error('HUBSPOT PUSH ERROR:', error);
      return sendError(res, 'HUBSPOT_PUSH_FAILED', getErrorMessage(error), 500);
    }
  });

  // POST /api/hubspot/update-quote (legacy direct update via unified path)
  app.post('/api/hubspot/update-quote', requireAuth, async (req, res) => {
    try {
      const { quoteId } = (req.body || {}) as { quoteId?: number | string };
      if (!quoteId) return sendError(res, 'INVALID_REQUEST', 'Quote ID is required', 400);
      if (!hubSpotService) return sendError(res, 'HUBSPOT_NOT_CONFIGURED', 'HubSpot integration not configured', 400);
      const idNum = typeof quoteId === 'string' ? parseInt(quoteId, 10) : quoteId;
      if (!idNum || Number.isNaN(idNum)) return sendError(res, 'INVALID_REQUEST', 'Invalid quote ID', 400);
      const quote = await storage.getQuote(idNum);
      if (!quote || !(quote as any).hubspotQuoteId) return sendError(res, 'NOT_FOUND', 'Quote not found or not linked to HubSpot', 404);
      const result = await syncQuoteToHubSpot(idNum, 'update', (req.user as any)!.email);
      return sendOk(res, { hubspotDealId: result.hubspotDealId, hubspotQuoteId: result.hubspotQuoteId }, undefined, { hubspotDealId: result.hubspotDealId, hubspotQuoteId: result.hubspotQuoteId, message: 'HubSpot quote updated (unified)' });
    } catch (error) {
      console.error('ERROR UPDATING HUBSPOT QUOTE:', error);
      return sendError(res, 'HUBSPOT_UPDATE_FAILED', 'Failed to update quote in HubSpot', 500);
    }
  });

  // GET /api/hubspot/oauth/callback
  app.get('/api/hubspot/oauth/callback', async (req, res) => {
    try {
      const { code, state } = (req.query || {}) as any;
      console.log('HubSpot OAuth callback received:', { code: code ? 'present' : 'missing', state });
      res.send(`
        <html>
          <body>
            <h1>HubSpot OAuth Callback</h1>
            <p>Authorization code received successfully.</p>
            <p>You can close this window and return to your app configuration.</p>
            <script>
              setTimeout(() => window.close(), 3000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send('OAuth callback failed');
    }
  });
}
