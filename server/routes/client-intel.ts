import { Router } from "express";
import { requireAuth } from "../middleware/supabase-auth";
import { getErrorMessage } from "../utils/error-handling";
import { cache, CacheTTL, CachePrefix } from "../cache";
import { clientIntelEngine } from "../client-intel";
import { hubSpotService } from "../hubspot";
import { searchRateLimit, enhancementRateLimit } from "../middleware/rate-limiter";

const router = Router();

router.get("/api/client-intel/search", requireAuth, searchRateLimit, async (req: any, res) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 3) {
      return res.json([]);
    }

    const userEmail = (req as any).user?.email;
    console.log(`[Search] Searching for: "${query}" by user: ${userEmail}`);

    let results: any[] | undefined;
    try {
      const cacheKey = cache.generateKey(CachePrefix.HUBSPOT_CONTACT, { query, userEmail });
      results = await cache.wrap(
        cacheKey,
        () => clientIntelEngine.searchHubSpotContacts(query, userEmail),
        { ttl: CacheTTL.HUBSPOT_CONTACT }
      );
    } catch (cacheError) {
      console.log("[Search] Cache unavailable, searching directly:", getErrorMessage(cacheError));
      results = await clientIntelEngine.searchHubSpotContacts(query, userEmail);
    }

    console.log(`[Search] Found ${results?.length || 0} results`);
    res.json(results || []);
  } catch (error) {
    console.error("Client search error:", error);
    res.status(500).json({ message: "Search failed", error: getErrorMessage(error) });
  }
});

router.post(
  "/api/client-intel/enhance/:contactId",
  requireAuth,
  enhancementRateLimit,
  async (req: any, res) => {
    const { contactId } = req.params;
    if (!contactId) {
      return res.status(400).json({ error: "Contact ID required" });
    }

    try {
      if (!hubSpotService) {
        return res.status(500).json({ error: "HubSpot service not available" });
      }

      const contact = await hubSpotService.getContactById(contactId);
      if (!contact) {
        return res.status(404).json({ error: "Contact not found" });
      }

      await clientIntelEngine.searchHubSpotContacts(
        contact.properties?.email || contact.properties?.company || "",
        req.user?.email
      );

      const companyName = contact.properties?.company;
      const { airtableService } = await import("../airtable.js");
      const airtableData = companyName
        ? await airtableService.getEnrichedCompanyData(companyName, contact.properties?.email)
        : null;

      res.json({ success: true, message: "Contact data enhanced successfully", airtableData });
    } catch (error) {
      console.error("Data enhancement error:", error);
      res.status(500).json({ error: "Enhancement failed" });
    }
  }
);

router.post("/api/client-intel/generate-insights", requireAuth, async (req: any, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ message: "Client ID is required" });
    }

    const cacheKey = cache.generateKey(CachePrefix.OPENAI_ANALYSIS, clientId);
    const cachedInsights = await cache.get(cacheKey);
    if (cachedInsights) {
      console.log("Cache hit - returning cached insights for client:", clientId);
      return res.json(cachedInsights);
    }

    const jobStatusKey = `job:insights:${clientId}`;
    const existingJobId = await cache.get<string>(jobStatusKey);

    if (existingJobId) {
      const mod: any = await import("../queue.js");
      const getAIInsightsQueue = mod.getAIInsightsQueue as any;
      const aiInsightsQueue =
        typeof getAIInsightsQueue === "function" ? getAIInsightsQueue() : null;
      let job: any = null;
      if (aiInsightsQueue) {
        job = await aiInsightsQueue.getJob(existingJobId);
      }
      if (job && (await job.getState()) === "active") {
        return res.json({
          status: "processing",
          progress: job.progress,
          jobId: existingJobId,
          message: "AI insights are being generated. Check back shortly.",
        });
      }
    }

    let clientData: any = {};
    try {
      if (hubSpotService) {
        const contact = await hubSpotService.getContactById(clientId);
        if (contact) {
          clientData = {
            companyName: contact.properties.company || "Unknown Company",
            industry: contact.properties.industry || null,
            revenue: contact.properties.annualrevenue,
            employees: parseInt(contact.properties.numemployees) || undefined,
            lifecycleStage: contact.properties.lifecyclestage || "lead",
            services: await clientIntelEngine.getContactServices(clientId),
            hubspotProperties: contact.properties,
            lastActivity: contact.properties.lastmodifieddate,
            recentActivities: [],
          };
        }
      }
    } catch (hubspotError) {
      console.error("HubSpot data fetch failed:", hubspotError);
    }

    const mod: any = await import("../queue.js");
    const getAIInsightsQueue = mod.getAIInsightsQueue as any;
    const aiInsightsQueue = typeof getAIInsightsQueue === "function" ? getAIInsightsQueue() : null;
    if (!aiInsightsQueue) {
      return res.status(503).json({ message: "Queue service unavailable" });
    }

    const job = await aiInsightsQueue.add(
      "generate-insights",
      { contactId: clientId, clientData, userId: req.user?.id || 0, timestamp: Date.now() },
      { priority: 1, delay: 0 }
    );

    await cache.set(jobStatusKey, job.id, 300);

    console.log(`[Queue] 🔄 Queued AI insights job ${job.id} for client ${clientId}`);

    res.json({
      status: "queued",
      jobId: job.id,
      progress: 0,
      message: "AI insights queued for processing. Check back shortly.",
    });
  } catch (error) {
    console.error("Insight generation error:", error);
    res.status(500).json({ message: "Failed to generate insights" });
  }
});

export default router;
