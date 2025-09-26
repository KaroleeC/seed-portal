// Cache pre-warming functionality
import { Queue } from "bullmq";
import { cache, CachePrefix, CacheTTL } from "./cache";
import { getRedis } from "./redis";
import { logger } from "./logger";
import { clientIntelEngine } from "./client-intel";

const preWarmLogger = logger.child({ module: "cache-prewarming" });

let preWarmQueue: Queue | null = null;

export async function initializePreWarmQueue(): Promise<void> {
  if (!process.env.REDIS_URL) {
    preWarmLogger.info(
      "No REDIS_URL found, skipping pre-warm queue initialization",
    );
    return;
  }

  try {
    const { getRedisAsync } = await import("./redis.js");
    const redisConfig = await getRedisAsync();

    if (!redisConfig?.queueRedis) {
      preWarmLogger.warn("Redis queue not available for pre-warm queue");
      return;
    }

    preWarmQueue = new Queue("cache-prewarming", {
      connection: redisConfig.queueRedis,
      defaultJobOptions: {
        removeOnComplete: 5,
        removeOnFail: 10,
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      },
    });

    preWarmLogger.info("✅ Cache pre-warming queue initialized");
  } catch (error) {
    preWarmLogger.error({ error }, "❌ Failed to initialize pre-warm queue");
  }
}

export function getPreWarmQueue(): Queue | null {
  return preWarmQueue;
}

/**
 * Schedule nightly cache pre-warming for top contacts
 */
export async function scheduleNightlyPreWarm(): Promise<void> {
  if (!preWarmQueue) {
    preWarmLogger.warn("Pre-warm queue not available");
    return;
  }

  try {
    // Schedule for 2 AM daily
    await preWarmQueue.add(
      "nightly-prewarm",
      {
        timestamp: Date.now(),
      },
      {
        repeat: { pattern: "0 2 * * *" }, // 2 AM daily
        jobId: "nightly-prewarm", // Prevent duplicates
      },
    );

    preWarmLogger.info("✅ Scheduled nightly cache pre-warming");
  } catch (error) {
    preWarmLogger.error({ error }, "Failed to schedule nightly pre-warming");
  }
}

/**
 * Pre-warm cache for high-priority contacts
 */
export async function preWarmHighPriorityContacts(): Promise<void> {
  preWarmLogger.info("Starting cache pre-warming for high-priority contacts");

  try {
    // Import HubSpot service dynamically to avoid circular deps
    const { hubSpotService } = await import("./hubspot");

    if (!hubSpotService) {
      preWarmLogger.warn("HubSpot service not available for pre-warming");
      return;
    }

    // Get top contacts by recent activity using searchContacts and take first 50
    const contacts = await hubSpotService.searchContacts("", undefined);
    const topContacts = (contacts || []).slice(0, 50);

    if (!topContacts.length) {
      preWarmLogger.warn("No contacts found for pre-warming");
      return;
    }

    let preWarmedCount = 0;

    for (const contact of topContacts) {
      try {
        const contactId = contact.id;

        // Check if already cached
        const cacheKey = cache.generateKey(
          CachePrefix.OPENAI_ANALYSIS,
          contactId,
        );
        const existing = await cache.get(cacheKey);

        if (existing) {
          continue; // Skip if already cached
        }

        // Pre-warm contact data
        const clientData = {
          companyName: contact.properties.company || "Unknown Company",
          industry: contact.properties.industry || null,
          revenue: contact.properties.annualrevenue,
          employees: parseInt(contact.properties.numemployees) || undefined,
          lifecycleStage: contact.properties.lifecyclestage || "lead",
          services: await clientIntelEngine.getContactServices(contactId),
          hubspotProperties: contact.properties,
          lastActivity: contact.properties.lastmodifieddate,
          recentActivities: [],
        };

        // Generate and cache AI insights
        const [painPoints, serviceGaps, riskScore] = await Promise.all([
          clientIntelEngine.extractPainPoints(clientData),
          clientIntelEngine.detectServiceGaps(clientData),
          clientIntelEngine.calculateRiskScore(clientData),
        ]);

        const insights = {
          painPoints,
          upsellOpportunities: serviceGaps,
          riskScore,
          lastAnalyzed: new Date().toISOString(),
          signals: serviceGaps,
        };

        // Cache the insights
        await cache.set(cacheKey, insights, CacheTTL.OPENAI_ANALYSIS);
        preWarmedCount++;

        preWarmLogger.debug(
          { contactId, company: clientData.companyName },
          "Pre-warmed contact insights",
        );

        // Add small delay to avoid overwhelming OpenAI API
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (contactError) {
        preWarmLogger.error(
          { error: contactError, contactId: contact.id },
          "Failed to pre-warm contact",
        );
      }
    }

    preWarmLogger.info(
      { preWarmedCount, totalContacts: topContacts.length },
      "✅ Cache pre-warming completed",
    );
  } catch (error) {
    preWarmLogger.error({ error }, "Cache pre-warming failed");
  }
}

/**
 * Pre-warm dashboard metrics cache
 */
export async function preWarmDashboardMetrics(): Promise<void> {
  try {
    preWarmLogger.info("Pre-warming dashboard metrics cache");

    // Import dynamically to avoid circular deps
    const { hubSpotService } = await import("./hubspot");

    if (!hubSpotService) {
      return;
    }

    // Pre-warm key dashboard data by touching available endpoints
    await Promise.all([
      hubSpotService.getPipelines(),
      hubSpotService.getDeals({
        limit: 50,
        properties: ["dealname", "dealstage", "amount"],
        associations: ["companies"],
      }),
    ]);

    preWarmLogger.info("✅ Dashboard metrics pre-warmed");
  } catch (error) {
    preWarmLogger.error({ error }, "Failed to pre-warm dashboard metrics");
  }
}
