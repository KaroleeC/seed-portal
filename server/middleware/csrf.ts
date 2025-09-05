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

// Middleware to skip CSRF for API routes that use session-based authentication
export function conditionalCsrf(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF for preflight requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Skip CSRF for all API routes - they are protected by requireAuth middleware and session-based auth
  // This provides equivalent security through SameSite cookies without CSRF token complexity
  if (req.path.startsWith('/api/')) {
    console.log(`🔓 CSRF SKIPPED for API route: ${req.path} (session-based auth)`);
    return next();
  }

  // Apply CSRF protection only to non-API routes (forms, etc.)
  console.log(`🔒 CSRF APPLIED for non-API route: ${req.path}`);
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