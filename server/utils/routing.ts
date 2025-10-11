/**
 * Routing Utilities
 *
 * Helper functions for common routing patterns.
 */

import type { Request, Response, RequestHandler } from "express";

/**
 * Creates a redirect handler that preserves query strings
 *
 * @param targetPath - Destination path to redirect to
 * @param statusCode - HTTP status code (default: 307 Temporary Redirect)
 * @returns Express request handler
 *
 * @example
 * app.get("/old-path", createRedirect("/new-path"));
 * // GET /old-path?foo=bar → 307 Redirect to /new-path?foo=bar
 */
export function createRedirect(targetPath: string, statusCode: number = 307): RequestHandler {
  return (req: Request, res: Response) => {
    // Preserve query string if present
    const query = req.originalUrl.includes("?")
      ? req.originalUrl.slice(req.originalUrl.indexOf("?"))
      : "";

    res.redirect(statusCode, `${targetPath}${query}`);
  };
}

/**
 * Creates multiple redirect routes at once
 *
 * @param routes - Map of source paths to target paths
 * @returns Array of route configurations
 *
 * @example
 * const redirects = createRedirects({
 *   "/old/path": "/new/path",
 *   "/legacy": "/modern"
 * });
 */
export function createRedirects(
  routes: Record<string, string>
): Array<{ from: string; to: string; handler: RequestHandler }> {
  return Object.entries(routes).map(([from, to]) => ({
    from,
    to,
    handler: createRedirect(to),
  }));
}
