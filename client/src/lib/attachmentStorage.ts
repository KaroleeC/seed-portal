import { supabase } from "./supabaseClient";

export interface StoredAttachment {
  filename: string;
  storageUrl: string;
  contentType?: string;
  size: number;
}

/**
 * Upload a file to Supabase Storage
 * Files are organized by user ID and draft ID for easy cleanup
 */
export async function uploadAttachment(
  file: File,
  userId: string,
  draftId: string,
  onProgress?: (progress: number) => void
): Promise<StoredAttachment> {
  // Generate unique filename to avoid collisions
  const timestamp = Date.now();
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${draftId}/${timestamp}-${sanitizedFilename}`;

  // Upload to Supabase Storage with progress tracking
  const { data, error } = await supabase.storage.from("email-attachments").upload(filePath, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("[Attachment] Upload failed:", error);
    throw new Error(`Failed to upload ${file.name}: ${error.message}`);
  }

  // Get signed URL (valid for 1 hour by default, can extend for sent emails)
  const { data: urlData } = await supabase.storage
    .from("email-attachments")
    .createSignedUrl(filePath, 3600); // 1 hour

  if (!urlData?.signedUrl) {
    throw new Error("Failed to get signed URL for attachment");
  }

  if (onProgress) {
    onProgress(100);
  }

  return {
    filename: file.name,
    storageUrl: urlData.signedUrl,
    contentType: file.type,
    size: file.size,
  };
}

/**
 * Delete an attachment from Supabase Storage
 */
export async function deleteAttachment(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from("email-attachments").remove([storagePath]);

  if (error) {
    console.error("[Attachment] Delete failed:", error);
    throw error;
  }
}

/**
 * Delete all attachments for a draft
 */
export async function deleteDraftAttachments(userId: string, draftId: string): Promise<void> {
  const { data: files, error: listError } = await supabase.storage
    .from("email-attachments")
    .list(`${userId}/${draftId}`);

  if (listError) {
    console.error("[Attachment] List failed:", listError);
    return;
  }

  if (!files || files.length === 0) return;

  const filePaths = files.map((file) => `${userId}/${draftId}/${file.name}`);
  const { error: deleteError } = await supabase.storage.from("email-attachments").remove(filePaths);

  if (deleteError) {
    console.error("[Attachment] Bulk delete failed:", deleteError);
  }
}

/**
 * Helper to extract storage path from signed URL
 */
export function getStoragePathFromUrl(signedUrl: string): string | null {
  try {
    const url = new URL(signedUrl);
    const pathMatch = url.pathname.match(/\/object\/sign\/email-attachments\/(.+)\?/);
    return pathMatch?.[1] ?? null;
  } catch {
    return null;
  }
}
