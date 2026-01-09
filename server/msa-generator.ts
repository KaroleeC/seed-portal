/**
 * MSA Document Generator with Dynamic Field Population
 */

import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import fs from "fs/promises";
import path from "path";
import { logger } from "./logger";

export interface MSAData {
  clientLegalName: string;
  entityType: string;
  stateJurisdiction: string;
  clientAddress: string;
  effectiveDate: string;
  selectedServices: string[];
  // Additional fields from quote data
  contactEmail: string;
  industry: string;
  monthlyFee?: number;
  setupFee?: number;
}

export class MSAGenerator {
  /**
   * Generate MSA document with populated data
   */
  async generateMSA(data: MSAData): Promise<Buffer> {
    try {
      logger.info("[MSA] Generating MSA document", {
        client: data.clientLegalName,
        services: data.selectedServices,
      });

      // Create document with populated fields
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              this.createHeader(),
              this.createTitle(),
              this.createParties(data),
              this.createRecitals(data),
              this.createServiceFramework(data),
              this.createClientObligations(),
              this.createFeesSection(data),
              this.createTermAndTermination(),
              // Add remaining sections...
            ],
          },
        ],
      });

      // Convert to buffer
      const buffer = await Packer.toBuffer(doc);
      logger.info("[MSA] MSA document generated successfully", {
        size: buffer.length,
        client: data.clientLegalName,
      });

      return buffer;
    } catch (error: any) {
      logger.error("[MSA] Error generating MSA document", error);
      throw new Error(`Failed to generate MSA: ${(error as any)?.message}`);
    }
  }

  /**
   * Create document header
   */
  private createHeader(): Paragraph {
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: "SEED FINANCIAL MASTER SERVICES AGREEMENT",
          bold: true,
          size: 28,
        }),
      ],
    });
  }

  /**
   * Create document title section
   */
  private createTitle(): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: '\n\nThis Master Services Agreement ("Agreement") is entered into as of ',
          size: 24,
        }),
      ],
    });
  }

  /**
   * Create parties section with populated data
   */
  private createParties(data: MSAData): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: `[${data.effectiveDate}] ("Effective Date") by and between:\n\n`,
          bold: true,
          size: 24,
        }),
        new TextRun({
          text: 'Seed Financial & Insurance Services LLC, a California limited liability company, with its principal place of business at 4136 Del Rey Ave, Suite 521, Marina Del Rey, California 90292 ("Company" or "Seed")\n\n',
          size: 24,
        }),
        new TextRun({
          text: "AND\n\n",
          bold: true,
          size: 24,
        }),
        new TextRun({
          text: `${data.clientLegalName}, a ${data.entityType} organized under the laws of ${data.stateJurisdiction}, with its principal place of business at ${data.clientAddress} (\"Client\")\n\n`,
          size: 24,
        }),
        new TextRun({
          text: 'Each individually a "Party" and collectively the "Parties."\n\n',
          size: 24,
        }),
      ],
    });
  }

  /**
   * Create recitals section
   */
  private createRecitals(data: MSAData): Paragraph {
    const serviceList = this.getServiceDescriptions(data.selectedServices);

    return new Paragraph({
      children: [
        new TextRun({
          text: "RECITALS\n\n",
          bold: true,
          size: 24,
        }),
        new TextRun({
          text: `WHEREAS, Company provides professional financial services including ${serviceList}; and\n\n`,
          size: 24,
        }),
        new TextRun({
          text: "WHEREAS, Client desires to engage Company to provide certain services as more particularly described in one or more Order Forms and Service Schedules; and\n\n",
          size: 24,
        }),
        new TextRun({
          text: "WHEREAS, the Parties desire to set forth the general terms and conditions that will govern their relationship.\n\n",
          size: 24,
        }),
      ],
    });
  }

  /**
   * Create service framework section
   */
  private createServiceFramework(data: MSAData): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: "NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:\n\n",
          size: 24,
        }),
        new TextRun({
          text: "1. SERVICES FRAMEWORK\n\n",
          bold: true,
          size: 24,
        }),
        new TextRun({
          text: "1.1 Service Authorization\n\n",
          bold: true,
          size: 24,
        }),
        new TextRun({
          text: 'Services shall be initiated only upon execution of a written Order Form or Statement of Work ("SOW") signed by authorized representatives of both Parties. Each Order Form/SOW shall reference one or more Service Schedules and shall be incorporated by reference into this Agreement.\n\n',
          size: 24,
        }),
      ],
    });
  }

  /**
   * Create client obligations section
   */
  private createClientObligations(): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: "2. CLIENT OBLIGATIONS AND REPRESENTATIONS\n\n",
          bold: true,
          size: 24,
        }),
        new TextRun({
          text: "2.1 Access and Cooperation\n\n",
          bold: true,
          size: 24,
        }),
        new TextRun({
          text: "Client shall provide Company with timely access to all systems, platforms, records, and information reasonably necessary for performance of the Services and maintain such access throughout the term of each Service module.\n\n",
          size: 24,
        }),
      ],
    });
  }

  /**
   * Create fees section with pricing data
   */
  private createFeesSection(data: MSAData): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: "3. FEES, BILLING, AND PAYMENT TERMS\n\n",
          bold: true,
          size: 24,
        }),
        new TextRun({
          text: "3.1 Subscription Fees\n\n",
          bold: true,
          size: 24,
        }),
        new TextRun({
          text: `Services are provided on a monthly subscription basis at the rates specified in the applicable Order Form. Monthly fees: $${data.monthlyFee || 0}. Setup fees: $${data.setupFee || 0}.\n\n`,
          size: 24,
        }),
      ],
    });
  }

  /**
   * Create term and termination section
   */
  private createTermAndTermination(): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text: "4. TERM AND TERMINATION\n\n",
          bold: true,
          size: 24,
        }),
        new TextRun({
          text: "4.1 Initial Term\n\n",
          bold: true,
          size: 24,
        }),
        new TextRun({
          text: 'The initial term of this Agreement shall be twelve (12) months from the Effective Date ("Initial Term"). The Agreement shall automatically renew for successive twelve-month periods unless either Party provides written notice of non-renewal at least sixty (60) days prior to the end of the then-current term.\n\n',
          size: 24,
        }),
      ],
    });
  }

  /**
   * Convert selected services to descriptive text
   */
  private getServiceDescriptions(services: string[]): string {
    const descriptions = {
      bookkeeping: "bookkeeping and financial reporting",
      taas: "tax preparation and filing services",
      payroll: "payroll administration services",
      ap_ar_lite: "accounts payable and receivable management",
      fpa_lite: "financial planning and analysis services",
    };

    const serviceTexts = services.map(
      (service) =>
        descriptions[service as keyof typeof descriptions] || service,
    );

    if (serviceTexts.length === 1) return serviceTexts[0] || "";
    if (serviceTexts.length === 2) return serviceTexts.join(" and ");

    return (
      `${serviceTexts.slice(0, -1).join(", ")  }, and ${  serviceTexts.slice(-1)}`
    );
  }
}

export const msaGenerator = new MSAGenerator();
