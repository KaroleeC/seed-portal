import type { Job } from "bullmq";
import { GoogleAdminService } from "../google-admin";
import { storage } from "../storage";
import type { InsertWorkspaceUser } from "@shared/schema";

export interface WorkspaceSyncJobData {
  triggeredBy: "cron" | "manual";
  userId?: number; // For manual triggers
}

export async function workspaceSyncJob(job: Job<WorkspaceSyncJobData>) {
  const { triggeredBy, userId } = job.data;

  try {
    console.log(`[WorkspaceSync] Starting ${triggeredBy} sync job...`);

    // Create Google Admin service instance
    const googleAdminService = new GoogleAdminService();

    // Check if Google Admin API is configured
    const isConfigured = await googleAdminService.isConfigured();
    if (!isConfigured) {
      throw new Error("Google Admin API is not configured");
    }

    // Update job progress
    await job.updateProgress(10);

    // Fetch all users from Google Workspace
    console.log("[WorkspaceSync] Fetching users from Google Workspace...");
    const googleUsers = await googleAdminService.getAllDomainUsers();

    await job.updateProgress(50);

    // Transform Google users to database format
    const workspaceUsers: InsertWorkspaceUser[] = googleUsers.map((user) => ({
      googleId: user.id,
      email: user.primaryEmail,
      firstName: user.name.givenName || null,
      lastName: user.name.familyName || null,
      fullName: user.name.fullName || null,
      isAdmin: user.isAdmin,
      suspended: user.suspended,
      orgUnitPath: user.orgUnitPath || "/",
      lastLoginTime: user.lastLoginTime ? new Date(user.lastLoginTime) : null,
      creationTime: user.creationTime ? new Date(user.creationTime) : null,
      thumbnailPhotoUrl: user.thumbnailPhotoUrl || null,
      lastSyncedAt: new Date(),
      syncSource: "google_admin_api",
    }));

    await job.updateProgress(75);

    // Sync with database
    console.log(
      `[WorkspaceSync] Syncing ${workspaceUsers.length} users with database...`,
    );
    const syncResult = await storage.syncWorkspaceUsers(workspaceUsers);

    await job.updateProgress(100);

    const message = `Workspace sync completed: ${syncResult.created} created, ${syncResult.updated} updated, ${syncResult.deleted} deleted`;
    console.log(`[WorkspaceSync] ${message}`);

    return {
      success: true,
      message,
      stats: syncResult,
      userCount: workspaceUsers.length,
      triggeredBy,
      userId,
    };
  } catch (error: any) {
    console.error("[WorkspaceSync] Job failed:", error);
    throw new Error(`Workspace sync failed: ${error.message}`);
  }
}
