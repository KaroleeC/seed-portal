/**
 * Centralized asset registry using Supabase Storage CDN
 *
 * Assets are served from Supabase Storage bucket: seed-portal-assets
 * CDN URL is configured via VITE_SUPABASE_STORAGE_URL environment variable
 *
 * Fallback: If CDN is unavailable, falls back to local assets (dev mode)
 */

const cdn = import.meta.env.VITE_SUPABASE_STORAGE_URL || "";

// Brand logos (main Seed Financial branding)
export const brand = {
  light: `${cdn}/logos/brand/seed-financial-light.png`,
  dark: `${cdn}/logos/brand/seed-financial-dark.png`,
  lightFallback: `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='160' viewBox='0 0 600 160'>
      <rect width='100%' height='100%' fill='transparent'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' font-size='40' font-weight='700' fill='#0f172a'>Seed Financial</text>
    </svg>`
  )}`,
  darkFallback: `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='160' viewBox='0 0 600 160'>
      <rect width='100%' height='100%' fill='transparent'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' font-size='40' font-weight='700' fill='#ffffff'>Seed Financial</text>
    </svg>`
  )}`,
};

// SEEDOS dashboard logos (sales, service, admin)
export const seedos = {
  sales: {
    light: `${cdn}/logos/seedos/sales-light.png`,
    dark: `${cdn}/logos/seedos/sales-dark.png`,
  },
  service: {
    light: `${cdn}/logos/seedos/service-light.png`,
    dark: `${cdn}/logos/seedos/service-dark.png`,
  },
  admin: {
    light: `${cdn}/logos/seedos/admin-light.png`,
    dark: `${cdn}/logos/seedos/admin-dark.png`,
  },
};

// App logos (individual applications)
export const apps = {
  seedqc: {
    light: `${cdn}/logos/apps/seedqc-light.png`,
    dark: `${cdn}/logos/apps/seedqc-dark.png`,
  },
  seedpay: {
    light: `${cdn}/logos/apps/seedpay-light.png`,
    dark: `${cdn}/logos/apps/seedpay-dark.png`,
  },
  seedai: {
    light: `${cdn}/logos/apps/seedai-light.png`,
    dark: `${cdn}/logos/apps/seedai-dark.png`,
  },
  seedkb: {
    light: `${cdn}/logos/apps/seedkb-light.png`,
    dark: `${cdn}/logos/apps/seedkb-dark.png`,
  },
  seedcadence: {
    light: `${cdn}/logos/apps/seedcadence-light.png`,
    dark: `${cdn}/logos/apps/seedcadence-dark.png`,
  },
  seedmail: {
    light: `${cdn}/logos/apps/seedmail-light.png`,
    dark: `${cdn}/logos/apps/seedmail-dark.png`,
  },
  seeddrive: {
    light: `${cdn}/logos/apps/seeddrive-light.png`,
    dark: `${cdn}/logos/apps/seeddrive-dark.png`,
  },
  seedkpi: {
    light: `${cdn}/logos/apps/seedkpi-light.png`,
    dark: `${cdn}/logos/apps/seedkpi-dark.png`,
  },
  clientiq: {
    light: `${cdn}/logos/apps/clientiq-light.png`,
    dark: `${cdn}/logos/apps/clientiq-dark.png`,
  },
  serviceiq: {
    light: `${cdn}/logos/apps/serviceiq-light.png`,
    dark: `${cdn}/logos/apps/serviceiq-dark.png`,
  },
  salesiq: {
    light: `${cdn}/logos/apps/salesiq-light.png`,
    dark: `${cdn}/logos/apps/salesiq-dark.png`,
  },
  leadiq: {
    light: `${cdn}/logos/apps/leadiq-light.png`,
    dark: `${cdn}/logos/apps/leadiq-dark.png`,
  },
  commshub: {
    light: `${cdn}/logos/apps/commshub-light.png`,
    dark: `${cdn}/logos/apps/commshub-dark.png`,
  },
};

// Other assets (command dock, avatars, etc.)
export const misc = {
  commandDock: `${cdn}/misc/command-dock-logo.png`,
  assistantAvatar: `${cdn}/misc/assistant-bot.png`,
};

// Helper function to get themed logo
export function getThemedLogo(
  logoSet: { light: string; dark: string },
  theme: "light" | "dark"
): string {
  return theme === "dark" ? logoSet.dark : logoSet.light;
}

// Re-export for backwards compatibility
export const logoLight = brand.light;
export const logoDark = brand.dark;
export const logoLightFallback = brand.lightFallback;
export const logoDarkFallback = brand.darkFallback;
