export type BrandLogoOptions = {
  variant?: "wordmark" | "mark";
  ext?: "svg" | "png";
  pathPrefix?: string; // allow component-specific folders
};

function trimTrailingSlash(s: string) {
  return s.replace(/\/+$/, "");
}

/**
 * Resolves the base public assets URL in this precedence order:
 * 1) VITE_PUBLIC_ASSETS_BASE_URL (single Doppler var for all apps)
 * 2) VITE_SUPABASE_URL + /storage/v1/object/public/{bucket}
 *    Bucket defaults to "brand" but can be overridden with VITE_PUBLIC_ASSETS_BUCKET
 */
export function getAssetsBaseUrl(): string | undefined {
  const viteEnv = (
    import.meta as unknown as {
      env: Record<string, string | undefined>;
    }
  ).env;

  const fromEnv = viteEnv?.VITE_PUBLIC_ASSETS_BASE_URL;
  if (fromEnv && fromEnv.length > 0) return trimTrailingSlash(fromEnv);

  const supabaseUrl = viteEnv?.VITE_SUPABASE_URL;
  if (!supabaseUrl) return undefined;

  const bucket = viteEnv?.VITE_PUBLIC_ASSETS_BUCKET || "brand";

  return `${trimTrailingSlash(supabaseUrl)}/storage/v1/object/public/${bucket}`;
}

/**
 * Join base public assets URL with a relative path.
 */
export function getPublicAssetUrl(relativePath: string): string | undefined {
  const base = getAssetsBaseUrl();
  if (!base) return undefined;
  const rel = relativePath.replace(/^\/+/, "");
  return `${trimTrailingSlash(base)}/${rel}`;
}

/**
 * Returns the absolute URL to a brand logo using a deterministic path
 * structure so each app does not need its own env var.
 *
 * Example generated path:
 *   {base}/logos/<appSlug>.<variant>.<ext>
 */
export function brandLogo(appSlug: string, opts: BrandLogoOptions = {}): string | undefined {
  const base = getAssetsBaseUrl();
  const variant = opts.variant ?? "wordmark";
  const ext = opts.ext ?? "svg";
  const prefix = opts.pathPrefix ?? "logos";

  if (!base) return undefined;
  return `${base}/${prefix}/${appSlug}.${variant}.${ext}`;
}

/**
 * Convenience helper for SeedMail page.
 */
export function seedMailLogoUrl(): string | undefined {
  return (
    brandLogo("seedmail", { variant: "wordmark", ext: "svg" }) ||
    brandLogo("seedmail", { variant: "wordmark", ext: "png" })
  );
}

/**
 * Generic app logo for theme: resolves to logos/apps/<appSlug>-<theme>.png
 */
export function appLogoUrlForTheme(appSlug: string, theme: "light" | "dark"): string | undefined {
  return getPublicAssetUrl(`logos/apps/${appSlug}-${theme}.png`);
}

/**
 * SeedMail theme-aware logo resolver.
 * Expected files:
 *   logos/apps/seedmail-dark.png
 *   logos/apps/seedmail-light.png
 */
export function seedMailLogoUrlForTheme(theme: "light" | "dark"): string | undefined {
  return appLogoUrlForTheme("seedmail", theme);
}
