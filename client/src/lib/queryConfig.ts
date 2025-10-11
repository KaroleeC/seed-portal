/**
 * React Query Configuration
 * 
 * Centralized query configuration with resource-aware staleTime and caching.
 * Performance optimizations:
 * - Reduce unnecessary refetches for slow-changing data
 * - Coalesce refetches with appropriate staleTime
 * - Prevent global event triggers from causing excessive refetches
 * 
 * DRY Principle: All query timing configuration in one place.
 */

import type { QueryClientConfig, QueryFunction, DefaultOptions } from "@tanstack/react-query";

/**
 * Resource types with different change frequencies.
 * Determines optimal staleTime and cacheTime.
 */
export enum ResourceType {
  /** Static/rarely changing: pricing config, permissions, roles */
  STATIC = "static",
  
  /** Slow-changing: user profile, deals, quotes */
  SLOW = "slow",
  
  /** Medium-changing: commissions, pipeline data */
  MEDIUM = "medium",
  
  /** Fast-changing: real-time data, notifications */
  FAST = "fast",
  
  /** Infinite: paginated lists, never stale until manual invalidation */
  INFINITE = "infinite",
}

/**
 * Stale time configuration by resource type.
 * 
 * staleTime: How long data is considered fresh (won't refetch)
 * gcTime: How long unused data stays in cache before garbage collection
 */
export const RESOURCE_TIMING = {
  [ResourceType.STATIC]: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    description: "Static data: pricing config, permissions, roles",
  },
  [ResourceType.SLOW]: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    description: "Slow-changing: user profile, deals, quotes",
  },
  [ResourceType.MEDIUM]: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    description: "Medium-changing: commissions, pipeline data",
  },
  [ResourceType.FAST]: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    description: "Fast-changing: real-time data, notifications",
  },
  [ResourceType.INFINITE]: {
    staleTime: Infinity, // Never stale
    gcTime: 60 * 60 * 1000, // 1 hour
    description: "Infinite: paginated lists, manual invalidation only",
  },
} as const;

/**
 * Query key patterns mapped to resource types.
 * Determines appropriate staleTime for each query.
 */
export const RESOURCE_TYPE_PATTERNS: Record<string, ResourceType> = {
  // Static resources (rarely change)
  "pricing.config": ResourceType.STATIC,
  "pricing.admin": ResourceType.STATIC,
  "seedqc.pricing": ResourceType.STATIC,
  "core.user.me": ResourceType.STATIC,
  "rbac.roles": ResourceType.STATIC,
  "rbac.permissions": ResourceType.STATIC,
  "admin.rbac": ResourceType.STATIC,
  
  // Slow-changing resources
  "seedqc.content": ResourceType.SLOW,
  "seedqc.admin-content": ResourceType.SLOW,
  "seedpay.deals": ResourceType.SLOW,
  "quotes": ResourceType.SLOW,
  "core.sales-reps": ResourceType.SLOW,
  "crm.contacts.details": ResourceType.SLOW,
  
  // Medium-changing resources
  "seedpay.commissions": ResourceType.MEDIUM,
  "seedpay.bonuses": ResourceType.MEDIUM,
  "pipeline-projections": ResourceType.MEDIUM,
  "stripe.revenue": ResourceType.MEDIUM,
  
  // Fast-changing resources
  "stripe.transactions": ResourceType.FAST,
  "notifications": ResourceType.FAST,
  
  // Infinite (paginated, manual invalidation)
  "crm.contacts.search": ResourceType.INFINITE,
};

/**
 * Determine resource type from query key.
 * 
 * @param queryKey - React Query key array
 * @returns ResourceType or undefined if no match
 */
export function getResourceType(queryKey: readonly unknown[]): ResourceType | undefined {
  if (!Array.isArray(queryKey) || queryKey.length === 0) {
    return undefined;
  }
  
  // Convert query key to pattern string
  const pattern = queryKey
    .filter(k => typeof k === "string" && k !== "")
    .join(".");
  
  // Find matching pattern (most specific first)
  for (const [patternKey, resourceType] of Object.entries(RESOURCE_TYPE_PATTERNS)) {
    if (pattern.startsWith(patternKey)) {
      return resourceType;
    }
  }
  
  // Default: medium-changing
  return ResourceType.MEDIUM;
}

/**
 * Get timing configuration for a query key.
 * 
 * @param queryKey - React Query key array
 * @returns Timing configuration with staleTime and gcTime
 */
export function getQueryTiming(queryKey: readonly unknown[]): {
  staleTime: number;
  gcTime: number;
} {
  const resourceType = getResourceType(queryKey);
  if (!resourceType) {
    // Default: medium-changing
    return {
      staleTime: RESOURCE_TIMING[ResourceType.MEDIUM].staleTime,
      gcTime: RESOURCE_TIMING[ResourceType.MEDIUM].gcTime,
    };
  }
  
  return {
    staleTime: RESOURCE_TIMING[resourceType].staleTime,
    gcTime: RESOURCE_TIMING[resourceType].gcTime,
  };
}

/**
 * Enhanced default options with resource-aware timing.
 * Note: queryFn is set in queryClient.ts to avoid circular dependency
 */
export const defaultQueryOptions: DefaultOptions = {
  queries: {
    // queryFn is set when creating QueryClient to avoid circular dependency
    
    // Disable automatic refetch triggers (performance optimization)
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Do refetch on network reconnect
    refetchInterval: false, // No automatic polling
    
    // Default timing (individual queries can override based on resource type)
    staleTime: 2 * 60 * 1000, // Default 2 minutes
    gcTime: 10 * 60 * 1000, // Default 10 minutes
    
    // Retry configuration
    retry: (failureCount, error) => {
      // Don't retry on authentication or client errors
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("403")) {
          return false; // Auth errors
        }
        if (error.message.match(/^4\d\d/)) {
          return false; // Any 4xx error
        }
      }
      return failureCount < 2; // Max 2 retries for network errors
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Max 10s delay
  },
  
  mutations: {
    retry: (failureCount, error) => {
      // Only retry network errors, not business logic errors
      if (error instanceof Error && error.message.includes("Network")) {
        return failureCount < 2;
      }
      return false;
    },
    onError: (error) => {
      // Only log unexpected errors
      if (
        error instanceof Error &&
        !error.message.includes("401") &&
        !error.message.includes("400") &&
        !error.message.includes("422")
      ) {
        console.error("Unexpected mutation error:", error.message);
      }
    },
  },
};

/**
 * Query client configuration.
 */
export const queryClientConfig: QueryClientConfig = {
  defaultOptions: defaultQueryOptions,
};

/**
 * Prefetch utilities for common navigations.
 */
export const prefetchKeys = {
  /** Prefetch pricing config (used in calculator) */
  pricingConfig: ["seedqc", "pricing", "config"] as const,
  
  /** Prefetch calculator content */
  calculatorContent: ["seedqc", "content", "all"] as const,
  
  /** Prefetch user commissions */
  commissions: (salesRepId?: string | number) => 
    ["seedpay", "commissions", salesRepId ?? "all"] as const,
  
  /** Prefetch deals */
  deals: () => ["seedpay", "deals", "list"] as const,
  
  /** Prefetch user profile */
  userProfile: ["core", "user", "me"] as const,
} as const;

/**
 * Get all static resource keys for bulk prefetching.
 */
export function getStaticResourceKeys(): string[][] {
  return Object.entries(RESOURCE_TYPE_PATTERNS)
    .filter(([_, type]) => type === ResourceType.STATIC)
    .map(([pattern]) => pattern.split("."));
}
