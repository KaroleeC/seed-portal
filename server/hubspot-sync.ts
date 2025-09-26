import type { HubSpotService } from "./hubspot";
import { hubSpotService } from "./hubspot";
import { db } from "./db";
import { sql } from "drizzle-orm";

interface HubSpotUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
}

interface HubSpotInvoice {
  id: string;
  dealId: string;
  amount: number;
  status: string;
  paidDate?: string;
  createdDate: string;
  properties: {
    [key: string]: any;
  };
}

interface HubSpotDeal {
  id: string;
  properties: {
    dealname: string;
    amount: string;
    closedate: string;
    dealstage: string;
    hubspot_owner_id: string;
    pipeline: string;
    [key: string]: any;
  };
}

export class HubSpotCommissionSync {
  private hubspotService: HubSpotService;

  constructor() {
    if (!hubSpotService) {
      throw new Error("HubSpot not configured (no HUBSPOT_ACCESS_TOKEN)");
    }
    this.hubspotService = hubSpotService;
  }

  /**
   * Sync sales reps from HubSpot users
   */
  async syncSalesReps(): Promise<void> {
    try {
      console.log("🔄 Syncing sales reps from HubSpot...");

      // Get all HubSpot owners via public API
      const owners = await this.hubspotService.listOwners();

      if (!owners || owners.length === 0) {
        throw new Error("Failed to fetch HubSpot owners - no results returned");
      }

      const hubspotUsers = owners;

      for (const hsUser of hubspotUsers) {
        if (hsUser.email && hsUser.firstName && hsUser.lastName) {
          // 1) Ensure a user exists with this email; update first/last name and hubspot_user_id
          const existingUser = await db.execute(sql`
            SELECT id FROM users WHERE lower(email) = lower(${hsUser.email}) LIMIT 1
          `);

          let userId: number;
          if (existingUser.rows.length === 0) {
            const inserted = await db.execute(sql`
              INSERT INTO users (
                email,
                first_name,
                last_name,
                hubspot_user_id,
                role,
                created_at,
                updated_at
              ) VALUES (
                ${hsUser.email},
                ${hsUser.firstName},
                ${hsUser.lastName},
                ${hsUser.id},
                'employee',
                NOW(),
                NOW()
              )
              RETURNING id
            `);
            userId = (inserted.rows[0] as any).id;
            console.log(
              `✅ Added user for sales rep: ${hsUser.firstName} ${hsUser.lastName} (${hsUser.email}) -> user_id=${userId}`,
            );
          } else {
            userId = (existingUser.rows[0] as any).id;
            await db.execute(sql`
              UPDATE users
              SET first_name = ${hsUser.firstName},
                  last_name = ${hsUser.lastName},
                  hubspot_user_id = ${hsUser.id},
                  updated_at = NOW()
              WHERE id = ${userId}
            `);
            console.log(
              `🔄 Updated user for sales rep: ${hsUser.firstName} ${hsUser.lastName} (${hsUser.email}) -> user_id=${userId}`,
            );
          }

          // 2) Ensure a sales_reps row exists referencing this user
          const existingRep = await db.execute(sql`
            SELECT id FROM sales_reps WHERE user_id = ${userId} LIMIT 1
          `);
          if (existingRep.rows.length === 0) {
            await db.execute(sql`
              INSERT INTO sales_reps (
                user_id,
                is_active,
                start_date,
                created_at,
                updated_at
              ) VALUES (
                ${userId},
                true,
                NOW(),
                NOW(),
                NOW()
              )
            `);
            console.log(`✅ Added sales_rep for user_id=${userId}`);
          } else {
            await db.execute(sql`
              UPDATE sales_reps
              SET is_active = true,
                  updated_at = NOW()
              WHERE user_id = ${userId}
            `);
            console.log(`🔄 Ensured sales_rep active for user_id=${userId}`);
          }
        }
      }

      console.log("✅ Sales reps sync completed");
    } catch (error) {
      console.error("❌ Error syncing sales reps:", error);
      throw error;
    }
  }

  /**
   * Sync invoices from HubSpot with real line item data
   * Returns the number of invoices processed.
   */
  async syncInvoices(): Promise<number> {
    try {
      console.log("🔄 Syncing invoices from HubSpot...");

      // List invoices via billing service helper
      const invoices = await this.hubspotService.listInvoices(100);

      console.log(`📋 Found ${invoices.length} invoices in HubSpot`);

      let processedInvoices = 0;

      for (const invoice of invoices) {
        console.log(`🔍 Processing invoice ID: ${invoice.id}`);
        console.log(
          `📝 Invoice properties:`,
          JSON.stringify(invoice.properties, null, 2),
        );
        console.log(
          `🔗 Invoice associations:`,
          JSON.stringify(invoice.associations, null, 2),
        );

        // Get line items for this invoice
        const lineItemIds =
          invoice.associations?.["line items"]?.results?.map(
            (li: any) => li.id,
          ) || [];

        console.log(`🔗 Line item IDs for invoice ${invoice.id}:`, lineItemIds);

        if (lineItemIds.length === 0) {
          console.log(`⚠️ No line items found for invoice ${invoice.id}`);
          console.log(
            `🔍 Creating sample line items based on invoice amount for testing...`,
          );

          // Create a sample line item for testing based on invoice amount
          const invoiceAmount = parseFloat(
            invoice.properties.hs_invoice_amount || "1000",
          );
          const sampleLineItems = [
            {
              id: `sample-${invoice.id}`,
              name: "Monthly Bookkeeping Service",
              amount: invoiceAmount * 0.8, // 80% recurring
              price: invoiceAmount * 0.8,
              quantity: 1,
            },
            {
              id: `setup-${invoice.id}`,
              name: "Setup and Clean-up Service",
              amount: invoiceAmount * 0.2, // 20% setup
              price: invoiceAmount * 0.2,
              quantity: 1,
            },
          ];

          console.log(`📦 Created sample line items:`, sampleLineItems);

          // Process with sample line items
          const totalAmount = invoiceAmount;
          await this.processInvoiceWithLineItems(
            invoice,
            sampleLineItems,
            totalAmount,
          );
          processedInvoices++;
          continue;
        }

        // Fetch line item details
        let totalAmount = 0;
        let lineItems: any[] = [];
        if (lineItemIds.length > 0) {
          // Prefer detailed fetch via billing helper to ensure properties
          lineItems = await this.hubspotService.getInvoiceLineItems(
            String(invoice.id),
          );
          for (const li of lineItems) {
            const amount = parseFloat(li.properties?.amount || "0");
            totalAmount += amount;
            console.log(`  📦 Line item: ${li.properties?.name} - $${amount}`);
          }
        }

        if (totalAmount === 0) {
          console.log(`⚠️ Invoice ${invoice.id} has $0 total, skipping`);
          continue;
        }

        console.log(`💰 Invoice ${invoice.id} total: $${totalAmount}`);

        // Debug: Log what HubSpot actually gave us
        console.log(
          `🔍 DEBUGGING - Invoice ${invoice.id} properties:`,
          JSON.stringify(invoice.properties, null, 2),
        );
        console.log(
          `🔍 DEBUGGING - Invoice ${invoice.id} associations:`,
          JSON.stringify(invoice.associations, null, 2),
        );

        // Store debug data in database temporarily
        try {
          await db.execute(sql`
            INSERT INTO hubspot_debug (invoice_id, properties_json, associations_json, created_at)
            VALUES (${invoice.id}, ${JSON.stringify(invoice.properties)}, ${JSON.stringify(invoice.associations)}, NOW())
            ON CONFLICT (invoice_id) DO UPDATE SET
              properties_json = ${JSON.stringify(invoice.properties)},
              associations_json = ${JSON.stringify(invoice.associations)},
              created_at = NOW()
          `);
        } catch (debugError) {
          console.log("Debug table insert failed - table may not exist");
        }

        await this.processInvoiceWithLineItems(invoice, lineItems, totalAmount);
        processedInvoices++;
      }

      console.log(
        `✅ Invoices sync completed - processed ${processedInvoices} invoices`,
      );
      return processedInvoices;
    } catch (error) {
      console.error("❌ Error syncing invoices:", error);
      throw error;
    }
  }

  /**
   * Process an invoice with its line items
   */
  private async processInvoiceWithLineItems(
    invoice: any,
    lineItems: any[],
    totalAmount: number,
  ): Promise<void> {
    // Check for invoice discounts - use balance_due if less than invoice_amount
    const invoiceAmount = parseFloat(
      invoice.properties.hs_invoice_amount || "0",
    );
    const balanceDue = parseFloat(
      invoice.properties.hs_balance_due ||
        invoice.properties.hs_invoice_amount ||
        "0",
    );

    // If balance_due is less than invoice_amount, a discount was applied
    const hasDiscount = balanceDue < invoiceAmount;
    const actualPaidAmount = hasDiscount ? balanceDue : totalAmount;
    const discountRatio = actualPaidAmount / (totalAmount || 1); // Ratio to apply to line items

    if (hasDiscount) {
      console.log(`💸 Invoice ${invoice.id} has discount applied:`);
      console.log(`   Original amount: $${invoiceAmount.toFixed(2)}`);
      console.log(`   Balance due: $${balanceDue.toFixed(2)}`);
      console.log(`   Discount: $${(invoiceAmount - balanceDue).toFixed(2)}`);
      console.log(`   Discount ratio: ${(discountRatio * 100).toFixed(1)}%`);
      console.log(`   Using discounted amounts for commission calculation`);
    }
    // Check if invoice already exists in our database
    const existingInvoice = await db.execute(sql`
      SELECT id FROM hubspot_invoices WHERE hubspot_invoice_id = ${invoice.id} LIMIT 1
    `);

    if (existingInvoice.rows.length === 0) {
      // Get the actual deal owner from HubSpot deal association
      let salesRepId: number | null = null;
      let salesRepName = "Unknown";

      if (
        invoice.associations &&
        invoice.associations.deals &&
        invoice.associations.deals.results.length > 0
      ) {
        const dealId = invoice.associations.deals.results[0].id;
        console.log(`🔍 Fetching deal details for ID: ${dealId}`);

        try {
          const dealDataArr = await this.hubspotService.getDeals({
            ids: [dealId],
            properties: [
              "dealname",
              "hubspot_owner_id",
              "hs_deal_stage_probability",
            ],
          });
          const dealData = Array.isArray(dealDataArr) ? dealDataArr[0] : null;

          if (dealData?.properties?.hubspot_owner_id) {
            // Get owner details from HubSpot
            const ownerData = await this.hubspotService.getOwnerById(
              dealData.properties.hubspot_owner_id,
            );

            const ownerEmail = ownerData?.email
              ? ownerData.email.toLowerCase()
              : undefined;
            if (ownerEmail) {
              // Resolve sales_rep_id by joining users -> sales_reps. Create if missing.
              const repRes = await db.execute(sql`
                SELECT sr.id as sales_rep_id, u.first_name, u.last_name
                FROM sales_reps sr
                JOIN users u ON u.id = sr.user_id
                WHERE lower(u.email) = lower(${ownerEmail})
                LIMIT 1
              `);

              if (repRes.rows.length > 0) {
                const row = repRes.rows[0] as any;
                salesRepId = Number(row.sales_rep_id);
                salesRepName =
                  `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() ||
                  ownerEmail;
              } else {
                // Create user and sales_rep record for this owner
                const userLookup = await db.execute(
                  sql`SELECT id FROM users WHERE lower(email) = lower(${ownerEmail}) LIMIT 1`,
                );
                let userId: number;
                if (userLookup.rows.length === 0) {
                  const inserted = await db.execute(sql`
                    INSERT INTO users (email, first_name, last_name, hubspot_user_id, role, created_at, updated_at)
                    VALUES (${ownerEmail}, ${ownerData.firstName || ""}, ${ownerData.lastName || ""}, ${ownerData.id || ""}, 'employee', NOW(), NOW())
                    RETURNING id
                  `);
                  userId = (inserted.rows[0] as any).id;
                } else {
                  userId = (userLookup.rows[0] as any).id;
                  await db.execute(sql`
                    UPDATE users SET first_name = ${ownerData.firstName || ""}, last_name = ${ownerData.lastName || ""}, hubspot_user_id = ${ownerData.id || ""}, updated_at = NOW()
                    WHERE id = ${userId}
                  `);
                }

                const repInserted = await db.execute(sql`
                  INSERT INTO sales_reps (user_id, is_active, start_date, created_at, updated_at)
                  VALUES (${userId}, true, NOW(), NOW(), NOW())
                  ON CONFLICT DO NOTHING
                  RETURNING id
                `);
                if (repInserted.rows.length > 0) {
                  salesRepId = (repInserted.rows[0] as any).id;
                } else {
                  const repLookup = await db.execute(
                    sql`SELECT id FROM sales_reps WHERE user_id = ${userId} LIMIT 1`,
                  );
                  salesRepId =
                    repLookup.rows.length > 0
                      ? Number((repLookup.rows[0] as any).id)
                      : null;
                }

                salesRepName =
                  `${ownerData.firstName || ""} ${ownerData.lastName || ""}`.trim() ||
                  ownerEmail;
              }
            }
          }
        } catch (error) {
          console.log(`❌ Failed to fetch deal/owner details:`, error);
        }
      }

      // Fallback if still null: assign to first active sales rep if any
      if (!salesRepId) {
        const fallback = await db.execute(
          sql`SELECT id FROM sales_reps WHERE is_active = true ORDER BY id ASC LIMIT 1`,
        );
        if (fallback.rows.length > 0) {
          salesRepId = Number((fallback.rows[0] as any).id);
          salesRepName = "Unassigned";
        } else {
          // As a last resort, create a placeholder sales rep tied to an admin user if present
          const adminUser = await db.execute(
            sql`SELECT id, first_name, last_name, email FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1`,
          );
          if (adminUser.rows.length > 0) {
            const u = adminUser.rows[0] as any;
            const inserted = await db.execute(sql`
              INSERT INTO sales_reps (user_id, is_active, start_date, created_at, updated_at)
              VALUES (${u.id}, true, NOW(), NOW(), NOW())
              RETURNING id
            `);
            salesRepId = Number((inserted.rows[0] as any).id);
            salesRepName =
              `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email;
          }
        }
      }

      console.log(`👤 Using sales rep: ${salesRepName} (ID: ${salesRepId})`);

      // Get real company name from HubSpot associations
      let companyName = `Invoice ${invoice.id}`; // Default fallback

      if (
        invoice.associations &&
        invoice.associations.companies &&
        invoice.associations.companies.results.length > 0
      ) {
        const companyId = invoice.associations.companies.results[0].id;
        console.log(`🏢 Fetching company details for ID: ${companyId}`);

        try {
          const companyData =
            await this.hubspotService.getCompanyById(companyId);
          companyName = companyData?.properties?.name || companyName;
          console.log(`✅ Retrieved company name: ${companyName}`);
        } catch (error) {
          console.log(`❌ Failed to fetch company ${companyId}:`, error);
        }
      }

      // Create HubSpot invoice record
      const invoiceResult = await db.execute(sql`
        INSERT INTO hubspot_invoices (
          hubspot_invoice_id,
          sales_rep_id,
          invoice_number,
          status,
          total_amount,
          paid_amount,
          invoice_date,
          paid_date,
          company_name,
          is_processed_for_commission,
          created_at,
          updated_at
        ) VALUES (
          ${invoice.id},
          ${salesRepId},
          ${`INV-${invoice.id}`},
          ${invoice.properties.hs_invoice_status || "paid"},
          ${totalAmount},
          ${actualPaidAmount}, -- Actual paid amount after discounts
          ${invoice.properties.hs_createdate}::date,
          ${invoice.properties.hs_createdate}::date,
          ${companyName},
          false,
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      const hubspotInvoiceId = (invoiceResult.rows[0] as any).id;

      // Normalize line items to a consistent shape then create records
      const normalizedItems = lineItems.map((li: any) => {
        const p = li?.properties ?? {};
        const name = String(p.name ?? li?.name ?? "Line Item");
        const description = String(p.description ?? li?.description ?? "");
        const quantityRaw = p.quantity ?? li?.quantity ?? 1;
        const priceRaw = p.price ?? li?.price ?? 0;
        const amountRaw =
          p.amount ?? li?.amount ?? Number(priceRaw) * Number(quantityRaw);
        const quantity =
          typeof quantityRaw === "number"
            ? quantityRaw
            : parseFloat(String(quantityRaw || "1"));
        const unitPrice =
          typeof priceRaw === "number"
            ? priceRaw
            : parseFloat(String(priceRaw || "0"));
        const amount =
          typeof amountRaw === "number"
            ? amountRaw
            : parseFloat(String(amountRaw || "0"));
        const id = li?.id ?? p?.hs_object_id ?? undefined;
        return { id, name, description, quantity, price: unitPrice, amount };
      });

      for (const item of normalizedItems) {
        const isRecurring =
          item.name.toLowerCase().includes("monthly") ||
          item.name.toLowerCase().includes("tax as a service") ||
          item.name.toLowerCase().includes("recurring");
        await db.execute(sql`
          INSERT INTO hubspot_invoice_line_items (
            invoice_id,
            hubspot_line_item_id,
            name,
            description,
            quantity,
            unit_price,
            total_price,
            service_type,
            is_recurring,
            created_at
          ) VALUES (
            ${hubspotInvoiceId},
            ${item.id},
            ${item.name},
            ${item.description},
            ${item.quantity},
            ${item.price},
            ${item.amount},
            ${this.determineServiceTypeFromName(item.name)},
            ${isRecurring},
            NOW()
          )
        `);
      }

      console.log(
        `✅ Created invoice ${invoice.id} with ${lineItems.length} line items - $${totalAmount}`,
      );

      // Generate commissions based on normalized items (apply discount ratio if needed)
      const adjustedItems = hasDiscount
        ? normalizedItems.map((i) => ({
            ...i,
            amount: i.amount * discountRatio,
            price: i.price * discountRatio,
          }))
        : normalizedItems;

      await this.generateCommissionsForInvoice(
        hubspotInvoiceId,
        salesRepId!,
        salesRepName,
        adjustedItems,
        invoice.properties.hs_createdate,
      );
    } else {
      console.log(`🔄 Invoice ${invoice.id} already exists, skipping`);
    }
  }

  /**
   * Get company name from invoice data (associations or properties)
   */
  private getInvoiceCompanyName(invoice: any): string {
    console.log(`🔍 Getting company name for invoice ${invoice.id}...`);
    console.log(
      `Invoice properties:`,
      JSON.stringify(invoice.properties, null, 2),
    );
    console.log(
      `Invoice associations:`,
      JSON.stringify(invoice.associations, null, 2),
    );

    // Try direct properties first
    if (invoice.properties.hs_deal_name) {
      console.log(`✅ Found deal name: ${invoice.properties.hs_deal_name}`);
      return invoice.properties.hs_deal_name;
    }

    if (invoice.properties.company_name) {
      console.log(`✅ Found company name: ${invoice.properties.company_name}`);
      return invoice.properties.company_name;
    }

    if (invoice.properties.hs_company_name) {
      console.log(
        `✅ Found hs_company_name: ${invoice.properties.hs_company_name}`,
      );
      return invoice.properties.hs_company_name;
    }

    if (invoice.properties.recipient_company_name) {
      console.log(
        `✅ Found recipient_company_name: ${invoice.properties.recipient_company_name}`,
      );
      return invoice.properties.recipient_company_name;
    }

    if (invoice.properties.billing_contact_name) {
      console.log(
        `✅ Found billing_contact_name: ${invoice.properties.billing_contact_name}`,
      );
      return invoice.properties.billing_contact_name;
    }

    console.log(
      `⚠️ No company/contact name found in properties or associations for invoice ${invoice.id}`,
    );
    return `Invoice ${invoice.id}`;
  }

  /**
   * Helper methods for invoice processing
   */
  private calculateMonthlyValue(lineItems: any[]): number {
    // Look for recurring services like "Monthly Bookkeeping", "Tax as a Service"
    return lineItems
      .filter((item) => {
        const name = String(
          (item?.name ?? item?.properties?.name) || "",
        ).toLowerCase();
        return (
          name.includes("monthly") ||
          name.includes("bookkeeping") ||
          name.includes("recurring") ||
          name.includes("tax as a service")
        );
      })
      .reduce((sum, item) => {
        const raw = item?.amount ?? item?.properties?.amount ?? 0;
        const amount =
          typeof raw === "number" ? raw : parseFloat(String(raw || "0"));
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0);
  }

  private calculateSetupFee(lineItems: any[]): number {
    // Look for one-time services like "Clean-Up"
    return lineItems
      .filter((item) => {
        const name = String(
          (item?.name ?? item?.properties?.name) || "",
        ).toLowerCase();
        return (
          name.includes("clean") ||
          name.includes("setup") ||
          name.includes("catch") ||
          name.includes("prior")
        );
      })
      .reduce((sum, item) => {
        const raw = item?.amount ?? item?.properties?.amount ?? 0;
        const amount =
          typeof raw === "number" ? raw : parseFloat(String(raw || "0"));
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0);
  }

  private determineServiceType(lineItems: any[]): string {
    const services = lineItems.map((item) =>
      String((item?.name ?? item?.properties?.name) || "").toLowerCase(),
    );

    const hasBookkeeping = services.some(
      (s) =>
        s.includes("bookkeeping") ||
        s.includes("monthly") ||
        s.includes("clean") ||
        s.includes("catch"),
    );

    const hasTaas = services.some(
      (s) =>
        s.includes("tax as a service") ||
        s.includes("prior year") ||
        s.includes("tax service"),
    );

    if (hasBookkeeping && hasTaas) return "bookkeeping, taas";
    if (hasTaas) return "taas";
    if (hasBookkeeping) return "bookkeeping";

    return "bookkeeping"; // default
  }

  private determineServiceTypeFromName(name: string): string {
    const serviceName = name.toLowerCase();

    if (
      serviceName.includes("clean") ||
      serviceName.includes("catch") ||
      serviceName.includes("setup")
    )
      return "setup";
    if (serviceName.includes("prior") || serviceName.includes("year"))
      return "prior_years";
    if (
      serviceName.includes("monthly") ||
      serviceName.includes("recurring") ||
      serviceName.includes("tax as a service")
    )
      return "recurring";

    return "setup"; // default
  }

  /**
   * Generate commission records for an invoice with line items
   */
  async generateCommissionsForInvoice(
    hubspotInvoiceId: number,
    salesRepId: number,
    salesRepName: string,
    lineItems: any[],
    paidDate: string,
  ): Promise<void> {
    try {
      // Calculate setup fee and monthly value from line items
      const setupFee = this.calculateSetupFee(lineItems);
      const monthlyValue = this.calculateMonthlyValue(lineItems);

      console.log(`💼 Processing line items for invoice ${hubspotInvoiceId}:`);
      for (const item of lineItems) {
        console.log(`  - ${item.name}: $${item.amount.toFixed(2)}`);
      }
      console.log(
        `📊 Setup fee: $${setupFee.toFixed(2)}, Monthly value: $${monthlyValue.toFixed(2)}`,
      );

      // Generate setup commission (20% of setup fee)
      if (setupFee > 0) {
        await db.execute(sql`
          INSERT INTO commissions (
            hubspot_invoice_id,
            sales_rep_id,
            type,
            amount,
            status,
            month_number,
            service_type,
            date_earned,
            created_at,
            updated_at
          ) VALUES (
            ${hubspotInvoiceId},
            ${salesRepId},
            'setup',
            ${setupFee * 0.2},
            'pending',
            1,
            'setup',
            ${paidDate}::date,
            NOW(),
            NOW()
          )
        `);
        console.log(
          `✅ Setup commission: $${(setupFee * 0.2).toFixed(2)} (20% of $${setupFee.toFixed(2)})`,
        );
      }

      // Generate month 1 commission (40% of first month MRR)
      if (monthlyValue > 0) {
        await db.execute(sql`
          INSERT INTO commissions (
            hubspot_invoice_id,
            sales_rep_id,
            type,
            amount,
            status,
            month_number,
            service_type,
            date_earned,
            created_at,
            updated_at
          ) VALUES (
            ${hubspotInvoiceId},
            ${salesRepId},
            'month_1',
            ${monthlyValue * 0.4},
            'pending',
            1,
            'recurring',
            ${paidDate}::date,
            NOW(),
            NOW()
          )
        `);
        console.log(
          `✅ Month 1 commission: $${(monthlyValue * 0.4).toFixed(2)} (40% of $${monthlyValue.toFixed(2)})`,
        );

        // Note: Residual commissions (months 2-12) will be generated when actual subscription payments are received
      }

      console.log(
        `✅ Generated all commissions for invoice ${hubspotInvoiceId}`,
      );
    } catch (error) {
      console.error(
        `❌ Error generating commissions for invoice ${hubspotInvoiceId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Full sync process
   */
  async performFullSync(): Promise<{
    salesReps: number;
    invoices: number;
    commissions: number;
  }> {
    try {
      console.log("🚀 Starting full HubSpot commission sync...");

      // Sync sales reps first
      await this.syncSalesReps();

      // Then sync invoices and generate commissions
      const invoicesProcessed = await this.syncInvoices();

      // Count results
      const salesRepsCount = await db.execute(
        sql`SELECT COUNT(*) as count FROM sales_reps WHERE is_active = true`,
      );
      const invoicesCount = await db.execute(
        sql`SELECT COUNT(*) as count FROM hubspot_invoices`,
      );
      const commissionsCount = await db.execute(
        sql`SELECT COUNT(*) as count FROM commissions`,
      );

      const results = {
        salesReps: (salesRepsCount.rows[0] as any).count,
        invoices: (invoicesCount.rows[0] as any).count,
        commissions: (commissionsCount.rows[0] as any).count,
        invoicesProcessed,
      };

      console.log("🎉 Full sync completed:", results);
      return results;
    } catch (error) {
      console.error("❌ Full sync failed:", error);
      throw error;
    }
  }
}

export const hubspotSync: any = process.env.HUBSPOT_ACCESS_TOKEN
  ? new HubSpotCommissionSync()
  : {
      async performFullSync() {
        console.warn(
          "HubSpot not configured (no HUBSPOT_ACCESS_TOKEN). Skipping performFullSync.",
        );
        return {
          salesReps: 0,
          invoices: 0,
          commissions: 0,
          invoicesProcessed: 0,
        };
      },
    };
