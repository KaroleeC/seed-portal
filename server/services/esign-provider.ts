/**
 * E-Sign Provider Service
 * Phase 0: Stub implementation
 *
 * Two signing paths:
 * 1. Canvas signature (lightweight, stored in DB)
 * 2. DocuSeal (formal documents, external provider)
 */

export interface CanvasSignatureRecord {
  quoteId: string;
  signerEmail: string;
  signerName: string;
  signatureDataUrl: string; // Base64 PNG from canvas
  ipAddress?: string;
  timestamp: Date;
}

export interface DocuSealEnvelopeRequest {
  documentUrl: string;
  signers: Array<{
    email: string;
    name: string;
    role: string;
  }>;
  subject?: string;
  message?: string;
}

export interface DocuSealEnvelope {
  id: string;
  status: string;
  signUrl: string;
}

/**
 * Create a canvas signature record (lightweight e-sign)
 * Used for simple agreements where formal signing is not required
 * Phase 0: Returns stub data
 */
export async function createCanvasSignatureRecord(
  signature: CanvasSignatureRecord
): Promise<{ id: string; status: string }> {
  console.log("[ESignProvider:Stub] Would create canvas signature:", {
    quoteId: signature.quoteId,
    signerEmail: signature.signerEmail,
    timestamp: signature.timestamp,
  });

  // Phase 2: Store in DB (e.g., quote_signatures table)
  // await db.insert(quoteSignatures).values({
  //   quoteId: signature.quoteId,
  //   signerEmail: signature.signerEmail,
  //   signerName: signature.signerName,
  //   signatureData: signature.signatureDataUrl,
  //   ipAddress: signature.ipAddress,
  //   createdAt: signature.timestamp,
  // });

  return {
    id: `sig_${Date.now()}`,
    status: "completed",
  };
}

/**
 * Create a DocuSeal envelope for formal document signing
 * Phase 0: Returns stub data
 * Phase 2+: Integrate with DocuSeal API
 */
export async function createDocuSealEnvelope(
  request: DocuSealEnvelopeRequest
): Promise<DocuSealEnvelope> {
  const docuSealApiKey = process.env.DOCUSEAL_API_KEY;

  if (!docuSealApiKey) {
    console.warn("[ESignProvider] DocuSeal API key not configured");
  }

  console.log("[ESignProvider:Stub] Would create DocuSeal envelope:", {
    documentUrl: request.documentUrl,
    signers: request.signers.map((s) => s.email),
  });

  // Phase 0: Return stub
  return {
    id: `env_${Date.now()}`,
    status: "sent",
    signUrl: "https://stub.docuseal.co/sign/placeholder",
  };

  // Phase 2+: Actual DocuSeal implementation
  // const response = await fetch("https://api.docuseal.co/envelopes", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${docuSealApiKey}`,
  //   },
  //   body: JSON.stringify({
  //     document_url: request.documentUrl,
  //     signers: request.signers.map((signer) => ({
  //       email: signer.email,
  //       name: signer.name,
  //       role: signer.role,
  //     })),
  //     subject: request.subject,
  //     message: request.message,
  //   }),
  // });
  //
  // if (!response.ok) {
  //   throw new Error(`DocuSeal API error: ${response.statusText}`);
  // }
  //
  // return await response.json();
}

/**
 * Check the status of a DocuSeal envelope
 * Phase 0: Returns stub data
 */
export async function getDocuSealEnvelopeStatus(envelopeId: string): Promise<{
  id: string;
  status: "sent" | "viewed" | "completed" | "declined" | "expired";
  completedAt?: Date;
}> {
  console.log("[ESignProvider:Stub] Would check envelope status:", envelopeId);

  return {
    id: envelopeId,
    status: "sent",
  };

  // Phase 2+: Actual DocuSeal implementation
  // const docuSealApiKey = process.env.DOCUSEAL_API_KEY;
  // const response = await fetch(`https://api.docuseal.co/envelopes/${envelopeId}`, {
  //   headers: {
  //     Authorization: `Bearer ${docuSealApiKey}`,
  //   },
  // });
  //
  // if (!response.ok) {
  //   throw new Error(`DocuSeal API error: ${response.statusText}`);
  // }
  //
  // return await response.json();
}
