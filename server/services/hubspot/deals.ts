import type { HubSpotRequestFn } from './http.js';
import { cache, CacheTTL } from '../../cache.js';

export function createDealsService(
  request: HubSpotRequestFn,
  deps: {
    getSeedSalesPipelineStage: () => Promise<{ pipelineId: string; qualifiedStageId: string } | null>;
  }

) {
  async function searchDeals(query: {
    ids?: string[];
    ownerId?: string;
    limit?: number;
    properties?: string[];
    associations?: string[];
  }): Promise<any[]> {
    const properties = query.properties || [
      'dealname', 'dealstage', 'amount', 'pipeline', 'hubspot_owner_id',
      'closedate', 'createdate', 'hs_lastmodifieddate', 'hs_currency',
    ];
    const associations = query.associations || ['companies'];
    const limit = Math.min(Math.max(query.limit || 100, 1), 100);

    let results: any[] = [];

    if (query.ids && query.ids.length > 0) {
      if (query.ids.length === 1) {
        const id = query.ids[0];
        const resp = await request(`/crm/v3/objects/deals/${id}?properties=${encodeURIComponent(properties.join(','))}&associations=${encodeURIComponent(associations.join(','))}`, { method: 'GET' });
        if (resp) results = [resp];
      } else {
        try {
          const body = {
            filterGroups: [
              { filters: [{ propertyName: 'hs_object_id', operator: 'IN', values: query.ids }] },
            ],
            properties,
            associations,
            limit,
          } as any;
          const resp = await request('/crm/v3/objects/deals/search', { method: 'POST', body: JSON.stringify(body) });
          results = resp?.results || [];
        } catch (e) {
          const fetched: any[] = [];
          for (const id of query.ids.slice(0, limit)) {
            try {
              const r = await request(`/crm/v3/objects/deals/${id}?properties=${encodeURIComponent(properties.join(','))}&associations=${encodeURIComponent(associations.join(','))}`, { method: 'GET' });
              if (r) fetched.push(r);
            } catch {
              // ignore individual failures
            }
          }
          results = fetched;
        }
      }
    } else if (query.ownerId) {
      const body = {
        filterGroups: [
          { filters: [{ propertyName: 'hubspot_owner_id', operator: 'EQ', value: query.ownerId }] },
        ],
        properties,
        associations,
        limit,
      } as any;
      const resp = await request('/crm/v3/objects/deals/search', { method: 'POST', body: JSON.stringify(body) });
      results = resp?.results || [];
    } else {
      const resp = await request(`/crm/v3/objects/deals?limit=${limit}&properties=${encodeURIComponent(properties.join(','))}&associations=${encodeURIComponent(associations.join(','))}`, { method: 'GET' });
      results = Array.isArray(resp?.results) ? resp.results : [];
    }

    return results;
  }
  async function getDealsClosedInPeriod(
    startDate: string,
    endDate: string,
    salesRepHubspotId?: string,
  ): Promise<any[]> {
    const cacheKey = `hs:deals:closed:${startDate}:${endDate}:${salesRepHubspotId ?? 'all'}`;
    return await cache.wrap(
      cacheKey,
      async () => {
        const searchBody: any = {
          filterGroups: [
            {
              filters: [
                { propertyName: 'dealstage', operator: 'IN', values: ['closedwon', 'closed_won'] },
                { propertyName: 'closedate', operator: 'GTE', value: new Date(startDate).getTime().toString() },
                { propertyName: 'closedate', operator: 'LTE', value: new Date(endDate).getTime().toString() },
              ],
            },
          ],
          properties: [
            'dealname',
            'dealstage',
            'amount',
            'closedate',
            'hs_deal_stage_probability',
            'hubspot_owner_id',
            'deal_type',
            'description',
            'hs_object_id',
          ],
          limit: 100,
        };

        if (salesRepHubspotId) {
          searchBody.filterGroups[0].filters.push({
            propertyName: 'hubspot_owner_id', operator: 'EQ', value: salesRepHubspotId,
          });
        }

        const searchResult = await request('/crm/v3/objects/deals/search', {
          method: 'POST',
          body: JSON.stringify(searchBody),
        });

        const deals = searchResult?.results || [];
        const transformed = deals.map((deal: any) => {
          const props = deal.properties || {};
          const dealValue = parseFloat(props.amount || '0');
          const dealName = String(props.dealname || '').toLowerCase();

          let serviceType: 'recurring' | 'setup' | 'cleanup' | 'prior_years' = 'recurring';
          if (dealName.includes('setup') || dealName.includes('implementation')) {
            serviceType = 'setup';
          } else if (dealName.includes('cleanup') || dealName.includes('clean up')) {
            serviceType = 'cleanup';
          } else if (dealName.includes('prior year') || dealName.includes('catch up')) {
            serviceType = 'prior_years';
          }

          const monthlyValue = serviceType === 'recurring' ? dealValue / 12 : 0;
          const setupFee = serviceType !== 'recurring' ? dealValue : dealValue * 0.1;

          return {
            id: deal.id,
            dealname: props.dealname,
            amount: dealValue,
            monthly_value: monthlyValue,
            setup_fee: setupFee,
            service_type: serviceType,
            close_date: props.closedate,
            hubspot_owner_id: props.hubspot_owner_id,
            company: '',
            deal_stage: props.dealstage,
          };
        });

        return transformed;
      },
      { ttl: CacheTTL.HUBSPOT_DEALS },
    );
  }

  async function createDeal(
    contactId: string,
    companyName: string,
    monthlyFee: number,
    setupFee: number,
    ownerId?: string,
    includesBookkeeping?: boolean,
    includesTaas?: boolean,
    serviceTier?: string,
    quoteData?: any,
  ): Promise<{
    id: string;
    properties: { dealname: string; dealstage: string; amount?: string };
  } | null> {
    try {
      const services: string[] = [];
      if (includesBookkeeping || quoteData?.serviceBookkeeping || quoteData?.serviceMonthlyBookkeeping) services.push('Bookkeeping');
      if (includesTaas || quoteData?.serviceTaas || quoteData?.serviceTaasMonthly) services.push('TaaS');
      if (quoteData?.servicePayroll || quoteData?.servicePayrollService) services.push('Payroll');
      if (quoteData?.serviceApArLite || quoteData?.serviceApArService || quoteData?.serviceApLite || quoteData?.serviceApAdvanced) services.push('AP');
      if (quoteData?.serviceArService || quoteData?.serviceArLite || quoteData?.serviceArAdvanced) services.push('AR');
      if (quoteData?.serviceAgentOfService) services.push('Agent of Service');
      if (quoteData?.serviceCfoAdvisory) services.push('CFO Advisory');
      if (quoteData?.serviceFpaLite || quoteData?.serviceFpaBuild || quoteData?.serviceFpaSupport) services.push('FP&A');
      if (quoteData?.serviceCleanupProjects) services.push('Cleanup');
      if (quoteData?.servicePriorYearFilings) services.push('Prior Year Filings');
      if (services.length === 0) services.push('Services');

      const serviceName = services.join(' + ');
      const dealName = `${companyName} - ${serviceName}`;
      const totalAmount = (monthlyFee * 12 + setupFee).toString();

      const pipelineInfo = await deps.getSeedSalesPipelineStage();
      if (!pipelineInfo) {
        console.error('Could not find Seed Sales Pipeline or Qualified stage');
        return null;
      }

      const dealBody: any = {
        properties: {
          dealname: dealName,
          dealstage: pipelineInfo.qualifiedStageId,
          amount: totalAmount,
          pipeline: pipelineInfo.pipelineId,
          dealtype: 'newbusiness',
          ...(ownerId && { hubspot_owner_id: ownerId }),
          ...(quoteData?.entityType && {
            entity_type:
              quoteData.entityType === 'C-Corp' ? 'c-corp' :
              quoteData.entityType === 'S-Corp' ? 's-corp' :
              quoteData.entityType === 'Sole Proprietor' ? 'sole_prop' :
              quoteData.entityType === 'Partnership' ? 'partnership' :
              quoteData.entityType === 'Non-Profit' ? 'non-profit' :
              String(quoteData.entityType).toLowerCase().replace('-', '_'),
          }),
          ...(quoteData?.serviceTier && {
            service_tier:
              quoteData.serviceTier === 'Automated' ? 'Level 1 - Automated' :
              quoteData.serviceTier === 'Guided' ? 'Level 2 - Guided' :
              quoteData.serviceTier === 'Concierge' ? 'Level 3 - Concierge' :
              'Level 1 - Automated',
          }),
          ...(quoteData?.numEntities && { number_of_entities: String(quoteData.numEntities) }),
          ...(quoteData?.statesFiled && { number_of_state_filings: String(quoteData.statesFiled) }),
          ...(quoteData?.numBusinessOwners && { number_of_owners_partners: String(quoteData.numBusinessOwners) }),
          ...(quoteData?.cleanupMonths && { initial_clean_up_months: String(quoteData.cleanupMonths) }),
          ...(quoteData?.priorYearsUnfiled && { prior_years_unfiled: String(quoteData.priorYearsUnfiled) }),
          ...(quoteData?.include1040s !== undefined && { include_personal_1040s: quoteData.include1040s ? 'true' : 'false' }),
          ...(quoteData?.internationalFiling !== undefined && { international_filing: quoteData.internationalFiling ? 'true' : 'false' }),
          ...(quoteData?.businessLoans !== undefined && { business_loans: quoteData.businessLoans ? 'true' : 'false' }),
          ...(quoteData?.accountingBasis && {
            accounting_basis:
              quoteData.accountingBasis === 'Cash' ? 'cash' :
              quoteData.accountingBasis === 'Accrual' ? 'accrual' :
              String(quoteData.accountingBasis).toLowerCase(),
          }),
          ...(quoteData?.currentBookkeepingSoftware && { current_bookkeeping_software: quoteData.currentBookkeepingSoftware }),
          ...(quoteData?.primaryBank && { primary_bank: quoteData.primaryBank }),
        },
        associations: [
          {
            to: { id: contactId },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }],
          },
        ],
      };

      const result = await request('/crm/v3/objects/deals', {
        method: 'POST',
        body: JSON.stringify(dealBody),
      });

      if (!result || !result.id) {
        console.error('Deal creation failed - no ID returned.', result);
        throw new Error(`Deal creation failed: No ID returned from HubSpot. Response: ${JSON.stringify(result)}`);
      }

      return {
        id: result.id,
        properties: {
          dealname: result.properties?.dealname || dealName,
          dealstage: result.properties?.dealstage || 'qualified',
          amount: result.properties?.amount || totalAmount,
        },
      };
    } catch (error) {
      console.error('Error creating deal in HubSpot:', error);
      return null;
    }
  }

  async function updateDeal(
    dealId: string,
    monthlyFee: number,
    setupFee: number,
    ownerId?: string,
    includesBookkeeping?: boolean,
    includesTaas?: boolean,
    serviceTier?: string,
    quoteData?: any,
  ): Promise<{
    id: string;
    properties: { dealname: string; dealstage: string; amount?: string };
  } | null> {
    try {
      const totalAmount = (monthlyFee * 12 + setupFee).toString();

      const updateBody: any = {
        properties: {
          amount: totalAmount,
          ...(ownerId && { hubspot_owner_id: ownerId }),
          monthly_recurring_revenue: String(monthlyFee),
          setup_fee: String(setupFee),
          setup_fee_rounded: String(Math.round(setupFee)),
          includes_bookkeeping: includesBookkeeping ? 'true' : 'false',
          includes_taas: includesTaas ? 'true' : 'false',
          service_tier: serviceTier || 'Standard',
          ...(quoteData?.servicePayroll !== undefined && { includes_payroll: quoteData.servicePayroll ? 'true' : 'false' }),
          ...(quoteData?.serviceApLite !== undefined && { includes_ap: quoteData.serviceApLite ? 'true' : 'false' }),
          ...(quoteData?.serviceArLite !== undefined && { includes_ar: quoteData.serviceArLite ? 'true' : 'false' }),
          ...(quoteData?.serviceAgentOfService !== undefined && { includes_agent_of_service: quoteData.serviceAgentOfService ? 'true' : 'false' }),
          ...(quoteData?.serviceCfoAdvisory !== undefined && { includes_cfo_advisory: quoteData.serviceCfoAdvisory ? 'true' : 'false' }),
          ...(quoteData?.companyName && { company_name: quoteData.companyName }),
          ...(quoteData?.annualRevenue && { annual_revenue: quoteData.annualRevenue }),
          ...(quoteData?.numberOfEmployees && { number_of_employees: quoteData.numberOfEmployees }),
          ...(quoteData?.accountingBasis && {
            accounting_basis:
              quoteData.accountingBasis === 'Cash' ? 'cash' :
              quoteData.accountingBasis === 'Accrual' ? 'accrual' :
              String(quoteData.accountingBasis).toLowerCase(),
          }),
        },
      };

      const result = await request(`/crm/v3/objects/deals/${dealId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateBody),
      });

      if (!result || !result.id) {
        console.error('Deal update failed - no ID returned.', result);
        throw new Error(`Deal update failed: No ID returned from HubSpot. Response: ${JSON.stringify(result)}`);
      }

      return {
        id: result.id,
        properties: {
          dealname: result.properties?.dealname || 'Updated Deal',
          dealstage: result.properties?.dealstage || 'qualified',
          amount: result.properties?.amount || totalAmount,
        },
      };
    } catch (error) {
      console.error('Error updating deal in HubSpot:', error);
      return null;
    }
  }

  return {
    createDeal,
    updateDeal,
    searchDeals,
    getDealsClosedInPeriod,
  };
}
