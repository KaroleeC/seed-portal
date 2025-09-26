// Reusable HubSpot HTTP client wrapper
// Keeps consistent error handling, rate limit retry, and empty-response handling

export type HubSpotRequestFn = (
  endpoint: string,
  options?: RequestInit,
) => Promise<any>;

export class HubSpotHttpClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(accessToken: string, baseUrl = "https://api.hubapi.com") {
    if (!accessToken) throw new Error("HubSpot access token required");
    this.accessToken = accessToken;
    this.baseUrl = baseUrl;
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const doFetch = async () =>
      fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });

    let response = await doFetch();

    if (!response.ok) {
      const errorText = await response.text();

      // Retry once on rate limit
      if (response.status === 429) {
        await new Promise((r) => setTimeout(r, 2000));
        response = await doFetch();

        if (!response.ok) {
          const retryErrorText = await response.text();
          throw new Error(
            `HubSpot API error: ${response.status} ${response.statusText} - ${retryErrorText}`,
          );
        }
      } else {
        throw new Error(
          `HubSpot API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }
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
  }
}
