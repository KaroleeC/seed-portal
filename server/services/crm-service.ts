/**
 * CRM Service (HubSpot Implementation)
 *
 * This is the "doorway" file for our CRM integration.
 * If we ever switch from HubSpot to another CRM, we only need to rewrite this file.
 * All CRM operations go through this abstraction layer.
 */

import { Client } from "@hubspot/api-client";
import { cache } from "../cache";
import { logger } from "../logger";
import type { ServiceHealthResult } from "./index";

export interface CRMContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  industry?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  hubspotId?: string; // Internal vendor ID
  verified: boolean;
}

export interface CRMDeal {
  id: string;
  name: string;
  amount?: number;
  stage?: string;
  contactId: string;
  hubspotId?: string; // Internal vendor ID
}

export interface CRMContactSearchResult {
  contacts: CRMContact[];
  total: number;
}

export class CRMService {
  private client: Client;
  private readonly CACHE_TTL = {
    CONTACT: 15 * 60, // 15 minutes
    SEARCH: 5 * 60, // 5 minutes
    DEALS: 5 * 60, // 5 minutes
  };

  constructor() {
    const crmDisabled =
      process.env.DISABLE_CRM === "1" ||
      (process.env.DISABLE_CRM || "").toLowerCase() === "true";
    if (crmDisabled) {
      logger.info("CRM service disabled via DISABLE_CRM flag");
      this.client = null as any;
      return;
    }

    const apiKey = process.env.HUBSPOT_ACCESS_TOKEN;
    logger.debug("CRM Service initialized with HUBSPOT_ACCESS_TOKEN");

    if (!apiKey) {
      logger.warn(
        "HUBSPOT_ACCESS_TOKEN not found in environment variables - CRM service will be disabled",
      );
      // Don't throw error - allow service to be created but mark as unavailable
      this.client = null as any;
      return;
    }

    this.client = new Client({ accessToken: apiKey });
    logger.debug("CRM Client created successfully with HubSpot SDK");
  }

  async healthCheck(): Promise<ServiceHealthResult> {
    const startTime = Date.now();

    if (!this.client) {
      return {
        status: "degraded",
        message: process.env.DISABLE_CRM
          ? "CRM disabled via DISABLE_CRM"
          : "CRM service not configured - missing HUBSPOT_ACCESS_TOKEN",
        responseTime: Date.now() - startTime,
      };
    }

    try {
      // Simple health check - try to get contacts (limited to 1)
      await this.client.crm.contacts.basicApi.getPage(1);
      return {
        status: "healthy",
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error("CRM health check failed", { error: error.message });

      if (error.code === 429) {
        return { status: "degraded", message: "Rate limited" };
      }

      return {
        status: "unhealthy",
        message: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  async findContactByEmail(email: string): Promise<CRMContact | null> {
    if (!this.client) {
      logger.warn("CRM service not configured, skipping contact lookup", {
        email,
      });
      return null;
    }

    const cacheKey = `crm:contact:${this.hashEmail(email)}`;

    try {
      // Check cache first
      const cached = await cache.get<CRMContact>(cacheKey);
      if (cached) {
        logger.debug("CRM contact cache hit", { email });
        return cached;
      }

      logger.debug("CRM contact lookup", { email });

      const response = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ" as any,
                value: email,
              },
            ],
          },
        ],
        properties: [
          "email",
          "firstname",
          "lastname",
          "company",
          "industry",
          "phone",
          "address",
          "city",
          "state",
          "zip",
          "country",
        ],
        limit: 1,
      });

      if (response.results && response.results.length > 0) {
        const hubspotContact = response.results[0]! as any;
        const contact: CRMContact = {
          id: `crm_${hubspotContact.id}`,
          email: hubspotContact.properties.email || email,
          firstName: hubspotContact.properties.firstname || undefined,
          lastName: hubspotContact.properties.lastname || undefined,
          companyName: hubspotContact.properties.company || undefined,
          industry: hubspotContact.properties.industry || undefined,
          phone: hubspotContact.properties.phone || undefined,
          address: {
            street: hubspotContact.properties.address || undefined,
            city: hubspotContact.properties.city || undefined,
            state: hubspotContact.properties.state || undefined,
            zipCode: hubspotContact.properties.zip || undefined,
            country: hubspotContact.properties.country || undefined,
          },
          hubspotId: hubspotContact.id,
          verified: true,
        };

        // Cache the result
        await cache.set(
          cacheKey,
          JSON.stringify(contact),
          this.CACHE_TTL.CONTACT,
        );
        return contact;
      }

      return null;
    } catch (error: any) {
      logger.error("CRM contact lookup failed", {
        email,
        error: error.message,
      });

      // If rate limited, don't throw - return null but log to Sentry
      if (error.code === 429) {
        logger.warn("CRM rate limit hit during contact lookup", { email });
        return null;
      }

      throw new Error(`CRM lookup failed: ${error.message}`);
    }
  }

  async searchContacts(
    query: string,
    limit = 20,
  ): Promise<CRMContactSearchResult> {
    if (!this.client) {
      logger.warn("CRM service not configured, skipping contact search", {
        query,
      });
      return { contacts: [], total: 0 };
    }

    const cacheKey = `crm:search:${query}:${limit}`;

    try {
      // Check cache first
      const cached = await cache.get<CRMContactSearchResult>(cacheKey);
      if (cached) {
        logger.debug("CRM search cache hit", { query });
        return cached;
      }

      logger.debug("CRM contact search", { query, limit });

      const response = await this.client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "CONTAINS_TOKEN" as any,
                value: query,
              },
            ],
          },
        ],
        properties: ["email", "firstname", "lastname", "company", "industry"],
        limit,
      });

      const contacts: CRMContact[] = (response.results || []).map(
        (hubspotContact) => ({
          id: `crm_${hubspotContact.id}`,
          email: hubspotContact.properties.email || "",
          firstName: hubspotContact.properties.firstname || undefined,
          lastName: hubspotContact.properties.lastname || undefined,
          companyName: hubspotContact.properties.company || undefined,
          industry: hubspotContact.properties.industry || undefined,
          hubspotId: hubspotContact.id,
          verified: true,
        }),
      );

      const result = { contacts, total: response.total || 0 };

      // Cache the result
      await cache.set(cacheKey, JSON.stringify(result), this.CACHE_TTL.SEARCH);
      return result;
    } catch (error: any) {
      logger.error("CRM contact search failed", {
        query,
        error: error.message,
      });

      if (error.code === 429) {
        logger.warn("CRM rate limit hit during search", { query });
        return { contacts: [], total: 0 };
      }

      throw new Error(`CRM search failed: ${error.message}`);
    }
  }

  async updateContact(
    contactId: string,
    updates: Partial<CRMContact>,
  ): Promise<CRMContact> {
    if (!this.client) {
      throw new Error("CRM service not configured");
    }

    try {
      // Extract HubSpot ID from our contact ID
      const hubspotId = contactId.startsWith("crm_")
        ? contactId.slice(4)
        : contactId;

      // Map our fields to HubSpot properties
      const properties: any = {};
      if (updates.firstName !== undefined)
        properties.firstname = updates.firstName;
      if (updates.lastName !== undefined)
        properties.lastname = updates.lastName;
      if (updates.companyName !== undefined)
        properties.company = updates.companyName;
      if (updates.industry !== undefined)
        properties.industry = updates.industry;
      if (updates.phone !== undefined) properties.phone = updates.phone;
      if (updates.address?.street !== undefined)
        properties.address = updates.address.street;
      if (updates.address?.city !== undefined)
        properties.city = updates.address.city;
      if (updates.address?.state !== undefined)
        properties.state = updates.address.state;
      if (updates.address?.zipCode !== undefined)
        properties.zip = updates.address.zipCode;
      if (updates.address?.country !== undefined)
        properties.country = updates.address.country;

      const response = await this.client.crm.contacts.basicApi.update(
        hubspotId,
        { properties },
      );

      // Clear cache for this contact
      if (updates.email) {
        const cacheKey = `crm:contact:${this.hashEmail(updates.email)}`;
        await cache.del(cacheKey);
      }

      return {
        id: `crm_${response.id}`,
        email: response.properties.email || updates.email || "",
        firstName: response.properties.firstname || undefined,
        lastName: response.properties.lastname || undefined,
        companyName: response.properties.company || undefined,
        industry: response.properties.industry || undefined,
        phone: response.properties.phone || undefined,
        address: {
          street: response.properties.address || undefined,
          city: response.properties.city || undefined,
          state: response.properties.state || undefined,
          zipCode: response.properties.zip || undefined,
          country: response.properties.country || undefined,
        },
        hubspotId: response.id,
        verified: true,
      };
    } catch (error: any) {
      logger.error("CRM contact update failed", {
        contactId,
        error: error.message,
      });
      throw new Error(`CRM update failed: ${error.message}`);
    }
  }

  private hashEmail(email: string): string {
    // Simple hash for cache keys (not cryptographic)
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  // Clear cache on data mutations
  async invalidateCache(email?: string): Promise<void> {
    try {
      if (email) {
        const cacheKey = `crm:contact:${this.hashEmail(email)}`;
        await cache.del(cacheKey);
        logger.debug("CRM cache invalidated for contact", { email });
      } else {
        // Clear all CRM cache
        await cache.del("crm:");
        logger.debug("All CRM cache invalidated");
      }
    } catch (error: any) {
      logger.warn("CRM cache invalidation failed", { error: error.message });
    }
  }
}
