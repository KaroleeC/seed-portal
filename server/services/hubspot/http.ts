// Reusable HubSpot HTTP client wrapper
// Keeps consistent error handling, rate limit retry, and empty-response handling
// Optimized with keep-alive, timeouts, and smart retries

import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";

export type HubSpotRequestFn = (endpoint: string, options?: RequestInit) => Promise<any>;

interface ConnectionStats {
  requests: number;
  errors: number;
  retries: number;
  timeouts: number;
  activeConnections: number;
}

export class HubSpotHttpClient {
  private baseUrl: string;
  private accessToken: string;
  private httpsAgent: HttpsAgent;
  private stats: ConnectionStats;

  constructor(accessToken: string, baseUrl = "https://api.hubapi.com") {
    if (!accessToken) throw new Error("HubSpot access token required");
    this.accessToken = accessToken;
    this.baseUrl = baseUrl;

    // Keep-alive agent for connection pooling
    this.httpsAgent = new HttpsAgent({
      keepAlive: true,
      keepAliveMsecs: 30000, // 30 seconds
      maxSockets: 50, // Max concurrent connections
      maxFreeSockets: 10, // Keep 10 idle sockets
      timeout: 60000, // Socket timeout: 60s
      scheduling: "lifo", // Last-in-first-out (reuse recent connections)
    });

    // Connection statistics
    this.stats = {
      requests: 0,
      errors: 0,
      retries: 0,
      timeouts: 0,
      activeConnections: 0,
    };
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    this.stats.requests++;
    this.stats.activeConnections++;

    const startTime = Date.now();

    try {
      const response = await this.requestWithRetry(endpoint, options);
      return response;
    } finally {
      this.stats.activeConnections--;
      const duration = Date.now() - startTime;

      // Log slow requests (> 5s)
      if (duration > 5000) {
        console.warn(`[HubSpot HTTP] Slow request: ${endpoint} took ${duration}ms`);
      }
    }
  }

  private async requestWithRetry(
    endpoint: string,
    options: RequestInit = {},
    attempt: number = 1,
    maxAttempts: number = 3
  ): Promise<any> {
    const doFetch = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
            ...(options.headers || {}),
          },
          signal: controller.signal,
          // @ts-ignore - Node.js fetch supports agent
          agent: this.httpsAgent,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === "AbortError") {
          this.stats.timeouts++;
          throw new Error(`HubSpot API timeout after 30s: ${endpoint}`);
        }
        throw error;
      }
    };

    try {
      const response = await doFetch();

      if (!response.ok) {
        const errorText = await response.text();

        // Retry on rate limit (429) or server errors (5xx)
        if ((response.status === 429 || response.status >= 500) && attempt < maxAttempts) {
          this.stats.retries++;

          // Exponential backoff with cap: 1s, 2s, 4s (max)
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000);

          console.log(
            `[HubSpot HTTP] Retry ${attempt}/${maxAttempts} after ${backoffMs}ms for ${endpoint} (status: ${response.status})`
          );

          await new Promise((r) => setTimeout(r, backoffMs));
          return this.requestWithRetry(endpoint, options, attempt + 1, maxAttempts);
        }

        this.stats.errors++;
        throw new Error(
          `HubSpot API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const contentType = response.headers.get("content-type");
      const contentLength = response.headers.get("content-length");
      if (
        response.status === 204 ||
        contentLength === "0" ||
        !contentType?.includes("application/json")
      ) {
        return null;
      }

      return response.json();
    } catch (error: any) {
      // Retry on network errors (but not on timeout or API errors)
      if (
        attempt < maxAttempts &&
        !error.message.includes("timeout") &&
        !error.message.includes("API error")
      ) {
        this.stats.retries++;

        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
        console.log(
          `[HubSpot HTTP] Network error, retry ${attempt}/${maxAttempts} after ${backoffMs}ms: ${error.message}`
        );

        await new Promise((r) => setTimeout(r, backoffMs));
        return this.requestWithRetry(endpoint, options, attempt + 1, maxAttempts);
      }

      this.stats.errors++;
      throw error;
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  /**
   * Get agent statistics (socket pool info)
   */
  getAgentStats() {
    return {
      // @ts-ignore - accessing internal properties
      sockets: Object.keys(this.httpsAgent.sockets || {}).length,
      // @ts-ignore
      freeSockets: Object.keys(this.httpsAgent.freeSockets || {}).length,
      // @ts-ignore
      requests: Object.keys(this.httpsAgent.requests || {}).length,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      requests: 0,
      errors: 0,
      retries: 0,
      timeouts: 0,
      activeConnections: 0,
    };
  }

  /**
   * Cleanup - destroy agent and close connections
   */
  destroy() {
    this.httpsAgent.destroy();
  }
}
