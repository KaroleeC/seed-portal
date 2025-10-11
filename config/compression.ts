/**
 * Compression Configuration
 *
 * Shared configuration for build-time and runtime compression.
 * DRY: All compression settings reference these constants.
 */

/**
 * Minimum file size (in bytes) for compression.
 * Files smaller than this threshold are not compressed.
 */
export const COMPRESSION_THRESHOLD = 1024; // 1KB

/**
 * File extensions that should be compressed.
 */
export const COMPRESSIBLE_EXTENSIONS = ["js", "mjs", "json", "css", "html", "svg"] as const;

/**
 * Regular expression pattern for compressible files.
 */
export const COMPRESSIBLE_FILE_PATTERN = new RegExp(
  `\\.(${COMPRESSIBLE_EXTENSIONS.join("|")})$`,
  "i"
);

/**
 * Compression algorithms in order of preference.
 * Brotli provides better compression but requires more CPU.
 */
export const COMPRESSION_ALGORITHMS = ["br", "gzip"] as const;

export type CompressionAlgorithm = (typeof COMPRESSION_ALGORITHMS)[number];
