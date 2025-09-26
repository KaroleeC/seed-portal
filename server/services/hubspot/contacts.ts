import { cache, CacheTTL, CachePrefix } from "../../cache.js";
import type { HubSpotRequestFn } from "./http.js";

export function createContactsService(request: HubSpotRequestFn) {
  async function listOwners(): Promise<any[]> {
    try {
      const result = await request("/crm/v3/owners", { method: "GET" });
      return result?.results || [];
    } catch (error) {
      console.error("Error listing HubSpot owners:", error);
      return [];
    }
  }

  async function getOwnerById(ownerId: string): Promise<any | null> {
    try {
      return await request(`/crm/v3/owners/${ownerId}`);
    } catch (error) {
      console.error("Error fetching HubSpot owner by ID:", error);
      return null;
    }
  }
  async function getOwnerByEmail(email: string): Promise<string | null> {
    try {
      const cacheKey = cache.generateKey(CachePrefix.USER_PROFILE, email);
      return await cache.wrap(
        cacheKey,
        async () => {
          const result = await request("/crm/v3/owners", { method: "GET" });
          const owner = result.results?.find((o: any) => o.email === email);
          return owner?.id || null;
        },
        { ttl: CacheTTL.USER_PROFILE },
      );
    } catch (error) {
      console.error("Error fetching HubSpot owner:", error);
      return null;
    }
  }

  async function getCompanyById(companyId: string): Promise<any | null> {
    try {
      return await request(
        `/crm/v3/objects/companies/${companyId}?properties=name,domain`,
      );
    } catch (error) {
      console.error("Error fetching company by ID from HubSpot:", error);
      return null;
    }
  }

  async function verifyContactByEmail(
    email: string,
  ): Promise<{ verified: boolean; contact?: any }> {
    try {
      const searchBody = {
        filterGroups: [
          {
            filters: [{ propertyName: "email", operator: "EQ", value: email }],
          },
        ],
        properties: [
          "email",
          "firstname",
          "lastname",
          "company",
          "address",
          "city",
          "state",
          "zip",
          "country",
          "phone",
          "mobilephone",
          "hs_phone",
          "phone_number",
          "work_phone",
          "mobile_phone",
          "home_phone",
          "fax",
          "secondary_phone",
          "phone_ext",
          "phonenumber",
        ],
        associations: ["companies"],
      };

      const result = await request("/crm/v3/objects/contacts/search", {
        method: "POST",
        body: JSON.stringify(searchBody),
      });

      if (result.results && result.results.length > 0) {
        const contact = result.results[0];

        let companyData: any = {};
        if (contact.associations?.companies?.results?.length > 0) {
          const companyId = contact.associations.companies.results[0].id;
          try {
            const companyResult = await request(
              `/crm/v3/objects/companies/${companyId}?properties=industry,annualrevenue,numberofemployees,hs_industry_group,monthly_revenue_range,entity_type`,
            );
            if (companyResult) {
              companyData = {
                industry:
                  companyResult.properties?.industry ||
                  companyResult.properties?.hs_industry_group ||
                  "",
                monthly_revenue_range:
                  companyResult.properties?.monthly_revenue_range || "",
                entity_type: companyResult.properties?.entity_type || "",
                annualrevenue: companyResult.properties?.annualrevenue || "",
                numberofemployees:
                  companyResult.properties?.numberofemployees || "",
              };
            }
          } catch (err) {
            console.log("Could not fetch company data:", err);
          }
        }

        return {
          verified: true,
          contact: {
            id: contact.id,
            properties: {
              email: contact.properties?.email || email,
              firstname: contact.properties?.firstname || "",
              lastname: contact.properties?.lastname || "",
              company: contact.properties?.company || "",
              address: contact.properties?.address || "",
              city: contact.properties?.city || "",
              state: contact.properties?.state || "",
              zip: contact.properties?.zip || "",
              country: contact.properties?.country || "",
              phone: contact.properties?.phone || "",
              mobilephone: contact.properties?.mobilephone || "",
              hs_phone: contact.properties?.hs_phone || "",
              phone_number: contact.properties?.phone_number || "",
              work_phone: contact.properties?.work_phone || "",
              mobile_phone: contact.properties?.mobile_phone || "",
              ...companyData,
            },
          },
        };
      }

      return { verified: false };
    } catch (error) {
      console.error("Error verifying contact in HubSpot:", error);
      return { verified: false };
    }
  }

  async function searchContacts(
    query: string,
    ownerEmail?: string,
  ): Promise<any[]> {
    try {
      let searchBody: any;

      if (ownerEmail) {
        const ownerId = await getOwnerByEmail(ownerEmail);
        if (ownerId) {
          searchBody = {
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "hubspot_owner_id",
                    operator: "EQ",
                    value: ownerId,
                  },
                ],
              },
            ],
            query,
            sorts: [
              { propertyName: "lastmodifieddate", direction: "DESCENDING" },
            ],
            limit: 20,
            properties: [
              "email",
              "firstname",
              "lastname",
              "company",
              "industry",
              "annualrevenue",
              "numemployees",
              "phone",
              "city",
              "state",
              "country",
              "notes_last_contacted",
              "notes_last_activity_date",
              "hs_lead_status",
              "lifecyclestage",
              "createdate",
              "lastmodifieddate",
              "hubspot_owner_id",
            ],
          };
        } else {
          searchBody = {
            query,
            sorts: [
              { propertyName: "lastmodifieddate", direction: "DESCENDING" },
            ],
            limit: 20,
            properties: [
              "email",
              "firstname",
              "lastname",
              "company",
              "industry",
              "annualrevenue",
              "numemployees",
              "phone",
              "city",
              "state",
              "country",
              "notes_last_contacted",
              "notes_last_activity_date",
              "hs_lead_status",
              "lifecyclestage",
              "createdate",
              "lastmodifieddate",
              "hubspot_owner_id",
            ],
          };
        }
      } else {
        searchBody = {
          query,
          sorts: [
            { propertyName: "lastmodifieddate", direction: "DESCENDING" },
          ],
          limit: 20,
          properties: [
            "email",
            "firstname",
            "lastname",
            "company",
            "industry",
            "annualrevenue",
            "numemployees",
            "phone",
            "city",
            "state",
            "country",
            "notes_last_contacted",
            "notes_last_activity_date",
            "hs_lead_status",
            "lifecyclestage",
            "createdate",
            "lastmodifieddate",
            "hubspot_owner_id",
          ],
        };
      }

      const searchResult = await request("/crm/v3/objects/contacts/search", {
        method: "POST",
        body: JSON.stringify(searchBody),
      });

      return searchResult.results || [];
    } catch (error) {
      console.error("Error searching HubSpot contacts:", error);
      return [];
    }
  }

  async function getContactById(contactId: string): Promise<any> {
    try {
      const cacheKey = cache.generateKey(
        CachePrefix.HUBSPOT_CONTACT,
        contactId,
      );
      return await cache.wrap(
        cacheKey,
        async () => {
          return await request(
            `/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,company,industry,annualrevenue,numemployees,phone,city,state,country,notes_last_contacted,notes_last_activity_date,hs_lead_status,lifecyclestage,createdate,lastmodifieddate`,
          );
        },
        { ttl: CacheTTL.HUBSPOT_CONTACT },
      );
    } catch (error) {
      console.error("Error fetching contact by ID:", error);
      return null;
    }
  }

  async function getContactDeals(contactId: string): Promise<any[]> {
    try {
      const cacheKey = cache.generateKey(
        CachePrefix.HUBSPOT_DEAL,
        `contact:${contactId}`,
      );
      return await cache.wrap(
        cacheKey,
        async () => {
          const dealsResponse = await request(
            `/crm/v4/objects/contacts/${contactId}/associations/deals`,
          );
          if (!dealsResponse?.results?.length) return [];
          const dealIds = dealsResponse.results.map(
            (assoc: any) => assoc.toObjectId,
          );
          const dealDetails = await Promise.all(
            dealIds.map(async (dealId: string) => {
              try {
                return await request(
                  `/crm/v3/objects/deals/${dealId}?properties=dealname,dealstage,amount,closedate,pipeline,deal_type,hs_object_id`,
                );
              } catch (err) {
                console.error(`Error fetching deal ${dealId}:`, err);
                return null;
              }
            }),
          );
          return dealDetails.filter((d) => d !== null);
        },
        { ttl: CacheTTL.HUBSPOT_DEALS },
      );
    } catch (error) {
      console.error("Error fetching contact deals:", error);
      return [];
    }
  }

  async function verifyUserByEmail(email: string): Promise<boolean> {
    try {
      const contactExists = await verifyContactByEmail(email);
      if (contactExists.verified) return true;
      try {
        const ownersResponse = await request("/crm/v3/owners");
        if (ownersResponse && ownersResponse.results) {
          const userExists = ownersResponse.results.some(
            (owner: any) =>
              owner.email && owner.email.toLowerCase() === email.toLowerCase(),
          );
          if (userExists) return true;
        }
      } catch {
        // ignore owners API scope errors
      }
      return false;
    } catch (error) {
      console.error("Error verifying user in HubSpot:", error);
      return false;
    }
  }

  async function verifyUser(
    email: string,
  ): Promise<{ exists: boolean; userData?: any }> {
    try {
      if (!email.endsWith("@seedfinancial.io")) return { exists: false };
      const response = await request("/crm/v3/owners/", { method: "GET" });
      if (response.results) {
        const user = response.results.find(
          (owner: any) => owner.email?.toLowerCase() === email.toLowerCase(),
        );
        if (user) {
          return {
            exists: true,
            userData: {
              hubspotUserId: user.id,
              firstName: user.firstName || "",
              lastName: user.lastName || "",
              email: user.email,
            },
          };
        }
      }
      return { exists: false };
    } catch (error) {
      console.error("Error verifying user in HubSpot:", error);
      return { exists: false };
    }
  }

  return {
    listOwners,
    getOwnerByEmail,
    getOwnerById,
    verifyContactByEmail,
    searchContacts,
    getContactById,
    getCompanyById,
    getContactDeals,
    verifyUserByEmail,
    verifyUser,
  };
}
