# Plan.md - Seed Financial Client Intelligence Platform

## Project Overview

An enterprise-grade internal employee portal for Seed Financial, featuring sales commission management, client intelligence, and comprehensive business automation. The platform streamlines operations through intelligent data synchronization, precise invoice processing, and enhanced admin interaction capabilities.

## Migration Status

**Current Phase**: Migrating from Replit to Windsurf  
**Date**: August 13, 2025  
**Target Stack**: Supabase (database) + Doppler (secrets management)

## Technology Stack

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query v5
- **Routing**: Wouter
- **Form Handling**: React Hook Form + Zod validation
- **UI Components**: Radix UI primitives, Lucide icons

### Backend

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database**: ~~PostgreSQL~~ → **Supabase** (PostgreSQL)
- **ORM**: Drizzle ORM
- **Session Management**: Redis with connect-redis
- **Queue System**: BullMQ with Redis
- **Logging**: Pino

### Infrastructure (New Stack)

- **Database**: Supabase (replacing Neon Database)
  - Real-time subscriptions
  - Row-level security
  - Built-in auth (optional migration path)
- **Secrets Management**: Doppler (replacing .env files)
  - Centralized configuration
  - Environment syncing
  - Audit logging
- **Deployment**: Windsurf (replacing Replit)

## Core Features

### 1. Sales Commission Management

- Automated commission calculation and tracking
- HubSpot invoice synchronization
- Approve/reject workflow with admin controls
- Monthly and milestone bonus tracking system
- Sales rep performance analytics

### 2. Client Intelligence Engine

- AI-powered prospect scoring (OpenAI GPT-4o)
- HubSpot CRM integration
- Real-time data enhancement
- Automated insights generation with BullMQ

### 3. Quote Calculator

- Multi-service quote generation (Bookkeeping, TaaS, Payroll, AP/AR Lite, FP&A Lite)
- MSA document automation
- Box integration for client folder management
- Direct HubSpot deal creation

### 4. Knowledge Base (SEEDKB)

- AI-powered article generation with versioning
- Smart search with AI copilot
- Category management
- Public/private content control

### 5. User Management

- Role-based access control (Admin/Employee)
- Default dashboard routing (Admin, Sales, Service)
- Admin impersonation for support
- Automatic password generation

## Database Schema

### Core Tables

- `users` - Employee accounts with role management
- `quotes` - Service quotes with HubSpot integration
- `commissions` - Commission tracking with approval workflow
- `knowledge_base_articles` - KB content with versioning
- `ai_insights` - Cached AI-generated insights
- `commission_adjustments` - Manual commission modifications
- `portal_users` - Extended user profiles

### Integration Tables

- `hubspot_sync_log` - API synchronization tracking
- `box_folders` - Client folder mappings
- `cache_entries` - API response caching

## External Integrations

### Critical Services

1. **HubSpot CRM**
   - Deals, contacts, companies
   - Invoice management
   - Pipeline tracking
   - Rate limit: 1000 req/10s

2. **OpenAI API**
   - GPT-4o for intelligence
   - Embeddings for search
   - Content generation

3. **Box Storage**
   - Document management
   - Client folder creation
   - File upload/download

4. **Google Services**
   - OAuth authentication
   - Workspace admin SDK

### Supporting Services

- Open-Meteo (weather data)
- Nominatim (geocoding)
- TinyMCE (rich text editing)
- Stripe (payment processing - future)

## Security & Performance

### Authentication

- bcrypt password hashing
- Session-based authentication
- Redis session storage
- CSRF protection
- Helmet.js security headers

### Performance Optimizations

- Memoized React components
- API response caching
- Database connection pooling
- Background job processing (BullMQ)
- Lazy loading for routes

### Monitoring

- Real-time health checks for all services
- Sentry error tracking
- Structured logging with Pino
- API rate limit monitoring

## Migration Checklist

### Pre-Migration

- [x] Document current architecture
- [x] Identify Replit-specific dependencies
- [ ] Create comprehensive .gitignore
- [ ] Set up Doppler project
- [ ] Initialize Supabase project

### Database Migration

- [ ] Export PostgreSQL schema from Neon
- [ ] Import schema to Supabase
- [ ] Update connection strings
- [ ] Migrate Drizzle configuration
- [ ] Test database connectivity

### Code Updates

- [ ] Replace DATABASE_URL with Supabase connection
- [ ] Update Redis configuration for new environment
- [ ] Remove Replit-specific imports/configs
- [ ] Update build scripts for Windsurf
- [ ] Configure Doppler CLI integration

### Environment Setup

- [ ] Transfer secrets to Doppler
- [ ] Configure Supabase environment variables
- [ ] Set up Redis instance
- [ ] Configure domain/SSL (if needed)

### Testing

- [ ] Authentication flow
- [ ] HubSpot integration
- [ ] Commission calculations
- [ ] AI features
- [ ] File uploads (Box)

## Development Guidelines

### Code Organization

```
/
├── client/              # React frontend
│   ├── src/
│   │   ├── pages/      # Route components
│   │   ├── components/ # Reusable components
│   │   ├── hooks/      # Custom React hooks
│   │   └── lib/        # Utilities
├── server/             # Express backend
│   ├── routes.ts       # API endpoints
│   ├── storage.ts      # Database interface
│   └── integrations/   # External services
├── shared/             # Shared types/schemas
│   └── schema.ts       # Drizzle schemas
└── plan.md            # This file
```

### Best Practices

1. **Type Safety**: Use TypeScript strictly, define all schemas
2. **Error Handling**: Graceful degradation for external services
3. **Caching**: Cache expensive operations (AI, API calls)
4. **Security**: Never expose secrets, use Doppler for all configs
5. **Testing**: Test with real data, no mock placeholders
6. **Documentation**: Update plan.md for architectural changes

### Git Workflow

1. Feature branches from main
2. Descriptive commit messages
3. Update plan.md with significant changes
4. Keep .gitignore comprehensive

## Recent Updates

- **August 13, 2025**: Initiated migration from Replit to Windsurf
- **August 13, 2025**: Commission approve/reject system fully debugged and operational
- **August 13, 2025**: Fixed infinite re-render loops in commission tracker
- **August 12, 2025**: Implemented comprehensive bonus tracking system
- **August 12, 2025**: Fixed Sales Rep Performance API

## Known Issues & TODOs

- [ ] Migrate from Neon to Supabase
- [ ] Configure Doppler for all environments
- [ ] Update deployment scripts for Windsurf
- [ ] Test all integrations in new environment
- [ ] Document Supabase-specific features (real-time, RLS)

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Doppler Docs**: https://docs.doppler.com
- **Windsurf Docs**: [Add your Windsurf documentation link]
- **Internal Contact**: [Add team contact info]

## Notes for AI Assistant

This document serves as the primary context for the Windsurf AI assistant. Key points:

- Always use Supabase client instead of direct PostgreSQL connections
- Retrieve secrets via Doppler, never hardcode
- Maintain type safety with shared schemas
- Focus on real data, avoid mock/placeholder content
- Update this document when architecture changes
