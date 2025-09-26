/**
 * Geocoding Service (Nominatim/OpenStreetMap Implementation)
 *
 * This is the "doorway" file for our geocoding integration.
 * If we ever switch providers, we only need to rewrite this file.
 */

import { cache } from "../cache";
import { logger } from "../logger";
import type { ServiceHealthResult } from "./index";

export interface GeocodingResult {
  address: string;
  latitude: number;
  longitude: number;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export class GeocodingService {
  private readonly baseUrl = "https://nominatim.openstreetmap.org";
  private readonly CACHE_TTL = 24 * 60 * 60; // 24 hours
  private readonly userAgent = "SeedFinancial/1.0";

  async healthCheck(): Promise<ServiceHealthResult> {
    const startTime = Date.now();
    try {
      // Simple health check - geocode a known address
      const response = await fetch(
        `${this.baseUrl}/search?q=New York&format=json&limit=1`,
        {
          headers: {
            "User-Agent": this.userAgent,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return {
        status: "healthy",
        responseTime: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error("Geocoding health check failed", { error: error.message });

      return {
        status: "unhealthy",
        message: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  async searchAddresses(query: string, limit = 5): Promise<GeocodingResult[]> {
    const cacheKey = `geocoding:search:${this.hashString(query)}:${limit}`;

    try {
      // Check cache first
      const cached = await cache.get<GeocodingResult[]>(cacheKey);
      if (cached) {
        logger.debug("Geocoding search cache hit", { query });
        return cached;
      }

      logger.debug("Geocoding search", { query, limit });

      const response = await fetch(
        `${this.baseUrl}/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=1`,
        {
          headers: {
            "User-Agent": this.userAgent,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Geocoding API returned ${response.status}`);
      }

      const data = await response.json();

      const results: GeocodingResult[] = data.map((item: any) => ({
        address: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        city: item.address?.city || item.address?.town || item.address?.village,
        state: item.address?.state,
        country: item.address?.country,
        postalCode: item.address?.postcode,
      }));

      // Cache the result
      await cache.set(cacheKey, JSON.stringify(results), this.CACHE_TTL);
      return results;
    } catch (error: any) {
      logger.error("Geocoding search failed", { query, error: error.message });
      throw new Error(`Geocoding search failed: ${error.message}`);
    }
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<GeocodingResult | null> {
    const cacheKey = `geocoding:reverse:${latitude}:${longitude}`;

    try {
      // Check cache first
      const cached = await cache.get<GeocodingResult | null>(cacheKey);
      if (cached) {
        logger.debug("Reverse geocoding cache hit", { latitude, longitude });
        return cached;
      }

      logger.debug("Reverse geocoding", { latitude, longitude });

      const response = await fetch(
        `${this.baseUrl}/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
        {
          headers: {
            "User-Agent": this.userAgent,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding API returned ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.error) {
        return null;
      }

      const result: GeocodingResult = {
        address: data.display_name,
        latitude,
        longitude,
        city: data.address?.city || data.address?.town || data.address?.village,
        state: data.address?.state,
        country: data.address?.country,
        postalCode: data.address?.postcode,
      };

      // Cache the result
      await cache.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
      return result;
    } catch (error: any) {
      logger.error("Reverse geocoding failed", {
        latitude,
        longitude,
        error: error.message,
      });
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}
