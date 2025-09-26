/**
 * Central Service Registry
 *
 * This file registers all external service integrations in one place.
 * Any page, API route, or background job can import services from here.
 */

import { CRMService } from "./crm-service";
import { StorageService } from "./storage-service";
import { AIService } from "./ai-service";
import { WeatherService } from "./weather-service";
import { GeocodingService } from "./geocoding-service";

// Service instances - initialized once and shared across the application
export const crmService = new CRMService();
export const storageService = new StorageService();
export const aiService = new AIService();
export const weatherService = new WeatherService();
export const geocodingService = new GeocodingService();

// Health check for all services
export async function checkServicesHealth(): Promise<{
  healthy: boolean;
  services: Record<
    string,
    { status: "healthy" | "unhealthy" | "degraded"; message?: string }
  >;
}> {
  const services = {
    crm: await crmService.healthCheck(),
    storage: await storageService.healthCheck(),
    ai: await aiService.healthCheck(),
    weather: await weatherService.healthCheck(),
    geocoding: await geocodingService.healthCheck(),
  };

  // Overall healthy if no service is strictly 'unhealthy'.
  // 'degraded' is acceptable (e.g., disabled in dev).
  const healthy = Object.values(services).every(
    (service) => service.status !== "unhealthy",
  );

  return { healthy, services };
}

// Service types for type safety
export type ServiceStatus = "healthy" | "unhealthy" | "degraded";
export interface ServiceHealthResult {
  status: ServiceStatus;
  message?: string;
  responseTime?: number;
}
