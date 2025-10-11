/**
 * Express Type Augmentation
 * 
 * Extends Express Request type to include custom properties
 * added by authentication middleware.
 */

import "express-session";

declare module "express" {
  interface Request {
    user?: {
      id: number;
      email: string;
      firstName?: string;
      lastName?: string;
      role: string;
      defaultDashboard?: string;
    };
  }
}

declare module "express-session" {
  interface SessionData {
    originalUser?: {
      id: number;
      email: string;
      firstName?: string;
      lastName?: string;
      role: string;
      defaultDashboard?: string;
    };
    isImpersonating?: boolean;
    passport?: {
      user?: number;
    };
  }
}
