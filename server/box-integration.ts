/**
 * Box Integration for Client Folder Management and Document Automation
 */

import BoxSDK from "box-node-sdk";
import { logger } from "./logger";

// Initialize Box SDK with Developer Token (for development)
let sdk: any = null;
try {
  if (process.env["BOX_ACCESS_TOKEN"]) {
    sdk = new BoxSDK({
      clientID: "",
      clientSecret: "",
    });
    // Use developer token for development
    sdk = sdk.getBasicClient(process.env["BOX_ACCESS_TOKEN"]);
  }
} catch (error: any) {
  logger.warn("[Box] Failed to initialize Box SDK:", error);
}

export class BoxService {
  private client: any;

  constructor() {
    this.client = sdk;
    if (!this.client) {
      logger.warn(
        "[Box] Box client not initialized - Box features will be disabled",
      );
    }
  }

  /**
   * Create client folder structure in Box based on template
   * @param clientName - Business name for folder creation
   * @param templateFolderId - Template folder to copy from
   * @returns Created folder information
   */
  async createClientFolder(
    clientName: string,
    templateFolderId?: string,
  ): Promise<any> {
    try {
      // Default template folder ID (to be configured)
      const defaultTemplateId = process.env["BOX_TEMPLATE_FOLDER_ID"] || "0";
      const sourceId = templateFolderId || defaultTemplateId;

      logger.info("[Box] Creating client folder structure", {
        clientName,
        templateId: sourceId,
      });

      // Create main client folder
      const parentFolderId = process.env["BOX_CLIENT_FOLDERS_PARENT_ID"] || "0";
      const sanitizedClientName = this.sanitizeFolderName(clientName);

      const clientFolder = await this.client.folders.create(
        parentFolderId,
        sanitizedClientName,
      );
      logger.info("[Box] Client folder created", {
        folderId: clientFolder.id,
        name: clientFolder.name,
      });

      // Copy template folder structure if specified
      if (sourceId !== "0") {
        await this.copyFolderStructure(sourceId, clientFolder.id);
      }

      return {
        success: true,
        folderId: clientFolder.id,
        folderName: clientFolder.name,
        webUrl: `https://app.box.com/folder/${clientFolder.id}`,
      };
    } catch (error: any) {
      logger.error("[Box] Error creating client folder", error);
      throw new Error(
        `Failed to create client folder: ${(error as any)?.message}`,
      );
    }
  }

  /**
   * Copy folder structure from template to client folder
   */
  private async copyFolderStructure(
    sourceId: string,
    destinationId: string,
  ): Promise<void> {
    try {
      const sourceItems = await this.client.folders.getItems(sourceId);

      for (const item of sourceItems.entries) {
        if (item.type === "folder") {
          // Copy subfolder
          const newFolder = await this.client.folders.create(
            destinationId,
            item.name,
          );
          // Recursively copy contents
          await this.copyFolderStructure(item.id, newFolder.id);
        } else if (item.type === "file") {
          // Copy file
          await this.client.files.copy(item.id, destinationId);
        }
      }

      logger.info("[Box] Template folder structure copied", {
        sourceId,
        destinationId,
      });
    } catch (error) {
      logger.error("[Box] Error copying folder structure", error);
      throw error;
    }
  }

  /**
   * Upload MSA document with populated data
   * @param folderId - Client folder ID
   * @param msaBuffer - Generated MSA document buffer
   * @param fileName - File name for the MSA
   */
  async uploadMSA(
    folderId: string,
    msaBuffer: Buffer,
    fileName: string,
  ): Promise<any> {
    try {
      logger.info("[Box] Uploading MSA document", { folderId, fileName });

      const uploadedFile = await this.client.files.uploadFile(
        folderId,
        fileName,
        msaBuffer,
      );

      logger.info("[Box] MSA document uploaded successfully", {
        fileId: uploadedFile.entries[0].id,
        fileName: uploadedFile.entries[0].name,
      });

      return {
        success: true,
        fileId: uploadedFile.entries[0].id,
        fileName: uploadedFile.entries[0].name,
        webUrl: `https://app.box.com/file/${uploadedFile.entries[0].id}`,
      };
    } catch (error: any) {
      logger.error("[Box] Error uploading MSA document", error);
      throw new Error(`Failed to upload MSA: ${(error as any)?.message}`);
    }
  }

  /**
   * Upload SOW documents for selected services
   */
  async uploadSOWDocuments(
    folderId: string,
    services: string[],
  ): Promise<any[]> {
    try {
      const results = [];

      for (const service of services) {
        const sowTemplate = await this.getSOWTemplate(service);
        if (sowTemplate) {
          const result = await this.client.files.uploadFile(
            folderId,
            `${service}_SOW.docx`,
            sowTemplate,
          );
          results.push({
            service,
            fileId: result.entries[0].id,
            fileName: result.entries[0].name,
          });
        }
      }

      logger.info("[Box] SOW documents uploaded", {
        count: results.length,
        folderId,
      });
      return results;
    } catch (error) {
      logger.error("[Box] Error uploading SOW documents", error);
      throw error;
    }
  }

  /**
   * Get SOW template for specific service type
   */
  private async getSOWTemplate(service: string): Promise<Buffer | null> {
    // Template mapping for different service types
    const templates = {
      bookkeeping: process.env["BOX_BOOKKEEPING_SOW_TEMPLATE_ID"],
      taas: process.env["BOX_TAAS_SOW_TEMPLATE_ID"],
      payroll: process.env["BOX_PAYROLL_SOW_TEMPLATE_ID"],
      ap_ar_lite: process.env["BOX_APAR_SOW_TEMPLATE_ID"],
      fpa_lite: process.env["BOX_FPA_SOW_TEMPLATE_ID"],
    } as const;

    const templateId = templates[service as keyof typeof templates];
    if (!templateId) {
      logger.warn("[Box] No SOW template found for service", { service });
      return null;
    }

    try {
      const fileStream = await this.client.files.getReadStream(templateId);
      return this.streamToBuffer(fileStream);
    } catch (error) {
      logger.error("[Box] Error reading SOW template", {
        service,
        templateId,
        error,
      });
      return null;
    }
  }

  /**
   * Convert stream to buffer
   */
  private streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("end", () => resolve(Buffer.concat(chunks)));
      stream.on("error", reject);
    });
  }

  /**
   * Sanitize folder name for Box compatibility
   */
  private sanitizeFolderName(name: string): string {
    // Remove invalid characters and limit length
    return name
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 255);
  }

  /**
   * List items in a folder (files and subfolders)
   */
  async listFolderItems(
    folderId: string,
  ): Promise<
    Array<{
      id: string;
      name: string;
      type: "file" | "folder";
      size?: number;
      modified_at?: string;
    }>
  > {
    if (!this.client) {
      logger.warn("[Box] listFolderItems called without initialized client");
      return [];
    }
    try {
      const result = await this.client.folders.getItems(folderId, {
        limit: 1000,
      });
      const items = (result?.entries || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        size: e.size,
        modified_at: e.modified_at,
      }));
      return items;
    } catch (error) {
      logger.error("[Box] Failed to list folder items", { folderId, error });
      return [];
    }
  }

  /**
   * Get folder info with path ancestry
   */
  async getFolderInfo(folderId: string): Promise<any | null> {
    if (!this.client) return null;
    try {
      const info = await this.client.folders.get(folderId, {
        fields: "id,name,path_collection",
      });
      return info || null;
    } catch (error) {
      logger.error("[Box] Failed to get folder info", { folderId, error });
      return null;
    }
  }

  /**
   * Get file info with path ancestry
   */
  async getFileInfo(fileId: string): Promise<any | null> {
    if (!this.client) return null;
    try {
      const info = await this.client.files.get(fileId, {
        // include sha1/etag when available for stronger cache keys
        fields: "id,name,path_collection,size,modified_at,sha1,etag",
      });
      return info || null;
    } catch (error) {
      logger.error("[Box] Failed to get file info", { fileId, error });
      return null;
    }
  }

  /**
   * Get a readable stream for a file
   */
  async getFileReadStream(
    fileId: string,
  ): Promise<NodeJS.ReadableStream | null> {
    if (!this.client) return null;
    try {
      const stream = await this.client.files.getReadStream(fileId);
      return stream as NodeJS.ReadableStream;
    } catch (error) {
      logger.error("[Box] Failed to get file read stream", { fileId, error });
      return null;
    }
  }

  /**
   * Validate that a file/folder is within the configured CLIENTS root subtree
   */
  async isUnderClientsRoot(
    id: string,
    type: "file" | "folder",
  ): Promise<boolean> {
    const rootId = process.env["BOX_CLIENT_FOLDERS_PARENT_ID"];
    if (!rootId) return false;
    if (!this.client) return false;
    try {
      let info: any = null;
      if (type === "file") {
        info = await this.getFileInfo(id);
      } else {
        info = await this.getFolderInfo(id);
      }
      if (!info) return false;
      if (String(info.id) === String(rootId)) return true;
      const entries: any[] = info?.path_collection?.entries || [];
      return entries.some((e: any) => String(e.id) === String(rootId));
    } catch (error) {
      logger.error("[Box] isUnderClientsRoot check failed", {
        id,
        type,
        error,
      });
      return false;
    }
  }
}

export const boxService = new BoxService();
