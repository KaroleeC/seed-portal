import { GRPC as Cerbos } from "@cerbos/grpc";
import type { Principal, Resource, AuthzResult } from "./authorize";

// Cerbos client configuration
const cerbosHost = process.env.CERBOS_HOST || "localhost";
const cerbosPort = parseInt(process.env.CERBOS_PORT || "3593", 10);
const useTLS = process.env.CERBOS_TLS === "true" || cerbosPort === 443;

let cerbosClient: Cerbos | null = null;

/**
 * Initialize Cerbos client
 */
export function initializeCerbosClient(): Cerbos {
  if (!cerbosClient) {
    const address =
      cerbosPort === 443 || cerbosPort === 80
        ? cerbosHost // Railway handles port mapping
        : `${cerbosHost}:${cerbosPort}`;

    cerbosClient = new Cerbos(address, {
      tls: useTLS, // Enable TLS for Railway (port 443) or when explicitly set
    });

    console.log(`🔐 [Cerbos] Client initialized: ${address} (TLS: ${useTLS})`);
  }
  return cerbosClient;
}

// ==========================
// Types and helper functions
// ==========================

export type CerbosPrincipal = {
  id: string | number;
  roles?: string[];
  departments?: string[];
  isManager?: boolean;
  attr?: Record<string, any>;
};

export type CerbosResource = {
  kind: string;
  id?: string | number;
  attr?: Record<string, any>;
};

export function toCerbosPrincipal(
  principal: Principal,
  attrs: Record<string, any> = {}
): CerbosPrincipal {
  const roleNames = Array.isArray(principal.roles)
    ? principal.roles.map((r: any) => (typeof r === "string" ? r : r.name)).filter(Boolean)
    : principal.role
      ? [principal.role]
      : [];
  return {
    id: principal.userId,
    roles: roleNames,
    departments: attrs.departments || [],
    isManager: !!attrs.isManager,
    attr: { ...attrs },
  };
}

export function toCerbosResource(
  resource: Resource,
  attrs: Record<string, any> = {}
): CerbosResource {
  return {
    kind: resource.type,
    id: resource.id,
    attr: { ...attrs },
  };
}

export async function checkWithCerbos(
  principal: CerbosPrincipal,
  resource: CerbosResource,
  action: string
): Promise<AuthzResult> {
  // If Cerbos is not enabled, return a safe default so callers can fallback to RBAC
  if (process.env.USE_CERBOS !== "true") {
    return { allowed: false, reason: "cerbos_disabled" };
  }

  try {
    const client = initializeCerbosClient();
    // Use the checkResources API. If unavailable at runtime, treat as deny with fallback.
    // @ts-ignore – The client type may not include all helpers in this environment.
    const result = await client.checkResources({
      principal: {
        id: String(principal.id),
        roles: principal.roles || [],
        attr: principal.attr || {},
      },
      resources: [
        {
          resource: {
            kind: resource.kind,
            id: resource.id ? String(resource.id) : "system",
            attr: resource.attr || {},
          },
          actions: [action],
        },
      ],
    });

    // Parse Cerbos decision
    // @ts-ignore
    const decision = result?.results?.[0];
    // @ts-ignore
    const allowed = !!decision?.actions?.[action];
    return { allowed, reason: allowed ? "cerbos_allow" : "cerbos_deny" };
  } catch (e) {
    console.warn("⚠️ [Cerbos] checkWithCerbos error, falling back:", e);
    return { allowed: false, reason: "cerbos_error" };
  }
}

export async function explainDecision(
  principal: CerbosPrincipal,
  resource: CerbosResource,
  action: string
): Promise<any> {
  if (process.env.USE_CERBOS !== "true") {
    return { note: "Cerbos disabled", principal, resource, action };
  }
  try {
    const client = initializeCerbosClient();
    // Some Cerbos deployments offer explain API; if not present, return basic info
    // @ts-ignore
    if (typeof client.explainResources === "function") {
      // @ts-ignore
      const result = await client.explainResources({
        principal: {
          id: String(principal.id),
          roles: principal.roles || [],
          attr: principal.attr || {},
        },
        resources: [
          {
            resource: {
              kind: resource.kind,
              id: resource.id ? String(resource.id) : "system",
              attr: resource.attr || {},
            },
            actions: [action],
          },
        ],
      });
      return result;
    }
    return { note: "Explain API not available", principal, resource, action };
  } catch (e) {
    return { error: String(e) };
  }
}
