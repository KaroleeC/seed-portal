// Minimal HubSpot facade (P0): delegates to existing HubSpotService
// This establishes the hub-and-spoke pattern without risky rewrites.

export async function getPaidInvoicesInPeriod(
  startDate: string,
  endDate: string,
  salesRepHubspotId?: string
): Promise<any[]> {
  const { hubSpotService } = await import('../../hubspot.js');
  if (!hubSpotService) return [];
  return hubSpotService.getPaidInvoicesInPeriod(startDate, endDate, salesRepHubspotId);
}

export async function getInvoiceLineItems(invoiceId: string): Promise<any[]> {
  const { hubSpotService } = await import('../../hubspot.js');
  if (!hubSpotService) return [];
  return hubSpotService.getInvoiceLineItems(invoiceId);
}
