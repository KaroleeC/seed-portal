import Airtable from "airtable";

interface AirtableRecord {
  id: string;
  fields: {
    "Lead ID"?: number;
    Name?: string;
    Email?: string;
    Phone?: string;
    "Lead Type"?: string;
    Industry?: string;
    Revenue?: string;
    Status?: string;
    "Date Added"?: string;
    "Company Name"?: string;
    "Delivered Count"?: number;
    Urgency?: string;
    "Fully Assigned"?: boolean;
    "Enriched?"?: boolean;
    "Lead Score"?: number;
    "Contact Verified"?: string;
    "Business Operational"?: string;
    "Company Website"?: string;
    "LinkedIn Company Page"?: string;
    "Reasoning Summary"?: string;
    Location?: string;
    "Email (Formatted)"?: string;
    "Phone (Formatted)"?: string;
    "Lead Source"?: string;
    "Bookkeeping Status"?: string;
    "Date & Time Added"?: string;
  };
}

export class AirtableService {
  private base: any;
  private tableName: string = "BK Leads"; // Correct table name from user

  constructor() {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      console.warn("Airtable configuration missing - data enhancement will use AI only");
      return;
    }

    console.log("Initializing Airtable service with provided credentials");
    this.base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID
    );
  }

  // Search for company record by name or email
  async findCompanyByName(companyName: string, email?: string): Promise<AirtableRecord | null> {
    if (!this.base) {
      console.log("Airtable base not initialized - using AI fallback");
      return null;
    }

    try {
      console.log(
        `🔍 Searching Airtable BK Leads table for ${email ? `email: ${email}` : `company: ${companyName}`}`
      );

      // Search by email first (more accurate), then by company name as fallback
      let filterFormula = "";
      if (email) {
        filterFormula = `OR(
          SEARCH("${email.toLowerCase()}", LOWER({Email})) > 0,
          SEARCH("${email.toLowerCase()}", LOWER({Email (Formatted)})) > 0
        )`;
      } else {
        filterFormula = `SEARCH("${companyName.toLowerCase()}", LOWER({Company Name})) > 0`;
      }

      const records = await this.base(this.tableName)
        .select({
          filterByFormula: filterFormula,
          maxRecords: 1,
        })
        .firstPage();

      if (records.length > 0) {
        console.log(`✅ Found Airtable record for ${companyName}`);
        return {
          id: records[0].id,
          fields: records[0].fields,
        };
      } else {
        console.log(`❌ No Airtable record found for ${companyName}`);
        return null;
      }
    } catch (error) {
      console.error("❌ Airtable search error:", (error as Error).message);
      return null;
    }
  }

  // Get enriched company data from Airtable
  async getEnrichedCompanyData(companyName: string, email?: string): Promise<any> {
    const record = await this.findCompanyByName(companyName, email);
    if (!record) return null;

    const fields = record.fields;

    // Map Airtable BK Leads fields to HubSpot field names
    return {
      name: fields["Company Name"] || companyName,
      industry: this.mapToHubSpotIndustry(fields["Industry"]),
      annualrevenue: this.convertRevenueToNumber(fields["Revenue"]),
      website: fields["Company Website"],
      linkedin_company_page: fields["LinkedIn Company Page"],
      phone: fields["Phone"] || fields["Phone (Formatted)"],
      description: fields["Reasoning Summary"],
      city: this.extractCityFromLocation(fields["Location"]),
      state: this.extractStateFromLocation(fields["Location"]),
      lead_source: fields["Lead Source"],
      lead_type: fields["Lead Type"],
      contact_status: fields["Status"],
      bookkeeping_status: fields["Bookkeeping Status"],
      lead_score: fields["Lead Score"],
      contact_verified: fields["Contact Verified"],
      business_operational: fields["Business Operational"],
      urgency: fields["Urgency"],
      enriched: fields["Enriched?"],
      airtable_id: record.id,
      last_enriched: new Date().toISOString(),
    };
  }

  // Map Airtable industry values to valid HubSpot industry values
  private mapToHubSpotIndustry(airtableIndustry?: string): string | undefined {
    if (!airtableIndustry) return undefined;

    const industryMap: { [key: string]: string } = {
      software: "COMPUTER_SOFTWARE",
      technology: "COMPUTER_SOFTWARE",
      tech: "COMPUTER_SOFTWARE",
      saas: "COMPUTER_SOFTWARE",
      fintech: "FINANCIAL_SERVICES",
      finance: "FINANCIAL_SERVICES",
      banking: "FINANCIAL_SERVICES",
      healthcare: "HEALTH_WELLNESS_FITNESS",
      health: "HEALTH_WELLNESS_FITNESS",
      medical: "HEALTH_WELLNESS_FITNESS",
      dental: "HEALTH_WELLNESS_FITNESS",
      marketing: "MARKETING_ADVERTISING",
      advertising: "MARKETING_ADVERTISING",
      consulting: "CONSULTING",
      "real estate": "REAL_ESTATE",
      realestate: "REAL_ESTATE",
      retail: "RETAIL",
      restaurant: "RESTAURANTS",
      food: "RESTAURANTS",
      accounting: "ACCOUNTING",
      legal: "LEGAL_SERVICES",
      law: "LEGAL_SERVICES",
      construction: "CONSTRUCTION",
      automotive: "AUTOMOTIVE",
      education: "EDUCATION_MANAGEMENT",
      nonprofit: "NONPROFIT_ORGANIZATION_MANAGEMENT",
      it: "INFORMATION_TECHNOLOGY_SERVICES",
      hr: "HUMAN_RESOURCES",
      insurance: "INSURANCE",
      manufacturing: "MANUFACTURING",
      transportation: "TRANSPORTATION_TRUCKING_RAILROAD",
      logistics: "TRANSPORTATION_TRUCKING_RAILROAD",
    };

    const normalized = airtableIndustry.toLowerCase().trim();

    // Direct match
    if (industryMap[normalized]) {
      return industryMap[normalized];
    }

    // Partial match
    for (const [key, value] of Object.entries(industryMap)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return value;
      }
    }

    // Default fallback - only return valid HubSpot industry values
    console.log(
      `No mapping found for industry: ${airtableIndustry}, using default COMPUTER_SOFTWARE`
    );
    return "COMPUTER_SOFTWARE";
  }

  // Create new company record in Airtable
  async createCompanyRecord(companyData: any): Promise<string | null> {
    if (!this.base) {
      console.log("Airtable base not initialized - skipping record creation");
      return null;
    }

    try {
      console.log(`💾 Creating Airtable record for ${companyData.name}`);
      const record = await this.base(this.tableName).create([
        {
          fields: {
            "Company Name": companyData.name,
            Industry: companyData.industry,
            Revenue: companyData.annualrevenue,
            "Company Website": companyData.website,
            "LinkedIn Company Page": companyData.linkedin_company_page,
            Phone: companyData.phone,
            Location:
              companyData.city && companyData.state
                ? `${companyData.city}, ${companyData.state}`
                : undefined,
            "Lead Source": "HubSpot Integration",
            Status: "Available",
            "Enriched?": true,
            "Date Added": new Date().toISOString().substring(0, 10),
            "Date & Time Added": new Date().toISOString(),
            "Reasoning Summary": `AI-enhanced data from HubSpot integration for ${companyData.name}`,
          },
        },
      ]);

      console.log(`✅ Created Airtable record: ${record[0].id}`);
      return record[0].id;
    } catch (error) {
      console.error("❌ Airtable creation error:", (error as Error).message);
      return null;
    }
  }

  // Update existing company record
  async updateCompanyRecord(recordId: string, updates: any): Promise<boolean> {
    if (!this.base) return false;

    try {
      await this.base(this.tableName).update([
        {
          id: recordId,
          fields: {
            ...updates,
            "Last Updated": new Date().toISOString(),
          },
        },
      ]);
      return true;
    } catch (error) {
      console.error("Error updating Airtable record:", error);
      return false;
    }
  }

  // Helper method to extract city from location string
  private extractCityFromLocation(location?: string): string | undefined {
    if (!location) return undefined;
    const parts = location.split(",");
    return parts[0]?.trim();
  }

  // Helper method to extract state from location string
  private extractStateFromLocation(location?: string): string | undefined {
    if (!location) return undefined;
    const parts = location.split(",");
    return parts[1]?.trim();
  }

  // Helper method to convert revenue text to number format for HubSpot
  private convertRevenueToNumber(revenue?: string): string | undefined {
    if (!revenue) return undefined;

    // Extract numbers from revenue ranges like "$50,000 - $200,000"
    const match = revenue.match(/\$?([\d,]+)/);
    if (match) {
      const group = match[1];
      if (group) {
        // Remove commas and return as string number
        return group.replace(/,/g, "");
      }
    }

    // If no match, return undefined to let AI fill this field
    return undefined;
  }
}

// Export singleton instance
export const airtableService = new AirtableService();
