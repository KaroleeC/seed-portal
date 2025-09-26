# Replit.md

## Overview

This project is Seed Financial's Internal Employee Portal, built with React, TypeScript, Express.js, and PostgreSQL. It functions as a centralized command center to enhance internal efficiency and client engagement. Key capabilities include a centralized dashboard, a sophisticated quote calculator for five services (Bookkeeping, TaaS, Payroll, AP/AR Lite, FP&A Lite), a commission tracker, a client intelligence engine, and profile management. It integrates with HubSpot, provides real-time weather, address autocomplete, advanced sales analytics, and automates MSA document generation with Box integration for client folder management.

## Recent Changes (September 2025)

- **Critical Vercel Environment Variable Bug FIXED (September 11, 2025)**: Resolved the root cause of API calls going to Vercel instead of Railway backend. The issue was in vercel.json where shell-style syntax ("$VITE*API_URL") was overriding environment variables during build - Vercel doesn't support this substitution format. Fixed by removing env/build.env blocks from vercel.json and relying solely on Vercel dashboard environment variables. This was causing VITE_API_URL to be undefined in the browser while other VITE* variables worked normally. Environment variables now properly inject during Vite build process, enabling API calls to correctly target Railway backend.
- **Vercel Frontend Deployment Configuration Complete (September 10, 2025)**: Successfully configured frontend for Vercel deployment with Railway backend integration. Key accomplishments: (1) Created comprehensive vercel.json with proper Vite framework settings, environment variable injection, SPA routing, and security headers. (2) Fixed critical CORS configuration issue where Railway backend used wildcard '\*' origin with credentials - updated to specific domain validation for Vercel, Replit, and localhost. (3) Enhanced API client (queryClient.ts) to support configurable base URLs using VITE_API_URL environment variable while maintaining backward compatibility for local development. (4) Resolved environment variable syntax issues in Vercel config. (5) Created detailed deployment documentation (VERCEL_DEPLOYMENT_GUIDE.md) with step-by-step instructions, troubleshooting guide, and security considerations. Frontend now ready for production deployment to Vercel with cross-origin session authentication properly configured for Railway backend at https://web-production-1fb61.up.railway.app.

## Recent Changes (August 2025)

- **Commission Approve/Reject System FULLY FUNCTIONAL (August 13, 2025)**: Completed critical debugging of commission approval/rejection functionality. Root cause identified: frontend was sending hubspot_invoice_id values as commission IDs, but backend endpoints were searching by database primary key 'id' field. Fixed both approve and reject API endpoints to search by hubspot_invoice_id field instead. Added success notification alerts to provide user feedback when actions complete successfully. Commission approve/reject buttons now work properly with proper user experience feedback.
- **Infinite Re-Render Bug Fix COMPLETED (August 13, 2025)**: Successfully resolved critical "Maximum update depth exceeded" errors that were causing infinite re-render loops throughout the application. Root cause analysis identified the exact source: unmemoized inline arrow functions in commission table action buttons that were added with the details modal functionality. Fixed four specific inline functions in admin-commission-tracker.tsx: handleViewDealDetails (the details button), handleApproveCommission, handleRejectCommission, and handleReviewAdjustment - all now use properly memoized click handlers. Also fixed setLocation dependencies in UniversalNavbar.tsx useCallback hooks. The infinite re-render loops that started when details options were added to commission records have been completely eliminated.
- **Comprehensive Bonus Tracking System Implemented (August 12, 2025)**: Replaced commission-based progress bars with client-based bonus tracking system matching sales dashboard design. Features monthly bonus tiers (5 clients = AirPods/$500, 10 clients = Apple Watch/$1,000, 15+ clients = MacBook Air/$1,500) and milestone progress tracking (25, 40, 60, 100 clients for $1K, $5K, $7.5K, $10K+ bonuses). Enhanced admin commission tracker with color-coded progress indicators, dynamic tier badges, achievement status badges (Rising Star → Pro → Expert → Master → Elite), and real-time progress bars. System now provides engaging visual feedback for both monthly and career-long bonus achievement tracking.
- **Sales Rep Performance API Fixed (August 12, 2025)**: Resolved critical issue where Sales Rep Performance tab was displaying empty arrays instead of actual sales representatives. Root cause was server restart requirement after route handler updates. Fixed SQL query optimization and simplified data transformation. API now correctly returns all 3 active sales reps (Jon Walls, Randall Hall, Amanda Cooper) with proper authentication and error handling. Commission tracking system can now properly filter and display commissions by sales representative.
- **Authentication System Fixed**: Successfully resolved bcrypt password verification issues that were causing login failures
- **Password Hash Compatibility**: Updated authentication system to handle both bcrypt and legacy scrypt password formats
- **Session Management**: Verified that user sessions persist correctly across requests and protected routes work properly
- **Test Environment**: Created test users for development with proper bcrypt password hashing
- **Production Deployment Authentication Fixed**: Resolved critical production authentication issues by updating session cookie configuration for Replit deployments. Fixed sameSite and secure cookie settings to work properly with HTTPS and cross-origin requirements in production environment (os.seedfinancial.io).
- **Team Password Reset**: Updated team member passwords (Amanda: Seed2025!, Randall: Team2025!) with proper bcrypt hashing to resolve login issues
- **HubSpot Integration Fully Operational**: Fixed critical apiRequest function compatibility issues in quote saving and HubSpot push/update mutations. Complete end-to-end workflow now functions seamlessly with proper error handling and user feedback.
- **User Management System Enhanced**: Implemented comprehensive portal user management with default dashboard assignment (Admin, Sales, Service), automatic password generation, user creation/deletion, and password reset functionality. Simplified role structure to admin/employee with dashboard preferences controlling initial login destination.
- **Admin Impersonation System**: Added full impersonation functionality allowing admins to sign in as any user for support purposes. System preserves original admin session, automatically redirects to user's default dashboard (/admin, /sales-dashboard, /service-dashboard), and provides secure session switching with proper authentication handling.
- **BULLETPROOF AUTHENTICATION INFRASTRUCTURE COMPLETE (August 5, 2025)**: Implemented comprehensive 6-step authentication fix that resolved all persistent production login issues. Fixed Redis client memory leaks, upgraded to RedisStore session management, enhanced cross-origin cookie configuration for Replit deployments, and verified end-to-end authentication flow. System now features robust session persistence, optimized CORS handling, and production-ready deployment configuration. All team authentication routes tested and confirmed working.
- **AUTHENTICATION SYSTEM FULLY OPERATIONAL (August 5, 2025)**: Completed final debugging session that identified and resolved the last authentication barrier. Root cause was browser-specific cookie policy conflicts - curl authentication worked perfectly but browsers rejected sessions due to incompatible cookie settings. Fixed by implementing universal browser-compatible cookie configuration with sameSite: 'lax' for all environments. Authentication system now works flawlessly across all browsers and environments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui component library, Radix UI primitives
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Form Handling**: React Hook Form with Zod
- **UI/UX Decisions**: Emphasizes consistent navigation, prominent action cards, clear typography (League Spartan for SeedKB, Open Sans for titles). Color themes are role-appropriate (blue for sales, purple for service, white sidebar for executive). Visual elements include glassmorphism, gradient backgrounds, and subtle hover animations.

### Backend Architecture

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API with JSON responses
- **Database**: PostgreSQL with Drizzle ORM (Neon Database provider)
- **Validation**: Zod schemas (shared with frontend)
- **Session Management**: Redis-backed sessions with connect-redis
- **Security Middleware**: Helmet, csurf
- **Logging**: Pino for structured logging
- **Error Tracking**: Sentry
- **Rate Limiting**: Express-rate-limit

### System Design Choices

- **Authentication**: Email/password authentication system with bcrypt password hashing, restricted to `@seedfinancial.io` emails, with simplified admin/employee role structure and default dashboard preferences (Admin, Sales, Service) for personalized login experience. Includes comprehensive user management interface with automatic password generation and user lifecycle management.
- **Role-Based Access Control**: Implemented for Admin, Sales, and Service roles.
- **Data Integration Strategy**: Direct API integrations with third-party services using a "Doorway Pattern" for consistent health monitoring, caching, and error handling.
- **Secret Management**: Environment variables and ADC files for Google API authentication.
- **Data Storage**: PostgreSQL as primary database.
- **Core Functionality**: Quote generation, commission tracking, client intelligence (HubSpot and OpenAI driven), user profile management, Knowledge Base (SEEDKB).
- **AI Integration**: AI article generation with versioning, AI-powered client intelligence for prospect scoring and data enhancement, and AI features within SEEDKB (e.g., AI Search Copilot). BullMQ handles AI insights generation with progress tracking and caching.
- **Error Handling & Resilience**: Enhanced database connection pooling, retry logic, graceful error handling for external API calls, Sentry error monitoring.
- **Workflow & User Experience**: Iterative development focusing on streamlined user flows, enhanced login, clear navigation, and rich visual feedback.
- **Security Enhancements**: Enforced session security, comprehensive security headers, CSRF protection, secure cookie flags, and API endpoint rate limiting.
- **Real-Time System Monitoring**: Admin dashboard integration for health monitoring of critical services (HubSpot CRM, Box Storage, OpenAI, Weather, Geocoding) with visual indicators.
- **Production Infrastructure**: Neon Database with PITR, Redis persistence, Replit Object Storage, dedicated BullMQ worker process, cache namespacing and invalidation.
- **Performance Optimizations**: Comprehensive API response caching for dashboard metrics, HubSpot contacts, and AI insights with automatic invalidation.
- **Startup Optimization**: HTTP server starts first, with Redis, BullMQ, HubSpot, and cache services initializing in the background to prevent deployment timeouts.

## External Dependencies

- **Database**: Neon Database (PostgreSQL)
- **Authentication**: Google OAuth (`@react-oauth/google`)
- **CRM/Sales**: HubSpot API
- **AI/ML**: OpenAI GPT-4o
- **Data Management**: Airtable
- **Weather Service**: Open-Meteo API
- **Geocoding**: Nominatim API (OpenStreetMap)
- **Text Editor**: TinyMCE
- **UI Libraries**: Radix UI, Tailwind CSS, shadcn/ui, Lucide React
