const { HubSpotService } = await import("./server/hubspot.js");

async function findInvoices() {
  console.log("🔍 Searching for your 3 invoices in HubSpot...");

  try {
    const hubspotService = new HubSpotService();

    // Try multiple approaches to find invoices
    console.log("\n📋 Trying different HubSpot objects...");

    const searches = [
      // 1. Standard invoices
      {
        name: "Invoices",
        endpoint:
          "/crm/v3/objects/invoices?limit=100&properties=hs_invoice_amount,hs_invoice_number,hs_invoice_status,createdate,lastmodifieddate,name",
      },

      // 2. Line items (often used instead of invoices)
      {
        name: "Line Items",
        endpoint:
          "/crm/v3/objects/line_items?limit=100&properties=name,price,quantity,amount,createdate,lastmodifieddate",
      },

      // 3. Products
      {
        name: "Products",
        endpoint:
          "/crm/v3/objects/products?limit=100&properties=name,price,description,createdate,lastmodifieddate",
      },

      // 4. Quotes
      {
        name: "Quotes",
        endpoint:
          "/crm/v3/objects/quotes?limit=100&properties=hs_quote_amount,hs_quote_number,createdate,lastmodifieddate,name",
      },

      // 5. Deals (as fallback)
      {
        name: "Recent Deals",
        endpoint:
          "/crm/v3/objects/deals?limit=20&properties=dealname,amount,closedate,dealstage,createdate,lastmodifieddate",
      },
    ];

    for (const search of searches) {
      console.log(`\n🔎 Checking ${search.name}...`);
      try {
        const response = await hubspotService.makeRequest(search.endpoint);

        if (response && response.results && response.results.length > 0) {
          console.log(`✅ Found ${response.results.length} ${search.name}`);

          // Show the first few results with amounts
          response.results.slice(0, 5).forEach((item, index) => {
            const props = item.properties;
            const amount =
              props.hs_invoice_amount ||
              props.hs_quote_amount ||
              props.amount ||
              props.price ||
              "N/A";
            const name =
              props.name ||
              props.dealname ||
              props.hs_invoice_number ||
              props.hs_quote_number ||
              `Item ${index + 1}`;
            const date = props.createdate || props.lastmodifieddate || "N/A";

            console.log(`  ${index + 1}. ${name}`);
            console.log(`     Amount: $${amount}`);
            console.log(`     Date: ${date}`);
            console.log(`     ID: ${item.id}`);
            console.log("");
          });

          if (response.results.length >= 3) {
            console.log(
              `🎯 Found your data! ${search.name} appears to contain your invoice information.`
            );

            // Show the amounts for the first 3
            console.log("\n💰 First 3 amounts:");
            response.results.slice(0, 3).forEach((item, index) => {
              const props = item.properties;
              const amount =
                props.hs_invoice_amount ||
                props.hs_quote_amount ||
                props.amount ||
                props.price ||
                "N/A";
              const name =
                props.name ||
                props.dealname ||
                props.hs_invoice_number ||
                props.hs_quote_number ||
                `Item ${index + 1}`;
              console.log(`  ${index + 1}. ${name}: $${amount}`);
            });
          }
        } else {
          console.log(`❌ No ${search.name} found`);
        }
      } catch (error) {
        console.log(`❌ Error searching ${search.name}:`, error.message);
      }
    }
  } catch (error) {
    console.error("❌ Failed to search HubSpot:", error);
  }
}

findInvoices();
