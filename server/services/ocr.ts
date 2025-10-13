import { ImageAnnotatorClient } from "@google-cloud/vision";
import { logger } from "../logger";

let visionClient: ImageAnnotatorClient | null = null;

/**
 * Initialize Google Cloud Vision client
 * Uses the same service account as Google Admin API
 */
function getVisionClient(): ImageAnnotatorClient | null {
  if (visionClient) return visionClient;

  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      logger.warn("[OCR] GOOGLE_SERVICE_ACCOUNT_JSON not configured, OCR disabled");
      return null;
    }

    const credentials = JSON.parse(serviceAccountJson);
    visionClient = new ImageAnnotatorClient({
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      projectId: credentials.project_id,
    });

    logger.info("[OCR] Google Cloud Vision client initialized");
    return visionClient;
  } catch (e: unknown) {
    logger.error(
      "[OCR] Failed to initialize Vision client:",
      e instanceof Error ? e.message : String(e)
    );
    return null;
  }
}

/**
 * Extract text from a PDF buffer using Google Cloud Vision OCR
 * @param buffer PDF file buffer
 * @param fileName Original file name (for logging)
 * @returns Extracted text or null if OCR fails
 */
export async function extractTextWithOCR(buffer: Buffer, fileName: string): Promise<string | null> {
  const client = getVisionClient();
  if (!client) {
    logger.warn("[OCR] Vision client not available, skipping OCR");
    return null;
  }

  try {
    logger.info(`[OCR] Starting OCR for ${fileName} (${buffer.length} bytes)`);
    const startTime = Date.now();

    // For PDFs, Vision API expects the content as base64
    const request = {
      requests: [
        {
          inputConfig: {
            content: buffer.toString("base64"),
            mimeType: "application/pdf",
          },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" as const }],
        },
      ],
    };

    const [result] = await client.batchAnnotateFiles(request);
    const responses = result.responses?.[0]?.responses;

    if (!responses || responses.length === 0) {
      logger.warn(`[OCR] No responses from Vision API for ${fileName}`);
      return null;
    }

    // Combine text from all pages
    const pages: string[] = [];
    for (const response of responses) {
      const fullText = response.fullTextAnnotation?.text;
      if (fullText) {
        pages.push(fullText.trim());
      }
    }

    const combinedText = pages.join("\n\n");
    const duration = Date.now() - startTime;

    if (combinedText.length === 0) {
      logger.warn(`[OCR] No text extracted from ${fileName}`);
      return null;
    }

    logger.info(`[OCR] Extracted ${combinedText.length} chars from ${fileName} in ${duration}ms`);
    return combinedText;
  } catch (e: unknown) {
    logger.error(
      `[OCR] Failed to extract text from ${fileName}:`,
      e instanceof Error ? e.message : String(e)
    );
    return null;
  }
}

/**
 * Check if a PDF buffer appears to be image-based (scanned)
 * Simple heuristic: if pdf-parse returns very little text relative to file size,
 * it's likely scanned
 */
export function isLikelyScannedPDF(extractedText: string, fileSize: number): boolean {
  // If we got less than 100 chars from a file > 50KB, likely scanned
  const threshold = fileSize > 50000 ? 100 : 50;
  return extractedText.length < threshold;
}
