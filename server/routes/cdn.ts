import { Router } from "express";
import { requireAuth } from "../middleware/supabase-auth";
import { getErrorMessage } from "../utils/error-handling";

const router = Router();

router.get("/api/cdn/compression-stats", requireAuth, async (req, res) => {
  try {
    const { assetOptimization } = await import("../middleware/asset-optimization.js");
    const stats = assetOptimization.getStats();
    res.json(stats);
  } catch (error) {
    console.error("Compression stats error:", error);
    res.status(500).json({ message: "Failed to get compression stats" });
  }
});

router.post("/api/cdn/reset-compression-stats", requireAuth, async (req, res) => {
  try {
    const { assetOptimization } = await import("../middleware/asset-optimization.js");
    assetOptimization.resetStats();
    res.json({ message: "Compression statistics reset successfully" });
  } catch (error) {
    console.error("Reset compression stats error:", error);
    res.status(500).json({ message: "Failed to reset compression statistics" });
  }
});

router.get("/api/cdn/performance", requireAuth, async (req, res) => {
  try {
    const { cdnService } = await import("../cdn.js");
    const manifest = cdnService.getManifest();

    const totalAssets = Object.keys(manifest).length;
    const totalSize = Object.values(manifest).reduce(
      (sum: number, asset: { size?: number }) => sum + (asset.size || 0),
      0
    );
    const averageSize = totalAssets > 0 ? totalSize / totalAssets : 0;

    res.json({
      totalAssets,
      totalSize,
      averageSize,
      lastUpdated: new Date().toISOString(),
      cacheHeaders: "enabled",
      compression: "enabled",
    });
  } catch (error) {
    console.error("CDN performance error:", error);
    res.status(500).json({ message: "Failed to get CDN performance metrics" });
  }
});

router.post("/api/cdn/rebuild-manifest", requireAuth, async (req, res) => {
  try {
    const { cdnService } = await import("../cdn.js");
    await cdnService.initialize();
    res.json({ message: "Asset manifest rebuilt successfully" });
  } catch (error) {
    console.error("Rebuild manifest error:", error);
    res.status(500).json({ message: "Failed to rebuild asset manifest" });
  }
});

export default router;
