/**
 * Bundle Splitting Configuration
 * 
 * Centralized configuration for Vite's manualChunks to optimize:
 * - Initial load time (smaller main bundle)
 * - Cache efficiency (vendors change less frequently)
 * - Parallel loading (browser can fetch multiple chunks)
 * 
 * DRY Principle: All chunk definitions in one place.
 */

import type { ManualChunksOption } from "rollup";

/**
 * Vendor chunk definitions.
 * Groups related libraries into separate bundles.
 */
export const VENDOR_CHUNKS = {
  // Core React ecosystem (changes infrequently)
  react: ["react", "react-dom", "react/jsx-runtime"],
  
  // React state management and data fetching
  "react-query": ["@tanstack/react-query", "@tanstack/react-virtual"],
  
  // UI component library (Radix UI - very large)
  "radix-ui": [
    "@radix-ui/react-accordion",
    "@radix-ui/react-alert-dialog",
    "@radix-ui/react-aspect-ratio",
    "@radix-ui/react-avatar",
    "@radix-ui/react-checkbox",
    "@radix-ui/react-collapsible",
    "@radix-ui/react-context-menu",
    "@radix-ui/react-dialog",
    "@radix-ui/react-dropdown-menu",
    "@radix-ui/react-hover-card",
    "@radix-ui/react-label",
    "@radix-ui/react-menubar",
    "@radix-ui/react-navigation-menu",
    "@radix-ui/react-popover",
    "@radix-ui/react-progress",
    "@radix-ui/react-radio-group",
    "@radix-ui/react-scroll-area",
    "@radix-ui/react-select",
    "@radix-ui/react-separator",
    "@radix-ui/react-slider",
    "@radix-ui/react-slot",
    "@radix-ui/react-switch",
    "@radix-ui/react-tabs",
    "@radix-ui/react-toast",
    "@radix-ui/react-toggle",
    "@radix-ui/react-toggle-group",
    "@radix-ui/react-tooltip",
  ],
  
  // Rich text editors (very large, only used in specific features)
  "editor-tiptap": [
    "@tiptap/react",
    "@tiptap/starter-kit",
    "@tiptap/extension-bubble-menu",
    "@tiptap/extension-color",
    "@tiptap/extension-image",
    "@tiptap/extension-link",
    "@tiptap/extension-placeholder",
    "@tiptap/extension-table",
    "@tiptap/extension-table-cell",
    "@tiptap/extension-table-header",
    "@tiptap/extension-table-row",
    "@tiptap/extension-text-align",
    "@tiptap/extension-text-style",
  ],
  
  "editor-tinymce": ["@tinymce/tinymce-react", "tinymce"],
  
  // Icon library (medium size, used throughout app)
  icons: ["lucide-react", "react-icons"],
  
  // Charts and data visualization (large, specific features only)
  charts: ["recharts"],
  
  // Animation library (medium size)
  animations: ["framer-motion"],
  
  // Form handling
  forms: ["react-hook-form", "@hookform/resolvers", "zod"],
  
  // Routing
  routing: ["wouter"],
  
  // Utilities
  utils: [
    "clsx",
    "tailwind-merge",
    "class-variance-authority",
    "date-fns",
    "markdown-it",
    "react-markdown",
    "remark-gfm",
    "rehype-sanitize",
  ],
  
  // Firebase (large, specific features)
  firebase: ["firebase"],
  
  // Monitoring and analytics
  monitoring: ["@sentry/react", "@vercel/speed-insights"],
} as const;

/**
 * Route-based chunk definitions.
 * Lazy-loaded features that should be in separate bundles.
 */
export const ROUTE_CHUNKS = {
  // SeedMail app (email client with rich editor)
  seedmail: ["/pages/seedmail/"],
  
  // Sales cadence (scheduler, calendar)
  "sales-cadence": ["/pages/sales-cadence/"],
  
  // Leads inbox (kanban, filtering)
  "leads-inbox": ["/pages/leads-inbox/"],
  
  // Client profiles
  "client-profiles": ["/pages/client-profiles/"],
} as const;

/**
 * Create manualChunks function for Vite/Rollup.
 * 
 * This function determines which chunk a module should be placed in.
 * 
 * @returns ManualChunks function
 */
export function createManualChunks(): ManualChunksOption {
  return (id: string): string | undefined => {
    // Normalize path separators for cross-platform compatibility
    const normalizedId = id.replace(/\\/g, "/");
    
    // Skip non-node_modules for vendor chunks
    if (!normalizedId.includes("node_modules")) {
      // Check route-based chunks
      for (const [chunkName, patterns] of Object.entries(ROUTE_CHUNKS)) {
        if (patterns.some(pattern => normalizedId.includes(pattern))) {
          return chunkName;
        }
      }
      return undefined;
    }
    
    // Check vendor chunks
    // Use exact package matching with path boundaries to avoid substring matches
    for (const [chunkName, packages] of Object.entries(VENDOR_CHUNKS)) {
      for (const pkg of packages) {
        // Match: /node_modules/pkg/ or /node_modules/pkg (end of path)
        const pattern = `/node_modules/${pkg}/`;
        if (normalizedId.includes(pattern) || normalizedId.endsWith(`/node_modules/${pkg}`)) {
          return chunkName;
        }
      }
    }
    
    // Default: all other node_modules go into "vendor" chunk
    return "vendor";
  };
}

/**
 * Calculate estimated bundle sizes (for documentation).
 * Note: Actual sizes will vary based on tree-shaking.
 */
export const ESTIMATED_CHUNK_SIZES = {
  react: "~150KB",
  "radix-ui": "~250KB",
  "editor-tiptap": "~200KB",
  "editor-tinymce": "~500KB",
  charts: "~150KB",
  firebase: "~300KB",
  icons: "~50KB",
  animations: "~80KB",
  vendor: "~100KB", // misc vendor code
  seedmail: "~80KB", // app-specific code
} as const;

/**
 * Get list of all chunk names.
 */
export function getAllChunkNames(): string[] {
  return [
    ...Object.keys(VENDOR_CHUNKS),
    ...Object.keys(ROUTE_CHUNKS),
    "vendor", // catch-all for other node_modules
  ];
}
