import { describe, it, expect } from "vitest";
import {
  VENDOR_CHUNKS,
  ROUTE_CHUNKS,
  createManualChunks,
  getAllChunkNames,
  ESTIMATED_CHUNK_SIZES,
} from "../bundle-chunks";

describe("Bundle Chunks Configuration", () => {
  describe("VENDOR_CHUNKS", () => {
    it("includes React core packages", () => {
      expect(VENDOR_CHUNKS.react).toContain("react");
      expect(VENDOR_CHUNKS.react).toContain("react-dom");
      expect(VENDOR_CHUNKS.react).toContain("react/jsx-runtime");
    });

    it("includes Radix UI packages", () => {
      expect(VENDOR_CHUNKS["radix-ui"]).toContain("@radix-ui/react-dialog");
      expect(VENDOR_CHUNKS["radix-ui"]).toContain("@radix-ui/react-dropdown-menu");
      expect(VENDOR_CHUNKS["radix-ui"].length).toBeGreaterThan(20); // Many Radix packages
    });

    it("separates editor libraries", () => {
      expect(VENDOR_CHUNKS["editor-tiptap"]).toContain("@tiptap/react");
      expect(VENDOR_CHUNKS["editor-tinymce"]).toContain("@tinymce/tinymce-react");

      // Editors should be in separate chunks
      expect(VENDOR_CHUNKS["editor-tiptap"]).not.toEqual(VENDOR_CHUNKS["editor-tinymce"]);
    });

    it("groups icon libraries together", () => {
      expect(VENDOR_CHUNKS.icons).toContain("lucide-react");
      expect(VENDOR_CHUNKS.icons).toContain("react-icons");
    });

    it("isolates heavy libraries (charts, firebase)", () => {
      expect(VENDOR_CHUNKS.charts).toContain("recharts");
      expect(VENDOR_CHUNKS.firebase).toContain("firebase");
    });

    it("groups form libraries together", () => {
      expect(VENDOR_CHUNKS.forms).toContain("react-hook-form");
      expect(VENDOR_CHUNKS.forms).toContain("@hookform/resolvers");
      expect(VENDOR_CHUNKS.forms).toContain("zod");
    });

    it("all vendor chunks are arrays", () => {
      Object.values(VENDOR_CHUNKS).forEach((chunk) => {
        expect(Array.isArray(chunk)).toBe(true);
        expect(chunk.length).toBeGreaterThan(0);
      });
    });
  });

  describe("ROUTE_CHUNKS", () => {
    it("includes SeedMail route", () => {
      expect(ROUTE_CHUNKS.seedmail).toContain("/pages/seedmail/");
    });

    it("includes sales-cadence route", () => {
      expect(ROUTE_CHUNKS["sales-cadence"]).toContain("/pages/sales-cadence/");
    });

    it("includes leads-inbox route", () => {
      expect(ROUTE_CHUNKS["leads-inbox"]).toContain("/pages/leads-inbox/");
    });

    it("all route chunks are arrays", () => {
      Object.values(ROUTE_CHUNKS).forEach((chunk) => {
        expect(Array.isArray(chunk)).toBe(true);
        expect(chunk.length).toBeGreaterThan(0);
      });
    });
  });

  describe("createManualChunks()", () => {
    const manualChunks = createManualChunks();

    it("returns a function", () => {
      expect(typeof manualChunks).toBe("function");
    });

    describe("Vendor package chunking", () => {
      it("assigns React to 'react' chunk", () => {
        const result = manualChunks("/project/node_modules/react/index.js");
        expect(result).toBe("react");
      });

      it("assigns react-dom to 'react' chunk", () => {
        const result = manualChunks("/project/node_modules/react-dom/index.js");
        expect(result).toBe("react");
      });

      it("assigns Radix UI to 'radix-ui' chunk", () => {
        const result = manualChunks("/project/node_modules/@radix-ui/react-dialog/index.js");
        expect(result).toBe("radix-ui");
      });

      it("assigns TipTap to 'editor-tiptap' chunk", () => {
        const result = manualChunks("/project/node_modules/@tiptap/react/index.js");
        expect(result).toBe("editor-tiptap");
      });

      it("assigns TinyMCE to 'editor-tinymce' chunk", () => {
        const result = manualChunks("/project/node_modules/@tinymce/tinymce-react/index.js");
        expect(result).toBe("editor-tinymce");
      });

      it("assigns icons to 'icons' chunk", () => {
        const result = manualChunks("/project/node_modules/lucide-react/index.js");
        expect(result).toBe("icons");
      });

      it("assigns recharts to 'charts' chunk", () => {
        const result = manualChunks("/project/node_modules/recharts/index.js");
        expect(result).toBe("charts");
      });

      it("assigns firebase to 'firebase' chunk", () => {
        const result = manualChunks("/project/node_modules/firebase/index.js");
        expect(result).toBe("firebase");
      });

      it("assigns react-hook-form to 'forms' chunk", () => {
        const result = manualChunks("/project/node_modules/react-hook-form/index.js");
        expect(result).toBe("forms");
      });

      it("assigns unknown vendor to 'vendor' chunk", () => {
        const result = manualChunks("/project/node_modules/some-unknown-package/index.js");
        expect(result).toBe("vendor");
      });
    });

    describe("Route-based chunking", () => {
      it("assigns SeedMail pages to 'seedmail' chunk", () => {
        const result = manualChunks("/project/client/src/pages/seedmail/index.tsx");
        expect(result).toBe("seedmail");
      });

      it("assigns sales-cadence pages to 'sales-cadence' chunk", () => {
        const result = manualChunks("/project/client/src/pages/sales-cadence/Calendar.tsx");
        expect(result).toBe("sales-cadence");
      });

      it("assigns leads-inbox pages to 'leads-inbox' chunk", () => {
        const result = manualChunks("/project/client/src/pages/leads-inbox/Board.tsx");
        expect(result).toBe("leads-inbox");
      });

      it("returns undefined for non-route, non-vendor modules", () => {
        const result = manualChunks("/project/client/src/components/Button.tsx");
        expect(result).toBeUndefined();
      });
    });

    describe("Cross-platform path handling", () => {
      it("handles Windows-style paths", () => {
        const result = manualChunks("C:\\project\\node_modules\\react\\index.js");
        expect(result).toBe("react");
      });

      it("handles Unix-style paths", () => {
        const result = manualChunks("/project/node_modules/react/index.js");
        expect(result).toBe("react");
      });
    });
  });

  describe("getAllChunkNames()", () => {
    it("returns array of all chunk names", () => {
      const chunks = getAllChunkNames();

      expect(Array.isArray(chunks)).toBe(true);
      expect(chunks.length).toBeGreaterThan(0);
    });

    it("includes vendor chunks", () => {
      const chunks = getAllChunkNames();

      expect(chunks).toContain("react");
      expect(chunks).toContain("radix-ui");
      expect(chunks).toContain("icons");
    });

    it("includes route chunks", () => {
      const chunks = getAllChunkNames();

      expect(chunks).toContain("seedmail");
      expect(chunks).toContain("sales-cadence");
    });

    it("includes catch-all vendor chunk", () => {
      const chunks = getAllChunkNames();

      expect(chunks).toContain("vendor");
    });

    it("has no duplicate chunk names", () => {
      const chunks = getAllChunkNames();
      const uniqueChunks = [...new Set(chunks)];

      expect(chunks.length).toBe(uniqueChunks.length);
    });
  });

  describe("ESTIMATED_CHUNK_SIZES", () => {
    it("provides size estimates for major chunks", () => {
      expect(ESTIMATED_CHUNK_SIZES.react).toBeDefined();
      expect(ESTIMATED_CHUNK_SIZES["radix-ui"]).toBeDefined();
      expect(ESTIMATED_CHUNK_SIZES["editor-tiptap"]).toBeDefined();
      expect(ESTIMATED_CHUNK_SIZES["editor-tinymce"]).toBeDefined();
    });

    it("size estimates are strings with KB suffix", () => {
      Object.values(ESTIMATED_CHUNK_SIZES).forEach((size) => {
        expect(typeof size).toBe("string");
        expect(size).toMatch(/~\d+KB/);
      });
    });
  });

  describe("DRY Principle Compliance", () => {
    it("no duplicate packages across vendor chunks", () => {
      const allPackages = new Set<string>();
      const duplicates: string[] = [];

      Object.values(VENDOR_CHUNKS).forEach((packages) => {
        packages.forEach((pkg) => {
          if (allPackages.has(pkg)) {
            duplicates.push(pkg);
          }
          allPackages.add(pkg);
        });
      });

      expect(duplicates).toEqual([]);
    });

    it("vendor chunks are mutually exclusive", () => {
      const chunkEntries = Object.entries(VENDOR_CHUNKS);

      for (let i = 0; i < chunkEntries.length; i++) {
        for (let j = i + 1; j < chunkEntries.length; j++) {
          const [name1, packages1] = chunkEntries[i];
          const [name2, packages2] = chunkEntries[j];

          const intersection = packages1.filter((pkg) => packages2.includes(pkg));

          expect(intersection).toEqual([]);
        }
      }
    });

    it("route patterns are unique", () => {
      const allPatterns = Object.values(ROUTE_CHUNKS).flat();
      const uniquePatterns = [...new Set(allPatterns)];

      expect(allPatterns.length).toBe(uniquePatterns.length);
    });
  });

  describe("Performance Characteristics", () => {
    it("manualChunks executes quickly for typical module paths", () => {
      const manualChunks = createManualChunks();
      const testPaths = [
        "/project/node_modules/react/index.js",
        "/project/node_modules/@radix-ui/react-dialog/index.js",
        "/project/client/src/pages/seedmail/index.tsx",
        "/project/client/src/components/Button.tsx",
      ];

      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        testPaths.forEach((path) => manualChunks(path));
      }

      const duration = Date.now() - start;

      // Should complete 4000 iterations in < 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});
