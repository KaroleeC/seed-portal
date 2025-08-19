import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

// CSRF protection middleware
export const csrfProtection = csrf({
  cookie: false, // Use session instead of cookies
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'], // Don't require CSRF for read operations
  value: (req: Request) => {
    // Allow CSRF token from multiple sources
    return req.body._csrf || 
           req.query._csrf || 
           req.headers['x-csrf-token'] as string ||
           req.headers['x-xsrf-token'] as string;
  }
});

// Middleware to skip CSRF for API routes that use other authentication
export function conditionalCsrf(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for API routes that are protected by other means
  const skipPaths = [
    '/api/auth/google/sync', // Uses bearer token
    '/api/auth/workos', // WorkOS SSO initiation
    '/api/auth/workos/callback', // WorkOS SSO callback
    '/api/healthz', // Liveness probe
    '/api/readyz', // Readiness probe (aggregated health)
    '/api/auth/login', // Login endpoint needs to work without CSRF
    '/api/auth/logout', // Logout endpoint is safe without CSRF
    '/api/hubspot/push-quote', // Protected by requireAuth middleware
    '/api/hubspot/update-quote', // Protected by requireAuth middleware
    '/api/create-user', // User creation endpoint for testing
    '/api/login', // Simple login endpoint
    '/api/logout', // Session logout endpoint (handled by setupAuth)
    '/api/register', // Registration endpoint (handled by setupAuth)
  ];

  // Skip CSRF for preflight requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Always run CSRF middleware for safe methods so token is generated/exposed
  if (req.method === 'GET' || req.method === 'HEAD') {
    return csrfProtection(req, res, next);
  }

  // For unsafe methods, allow explicit skips for specific paths
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // For unsafe methods: skip CSRF for authenticated API requests with valid session
  if (req.path.startsWith('/api/') && req.isAuthenticated && req.isAuthenticated()) {
    // Authenticated API requests rely on session cookies; CSRF enforcement is skipped here by policy
    return next();
  }

  // Apply CSRF protection to all other routes
  csrfProtection(req, res, next);
}

// Middleware to provide CSRF token to the frontend
export function provideCsrfToken(req: Request, res: Response, next: NextFunction) {
  if (req.csrfToken) {
    res.locals.csrfToken = req.csrfToken();
    
    // Also set it as a response header for SPA usage
    res.setHeader('X-CSRF-Token', res.locals.csrfToken);
  }
  next();
}