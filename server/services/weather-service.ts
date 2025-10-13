/**
 * Weather Service (Open-Meteo Implementation)
 *
 * This is the "doorway" file for our weather integration.
 * If we ever switch providers, we only need to rewrite this file.
 */

import { cache } from "../cache";
import { logger } from "../logger";
import type { ServiceHealthResult } from "./index";

export interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  location: string;
}

export class WeatherService {
  private readonly baseUrl = "https://api.open-meteo.com/v1";
  private readonly CACHE_TTL = 10 * 60; // 10 minutes

  async healthCheck(): Promise<ServiceHealthResult> {
    const startTime = Date.now();
    try {
      // Simple health check - get weather for a known location
      const response = await fetch(
        `${this.baseUrl}/forecast?latitude=40.7128&longitude=-74.0060&current=temperature_2m`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return {
        status: "healthy",
        responseTime: Date.now() - startTime,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ error: message }, "Weather health check failed");

      return {
        status: "unhealthy",
        message,
        responseTime: Date.now() - startTime,
      };
    }
  }

  async getCurrentWeather(
    latitude: number,
    longitude: number,
    location: string
  ): Promise<WeatherData> {
    const cacheKey = `weather:${latitude}:${longitude}`;

    try {
      // Check cache first
      const cached = await cache.get<WeatherData>(cacheKey);
      if (cached) {
        logger.debug({ location }, "Weather cache hit");
        return cached;
      }

      logger.debug({ location, latitude, longitude }, "Weather API call");

      const response = await fetch(
        `${this.baseUrl}/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
      );

      if (!response.ok) {
        throw new Error(`Weather API returned ${response.status}`);
      }

      const data = await response.json();
      const current = data.current;

      const weatherData: WeatherData = {
        temperature: Math.round(current.temperature_2m),
        description: this.getWeatherDescription(current.weather_code),
        humidity: current.relative_humidity_2m,
        windSpeed: Math.round(current.wind_speed_10m * 10) / 10,
        location,
      };

      // Cache the result
      await cache.set(cacheKey, JSON.stringify(weatherData), this.CACHE_TTL);
      return weatherData;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ location, error: message }, "Weather lookup failed");
      throw new Error(`Weather lookup failed: ${message}`);
    }
  }

  private getWeatherDescription(code: number): string {
    const descriptions: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Light rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Light snow",
      73: "Moderate snow",
      75: "Heavy snow",
      95: "Thunderstorm",
    };

    return descriptions[code] || "Unknown";
  }
}
