import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { uploadAttachment } from "@/lib/attachmentStorage";

interface UploadedAttachment {
  filename: string;
  contentBase64: string;
  contentType?: string;
  storageUrl?: string;
  size?: number;
}

export function useAttachmentUpload(draftId: string | null) {
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Size constants
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
  const WARN_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const STORAGE_THRESHOLD = 1 * 1024 * 1024; // 1MB - use storage for files >= 1MB

  const validateFile = (file: globalThis.File): boolean => {
    // Block files >25MB
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File too large",
        description: `${file.name} exceeds 25MB limit. Please use a smaller file.`,
        variant: "destructive",
      });
      return false;
    }

    // Warn for files >10MB
    if (file.size > WARN_FILE_SIZE) {
      toast({
        title: "Large file",
        description: `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB. This may take a while to upload.`,
      });
    }

    return true;
  };

  async function fileToBase64(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const buf = await file.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    const totalChunks = Math.ceil(bytes.length / chunk);

    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]
      );
      if (onProgress) {
        const progress = Math.min(100, Math.round((i / chunk / totalChunks) * 100));
        onProgress(progress);
      }
    }
    return btoa(binary);
  }

  const uploadFiles = async (files: FileList | null): Promise<UploadedAttachment[]> => {
    if (!files) return [];

    // Get current user for storage path
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload attachments",
        variant: "destructive",
      });
      return [];
    }

    const currentDraftId = draftId || `temp-${Date.now()}`;
    const uploadedAttachments: UploadedAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f || !validateFile(f)) continue;

      const fileKey = `${f.name}-${Date.now()}`;
      setUploadProgress((prev) => ({ ...prev, [fileKey]: 0 }));

      try {
        // Use Supabase Storage for large files, base64 for small files
        const useStorage = f.size >= STORAGE_THRESHOLD;

        if (useStorage) {
          const storedAttachment = await uploadAttachment(
            f,
            user.id,
            currentDraftId,
            (progress) => {
              setUploadProgress((prev) => ({ ...prev, [fileKey]: progress }));
            }
          );

          uploadedAttachments.push({
            filename: storedAttachment.filename,
            contentBase64: "", // Empty for storage-based attachments
            contentType: storedAttachment.contentType,
            storageUrl: storedAttachment.storageUrl,
            size: storedAttachment.size,
          });
        } else {
          // Fallback to base64 for small files
          const b64 = await fileToBase64(f, (progress) => {
            setUploadProgress((prev) => ({ ...prev, [fileKey]: progress }));
          });
          uploadedAttachments.push({
            filename: f.name,
            contentBase64: b64,
            contentType: f.type,
            size: f.size,
          });
        }

        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileKey];
          return newProgress;
        });
      } catch (error) {
        console.error(`Failed to attach ${f.name}:`, error);
        toast({
          title: "Upload failed",
          description: `Could not attach ${f.name}`,
          variant: "destructive",
        });
        setUploadProgress((prev) => {
          const newProgress = { ...prev };
          delete newProgress[fileKey];
          return newProgress;
        });
      }
    }

    return uploadedAttachments;
  };

  return {
    uploadFiles,
    uploadProgress,
    validateFile,
  };
}
