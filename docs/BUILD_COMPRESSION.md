# Build-time Precompression

## Overview

Build-time precompression generates `.gz` (Gzip) and `.br` (Brotli) compressed versions of static assets during the production build. The existing `servePrecompressed()` middleware automatically serves these precompressed files to compatible clients.

## Performance Benefits

- **60-80% size reduction** for JavaScript and CSS bundles
- **Zero runtime CPU cost** (compression happens at build time)
- **Faster page loads** for users (smaller transfer sizes)
- **Lower bandwidth costs** on CDN/hosting

## Implementation

### 1. Build Configuration (`vite.config.ts`)

Uses `vite-plugin-compression` to generate compressed assets:

```typescript
import viteCompression from "vite-plugin-compression";
import { COMPRESSION_THRESHOLD, COMPRESSIBLE_FILE_PATTERN } from "./config/compression";

plugins: [
  // Gzip compression
  viteCompression({
    algorithm: "gzip",
    ext: ".gz",
    threshold: COMPRESSION_THRESHOLD,      // 1KB
    deleteOriginFile: false,                // Keep originals
    filter: COMPRESSIBLE_FILE_PATTERN,     // .js, .css, .html, etc.
    verbose: false,
  }),
  // Brotli compression (better compression ratio)
  viteCompression({
    algorithm: "brotliCompress",
    ext: ".br",
    threshold: COMPRESSION_THRESHOLD,
    deleteOriginFile: false,
    filter: COMPRESSIBLE_FILE_PATTERN,
    verbose: false,
  }),
]
```

### 2. Shared Configuration (`config/compression.ts`)

DRY principle: All compression settings reference shared constants:

```typescript
export const COMPRESSION_THRESHOLD = 1024; // 1KB
export const COMPRESSIBLE_EXTENSIONS = ["js", "mjs", "json", "css", "html", "svg"];
export const COMPRESSIBLE_FILE_PATTERN = /\.(js|mjs|json|css|html|svg)$/i;
```

### 3. Runtime Serving (`server/middleware/asset-optimization.ts`)

The existing `servePrecompressed()` middleware automatically serves compressed files:

- Checks `Accept-Encoding` header
- Prioritizes Brotli (`.br`) over Gzip (`.gz`)
- Falls back to uncompressed if client doesn't support compression
- Uses canonical `BUILD_OUTPUT_PATH` for file lookups

## Testing

### Unit Tests (`__tests__/vite-config.test.ts`)

- ✅ Verifies compression plugins are configured
- ✅ Validates DRY principle (shared constants)
- ✅ Confirms correct plugin order

### Integration Tests (`__tests__/build-compression.test.ts`)

- ✅ Verifies `.gz` and `.br` files are generated
- ✅ Validates compression ratios
- ✅ Ensures original files are preserved
- ✅ Confirms Brotli is smaller than Gzip

### Validation Script (`scripts/validate-build-compression.ts`)

```bash
npm run build:validate
```

Runs after production builds to verify:

- Compressed files were generated
- Compression ratios are meaningful
- No build failures

## CI/CD Integration

Added to `.github/workflows/ci.yml`:

```yaml
- name: Build (production)
  run: npm run build

- name: Validate build compression
  run: npm run build:validate
```

CI will fail if compression is not working correctly.

## Usage

### Development

No changes needed - compression only runs in production builds.

### Production Build

```bash
npm run build
```

Automatically generates compressed assets alongside originals:

```
dist/public/
  assets/
    index.abc123.js
    index.abc123.js.gz    ← Gzip version
    index.abc123.js.br    ← Brotli version
    styles.def456.css
    styles.def456.css.gz
    styles.def456.css.br
```

### Validation

```bash
npm run build:validate
```

Outputs:

```
✓ Build directory exists at /path/to/dist/public
✓ Found 15 JavaScript files
✓ Generated 15 Gzip compressed files
✓ Generated 15 Brotli compressed files
✓ Average compression ratio: 32.5% (67.5% savings)
✓ Found 3 CSS files, 3 compressed
✅ Build compression validation PASSED
```

## Configuration

To adjust compression settings, edit `config/compression.ts`:

```typescript
// Change threshold (minimum file size to compress)
export const COMPRESSION_THRESHOLD = 2048; // 2KB instead of 1KB

// Add/remove file types
export const COMPRESSIBLE_EXTENSIONS = [
  "js", "mjs", "json", "css", "html", "svg",
  "xml", "txt", // Add more types
];
```

All build and runtime code will automatically use the updated settings.

## Troubleshooting

### Compressed files not generated

1. Check build output for warnings
2. Ensure files are > 1KB (default threshold)
3. Verify file extensions match `COMPRESSIBLE_EXTENSIONS`

### Compressed files not served

1. Check client `Accept-Encoding` header includes `gzip` or `br`
2. Verify `servePrecompressed()` middleware is registered
3. Check file exists at `${BUILD_OUTPUT_PATH}${url}.gz` or `.br`

### Poor compression ratios

- JavaScript minification must run before compression
- Already-compressed formats (images, videos) won't compress further
- Very small files may have overhead that reduces compression ratio

## Best Practices

✅ **DO:**

- Let the plugin handle compression automatically
- Keep `deleteOriginFile: false` (need originals for fallback)
- Use Brotli when possible (better compression)
- Validate compression in CI

❌ **DON'T:**

- Compress already-compressed files (images, videos)
- Set threshold too low (overhead for tiny files)
- Delete original files
- Compress dynamic API responses (use runtime compression)

## Related Files

- `vite.config.ts` - Build configuration
- `config/compression.ts` - Shared constants
- `server/middleware/asset-optimization.ts` - Runtime serving
- `server/constants.ts` - Build output paths
- `__tests__/vite-config.test.ts` - Configuration tests
- `__tests__/build-compression.test.ts` - Integration tests
- `scripts/validate-build-compression.ts` - Validation script
