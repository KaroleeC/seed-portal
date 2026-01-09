import {
  users,
  quotes,
  approvalCodes,
  kbCategories,
  kbArticles,
  kbBookmarks,
  kbSearchHistory,
  workspaceUsers,
  salesReps,
  deals,
  commissions,
  commissionAdjustments,
  monthlyBonuses,
  milestoneBonuses,
  pricingBase,
  pricingIndustryMultipliers,
  pricingRevenueMultipliers,
  pricingTransactionSurcharges,
  pricingServiceSettings,
  pricingTiers,
  pricingHistory,
  calculatorServiceContent,
  type User,
  type InsertUser,
  type Quote,
  type InsertQuote,
  type ApprovalCode,
  type InsertApprovalCode,
  type KbCategory,
  type InsertKbCategory,
  type KbArticle,
  type InsertKbArticle,
  type KbBookmark,
  type InsertKbBookmark,
  type KbSearchHistory,
  type InsertKbSearchHistory,
  type WorkspaceUser,
  type InsertWorkspaceUser,
  type SalesRep,
  type InsertSalesRep,
  type Deal,
  type InsertDeal,
  type Commission,
  type InsertCommission,
  type CommissionAdjustment,
  type InsertCommissionAdjustment,
  type MonthlyBonus,
  type InsertMonthlyBonus,
  type MilestoneBonus,
  type InsertMilestoneBonus,
  type PricingBase,
  type InsertPricingBase,
  type PricingIndustryMultiplier,
  type InsertPricingIndustryMultiplier,
  type PricingRevenueMultiplier,
  type InsertPricingRevenueMultiplier,
  type PricingTransactionSurcharge,
  type InsertPricingTransactionSurcharge,
  type PricingServiceSetting,
  type InsertPricingServiceSetting,
  type PricingTier,
  type InsertPricingTier,
  type PricingHistory,
  type InsertPricingHistory,
  type CalculatorServiceContent,
  type InsertCalculatorServiceContent,
  type updateQuoteSchema,
  type UpdateProfile,
} from "@shared/schema";
import { db } from "./db";
import { safeDbQuery } from "./db-utils";
import { eq, like, desc, asc, sql, and } from "drizzle-orm";
import type { z } from "zod";
import session from "express-session";
import MemoryStore from "memorystore";
import { getRedis, getRedisAsync } from "./redis";
import bcrypt from "bcryptjs";

type UpdateQuote = z.infer<typeof updateQuoteSchema>;

export interface IStorage {
  sessionStore: session.Store;

  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithPassword(
    id: number,
  ): Promise<({ passwordHash: string } & User) | undefined>;
  updateUserRole(
    userId: number,
    role: string,
    assignedBy: number,
  ): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  deleteUser(userId: number): Promise<void>;
  updateUserPassword(userId: number, hashedPassword: string): Promise<void>;
  updateUserDefaultDashboard(
    userId: number,
    defaultDashboard: string,
  ): Promise<void>;
  verifyUserPassword(email: string, password: string): Promise<User | null>;
  updateUserProfile(userId: number, profile: UpdateProfile): Promise<User>;
  updateUserHubSpotData(
    userId: number,
    hubspotData: Partial<User>,
  ): Promise<User>;
  updateUserFirebaseUid(
    userId: number,
    firebaseUid: string,
    authProvider: string,
    profilePhoto: string | null,
  ): Promise<void>;
  updateUserGoogleId(
    userId: number,
    googleId: string,
    authProvider: string,
    profilePhoto: string | null,
  ): Promise<void>;

  // Quote methods - now filtered by owner
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(quote: UpdateQuote): Promise<Quote>;
  archiveQuote(id: number): Promise<Quote>;
  getQuotesByEmail(email: string): Promise<Quote[]>;
  getQuote(id: number): Promise<Quote | undefined>;
  getAllQuotes(
    ownerId: number,
    search?: string,
    sortField?: string,
    sortOrder?: "asc" | "desc",
  ): Promise<Quote[]>;
  getQuotesByOwner(ownerId: number): Promise<Quote[]>;

  // Approval code methods
  createApprovalCode(approvalCode: InsertApprovalCode): Promise<ApprovalCode>;
  validateApprovalCode(code: string, email: string): Promise<boolean>;
  markApprovalCodeUsed(code: string, email: string): Promise<void>;

  // Knowledge Base methods
  // Categories
  getKbCategories(): Promise<KbCategory[]>;
  createKbCategory(category: InsertKbCategory): Promise<KbCategory>;
  updateKbCategory(
    id: number,
    category: Partial<InsertKbCategory>,
  ): Promise<KbCategory>;
  deleteKbCategory(id: number): Promise<void>;

  // Articles
  getKbArticles(
    categoryId?: number,
    status?: string,
    featured?: boolean,
    title?: string,
  ): Promise<KbArticle[]>;
  getKbArticle(id: number): Promise<KbArticle | undefined>;
  getKbArticleBySlug(slug: string): Promise<KbArticle | undefined>;
  createKbArticle(article: InsertKbArticle): Promise<KbArticle>;
  updateKbArticle(
    id: number,
    article: Partial<InsertKbArticle>,
  ): Promise<KbArticle>;
  deleteKbArticle(id: number): Promise<void>;
  incrementArticleViews(id: number): Promise<void>;

  // Search
  searchKbArticles(query: string, userId?: number): Promise<KbArticle[]>;
  recordKbSearch(search: InsertKbSearchHistory): Promise<KbSearchHistory>;

  // Bookmarks
  getUserKbBookmarks(userId: number): Promise<KbBookmark[]>;
  createKbBookmark(bookmark: InsertKbBookmark): Promise<KbBookmark>;
  deleteKbBookmark(userId: number, articleId: number): Promise<void>;

  // Workspace Users - synced from Google Admin API
  getAllWorkspaceUsers(): Promise<WorkspaceUser[]>;
  getWorkspaceUserByEmail(email: string): Promise<WorkspaceUser | undefined>;
  getWorkspaceUserByGoogleId(
    googleId: string,
  ): Promise<WorkspaceUser | undefined>;
  upsertWorkspaceUser(user: InsertWorkspaceUser): Promise<WorkspaceUser>;
  updateWorkspaceUser(
    googleId: string,
    user: Partial<InsertWorkspaceUser>,
  ): Promise<WorkspaceUser>;
  deleteInactiveWorkspaceUsers(activeGoogleIds: string[]): Promise<number>; // Returns count of deleted users
  syncWorkspaceUsers(
    users: InsertWorkspaceUser[],
  ): Promise<{ created: number; updated: number; deleted: number }>;

  // Commission tracking methods
  // Sales Representatives
  getAllSalesReps(): Promise<SalesRep[]>;
  getSalesRepByUserId(userId: number): Promise<SalesRep | undefined>;
  createSalesRep(salesRep: InsertSalesRep): Promise<SalesRep>;
  updateSalesRep(
    id: number,
    salesRep: Partial<InsertSalesRep>,
  ): Promise<SalesRep>;

  // Deals
  getAllDeals(salesRepId?: number): Promise<Deal[]>;
  getDeal(id: number): Promise<Deal | undefined>;
  getDealsByHubSpotOwnerId(hubspotOwnerId: string): Promise<Deal[]>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: number, deal: Partial<InsertDeal>): Promise<Deal>;

  // Commissions
  getAllCommissions(salesRepId?: number): Promise<Commission[]>;
  getCommissionsBySalesRep(salesRepId: number): Promise<Commission[]>;
  getCommissionsByDeal(dealId: number): Promise<Commission[]>;
  createCommission(commission: InsertCommission): Promise<Commission>;
  updateCommission(
    id: number,
    commission: Partial<InsertCommission>,
  ): Promise<Commission>;

  // Commission Adjustments
  getAllCommissionAdjustments(): Promise<CommissionAdjustment[]>;
  getCommissionAdjustmentsByCommission(
    commissionId: number,
  ): Promise<CommissionAdjustment[]>;
  createCommissionAdjustment(
    adjustment: InsertCommissionAdjustment,
  ): Promise<CommissionAdjustment>;
  updateCommissionAdjustmentStatus(
    id: number,
    status: string,
    approvedBy: number,
    finalAmount?: number,
    notes?: string,
  ): Promise<CommissionAdjustment>;

  // Monthly Bonuses
  getMonthlyBonuses(salesRepId?: number): Promise<MonthlyBonus[]>;
  getMonthlyBonusesBySalesRep(salesRepId: number): Promise<MonthlyBonus[]>;
  createMonthlyBonus(bonus: InsertMonthlyBonus): Promise<MonthlyBonus>;
  updateMonthlyBonus(
    id: number,
    bonus: Partial<InsertMonthlyBonus>,
  ): Promise<MonthlyBonus>;

  // Milestone Bonuses
  getMilestoneBonuses(salesRepId?: number): Promise<MilestoneBonus[]>;
  getMilestoneBonusesBySalesRep(salesRepId: number): Promise<MilestoneBonus[]>;
  createMilestoneBonus(bonus: InsertMilestoneBonus): Promise<MilestoneBonus>;
  updateMilestoneBonus(
    id: number,
    bonus: Partial<InsertMilestoneBonus>,
  ): Promise<MilestoneBonus>;

  // Pricing Configuration Methods
  // Base pricing
  getAllPricingBase(): Promise<PricingBase[]>;
  getPricingBaseByService(service: string): Promise<PricingBase | undefined>;
  updatePricingBase(
    id: number,
    base: Partial<InsertPricingBase>,
    changedBy: number,
  ): Promise<PricingBase>;

  // Industry multipliers
  getAllIndustryMultipliers(): Promise<PricingIndustryMultiplier[]>;
  getIndustryMultiplier(
    industry: string,
  ): Promise<PricingIndustryMultiplier | undefined>;
  updateIndustryMultiplier(
    id: number,
    multiplier: Partial<InsertPricingIndustryMultiplier>,
    changedBy: number,
  ): Promise<PricingIndustryMultiplier>;

  // Revenue multipliers
  getAllRevenueMultipliers(): Promise<PricingRevenueMultiplier[]>;
  getRevenueMultiplier(
    revenueRange: string,
  ): Promise<PricingRevenueMultiplier | undefined>;
  updateRevenueMultiplier(
    id: number,
    multiplier: Partial<InsertPricingRevenueMultiplier>,
    changedBy: number,
  ): Promise<PricingRevenueMultiplier>;

  // Transaction surcharges
  getAllTransactionSurcharges(): Promise<PricingTransactionSurcharge[]>;
  getTransactionSurcharge(
    transactionRange: string,
  ): Promise<PricingTransactionSurcharge | undefined>;
  updateTransactionSurcharge(
    id: number,
    surcharge: Partial<InsertPricingTransactionSurcharge>,
    changedBy: number,
  ): Promise<PricingTransactionSurcharge>;

  // Service settings
  getAllServiceSettings(): Promise<PricingServiceSetting[]>;
  getServiceSettingsByService(
    service: string,
  ): Promise<PricingServiceSetting[]>;
  getServiceSetting(
    service: string,
    settingKey: string,
  ): Promise<PricingServiceSetting | undefined>;
  updateServiceSetting(
    id: number,
    setting: Partial<InsertPricingServiceSetting>,
    changedBy: number,
  ): Promise<PricingServiceSetting>;

  // Pricing tiers
  getAllPricingTiers(): Promise<PricingTier[]>;
  getPricingTiersByService(service: string): Promise<PricingTier[]>;
  getPricingTier(
    service: string,
    tier: string,
    volumeBand: string,
  ): Promise<PricingTier | undefined>;
  updatePricingTier(
    id: number,
    tier: Partial<InsertPricingTier>,
    changedBy: number,
  ): Promise<PricingTier>;

  // Pricing history
  getPricingHistory(
    tableAffected?: string,
    recordId?: number,
  ): Promise<PricingHistory[]>;

  // Calculator Service Content methods
  getAllCalculatorServiceContent(): Promise<CalculatorServiceContent[]>;
  getCalculatorServiceContent(
    service: string,
  ): Promise<CalculatorServiceContent | undefined>;
  upsertCalculatorServiceContent(
    content: InsertCalculatorServiceContent & {
      service: string;
      updatedBy?: number;
    },
  ): Promise<CalculatorServiceContent>;
}

export class DatabaseStorage implements IStorage {
  sessionStore!: session.Store;

  constructor() {
    console.log("[Storage] Initializing storage...");
    console.log(
      "[Storage] REDIS_URL:",
      process.env.REDIS_URL ? "Set" : "Not set",
    );

    // Initialize with memory store first, will be replaced if Redis is available
    this.initMemoryStore();
  }

  // ===== Calculator Service Content =====
  async getAllCalculatorServiceContent(): Promise<CalculatorServiceContent[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(calculatorServiceContent)
        .orderBy(asc(calculatorServiceContent.service));
    }, "getAllCalculatorServiceContent");
  }

  async getCalculatorServiceContent(
    service: string,
  ): Promise<CalculatorServiceContent | undefined> {
    return await safeDbQuery(async () => {
      const [row] = await db
        .select()
        .from(calculatorServiceContent)
        .where(eq(calculatorServiceContent.service, service));
      return row || undefined;
    }, "getCalculatorServiceContent");
  }

  async upsertCalculatorServiceContent(
    content: InsertCalculatorServiceContent & {
      service: string;
      updatedBy?: number;
    },
  ): Promise<CalculatorServiceContent> {
    return await safeDbQuery(async () => {
      const existing = await this.getCalculatorServiceContent(content.service);
      if (existing) {
        const [updated] = await db
          .update(calculatorServiceContent)
          .set({
            sowTitle: content.sowTitle ?? existing.sowTitle,
            sowTemplate: content.sowTemplate ?? existing.sowTemplate,
            agreementLink: content.agreementLink ?? existing.agreementLink,
            includedFieldsJson:
              content.includedFieldsJson ?? existing.includedFieldsJson,
            updatedBy: content.updatedBy ?? existing.updatedBy,
            updatedAt: new Date(),
          })
          .where(eq(calculatorServiceContent.service, content.service))
          .returning();
        return updated || existing;
      }
      const [inserted] = await db
        .insert(calculatorServiceContent)
        .values({
          service: content.service,
          sowTitle: content.sowTitle ?? (null as any),
          sowTemplate: content.sowTemplate ?? (null as any),
          agreementLink: content.agreementLink ?? (null as any),
          includedFieldsJson: content.includedFieldsJson ?? (null as any),
          updatedBy: content.updatedBy ?? (null as any),
        })
        .returning();
      if (!inserted)
        throw new Error("Failed to upsert calculator service content");
      return inserted;
    }, "upsertCalculatorServiceContent");
  }

  async init() {
    console.log("[Storage] Checking for Redis availability...");

    try {
      const redis = await getRedisAsync();
      console.log("[Storage] Redis module imported:", redis);
      console.log(
        "[Storage] Redis sessionRedis available:",
        redis?.sessionRedis ? "Yes" : "No",
      );

      // Check if Redis is available from the redis module
      if (redis?.sessionRedis) {
        try {
          console.log("[Storage] Using Redis session client from redis module");
          const RedisStore = require("connect-redis").default;

          this.sessionStore = new RedisStore({
            client: redis.sessionRedis,
            prefix: "sess:",
            ttl: 86400, // 24 hours
          });

          console.log("✓ Using Redis for session storage");
        } catch (error) {
          console.error(
            "[Storage] Failed to initialize Redis session store:",
            error,
          );
          // Keep using memory store
        }
      } else {
        console.log(
          "[Storage] Redis not available, continuing with memory store",
        );
      }
    } catch (error) {
      console.error("[Storage] Error initializing Redis:", error);
      // Keep using memory store
    }
  }

  private initMemoryStore() {
    const MemStore = MemoryStore(session);
    this.sessionStore = new MemStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    console.log("Using in-memory session storage (development only)");
  }

  async getUser(id: number): Promise<User | undefined> {
    return await safeDbQuery(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    }, "getUser");
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await safeDbQuery(async () => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      return user || undefined;
    }, "getUserByEmail");
  }

  async getUserWithPassword(
    id: number,
  ): Promise<({ passwordHash: string } & User) | undefined> {
    return await safeDbQuery(async () => {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (!user || !user.password) {
        return undefined;
      }
      return { ...user, passwordHash: user.password };
    }, "getUserWithPassword");
  }

  async updateUserRole(
    userId: number,
    role: string,
    assignedBy: number,
  ): Promise<User> {
    return await safeDbQuery(async () => {
      const [user] = await db
        .update(users)
        .set({
          role,
          roleAssignedBy: assignedBy,
          roleAssignedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (!user) {
        throw new Error(
          `User with ID ${userId} not found or could not be updated`,
        );
      }

      return user;
    }, "updateUserRole");
  }

  async getAllUsers(): Promise<User[]> {
    return await safeDbQuery(async () => {
      return await db.select().from(users).orderBy(asc(users.email));
    }, "getAllUsers");
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return await safeDbQuery(async () => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.firebaseUid, firebaseUid));
      return user || undefined;
    }, "getUserByFirebaseUid");
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return await safeDbQuery(async () => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.googleId, googleId));
      return user || undefined;
    }, "getUserByGoogleId");
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return await safeDbQuery(async () => {
      // Hash password if provided
      const userToInsert = { ...insertUser };
      if (userToInsert.password) {
        const saltRounds = 12;
        const plain = String(userToInsert.password);
        const hashed = await bcrypt.hash(plain, saltRounds);
        (userToInsert as any).password = hashed;
      }

      const [user] = await db.insert(users).values(userToInsert).returning();

      if (!user) {
        throw new Error("Failed to create user");
      }

      return user;
    }, "createUser");
  }

  async verifyUserPassword(
    email: string,
    password: string,
  ): Promise<User | null> {
    return await safeDbQuery(async () => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if (!user || !user.password) {
        console.log("[verifyUserPassword] User not found or no password:", {
          email,
          hasUser: !!user,
          hasPassword: !!user?.password,
        });
        return null;
      }

      console.log("[verifyUserPassword] Checking password for:", email);
      console.log(
        "[verifyUserPassword] Stored password hash length:",
        user.password?.length,
      );
      console.log(
        "[verifyUserPassword] Stored password hash starts with:",
        user.password?.substring(0, 10),
      );

      try {
        const isValid = await bcrypt.compare(password, user.password);
        console.log("[verifyUserPassword] Password valid:", isValid);
        return isValid ? user : null;
      } catch (error) {
        console.error("[verifyUserPassword] Bcrypt comparison error:", error);
        return null;
      }
    }, "verifyUserPassword");
  }

  async updateUserProfile(
    userId: number,
    profile: UpdateProfile,
  ): Promise<User> {
    return await safeDbQuery(async () => {
      // Properly type the update data
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (profile.firstName !== undefined)
        updateData.firstName = profile.firstName;
      if (profile.lastName !== undefined)
        updateData.lastName = profile.lastName;
      if (profile.phoneNumber !== undefined)
        updateData.phoneNumber = profile.phoneNumber;
      if (profile.profilePhoto !== undefined)
        updateData.profilePhoto = profile.profilePhoto;
      if (profile.address !== undefined) updateData.address = profile.address;
      if (profile.city !== undefined) updateData.city = profile.city;
      if (profile.state !== undefined) updateData.state = profile.state;
      if (profile.zipCode !== undefined) updateData.zipCode = profile.zipCode;
      if (profile.country !== undefined) updateData.country = profile.country;
      if (profile.lastHubspotSync !== undefined)
        updateData.lastHubspotSync = new Date(profile.lastHubspotSync);

      // Update weather timestamp if location changed
      if (profile.address || profile.city || profile.state) {
        updateData.lastWeatherUpdate = new Date();
      }

      const [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      if (!user) {
        throw new Error(
          `User with ID ${userId} not found or could not be updated`,
        );
      }

      return user;
    }, "updateUserProfile");
  }

  async updateUserHubSpotData(
    userId: number,
    hubspotData: Partial<User>,
  ): Promise<User> {
    return await safeDbQuery(async () => {
      const [user] = await db
        .update(users)
        .set({
          ...hubspotData,
          lastHubspotSync: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (!user) {
        throw new Error(
          `User with ID ${userId} not found or could not be updated`,
        );
      }

      return user;
    }, "updateUserHubSpotData");
  }

  async updateUserFirebaseUid(
    userId: number,
    firebaseUid: string,
    authProvider: string,
    profilePhoto: string | null,
  ): Promise<void> {
    return await safeDbQuery(async () => {
      await db
        .update(users)
        .set({
          firebaseUid,
          authProvider,
          profilePhoto: profilePhoto || undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }, "updateUserFirebaseUid");
  }

  async updateUserGoogleId(
    userId: number,
    googleId: string,
    authProvider: string,
    profilePhoto: string | null,
  ): Promise<void> {
    return await safeDbQuery(async () => {
      await db
        .update(users)
        .set({
          googleId,
          authProvider,
          profilePhoto: profilePhoto || undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }, "updateUserGoogleId");
  }

  async deleteUser(userId: number): Promise<void> {
    return await safeDbQuery(async () => {
      await db.delete(users).where(eq(users.id, userId));
    }, "deleteUser");
  }

  async updateUserPassword(
    userId: number,
    hashedPassword: string,
  ): Promise<void> {
    return await safeDbQuery(async () => {
      await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }, "updateUserPassword");
  }

  async updateUserDefaultDashboard(
    userId: number,
    defaultDashboard: string,
  ): Promise<void> {
    return await safeDbQuery(async () => {
      await db
        .update(users)
        .set({
          defaultDashboard,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }, "updateUserDefaultDashboard");
  }

  async createQuote(insertQuote: InsertQuote): Promise<Quote> {
    return await safeDbQuery(async () => {
      console.log(
        "🔵 Storage.createQuote - START - Inserting quote for:",
        insertQuote.contactEmail,
      );
      console.log(
        "🔵 Storage.createQuote - Insert data keys:",
        Object.keys(insertQuote),
      );
      console.log("🔵 Storage.createQuote - Sample data:", {
        contactEmail: insertQuote.contactEmail,
        monthlyFee: insertQuote.monthlyFee,
      });

      console.log("🔵 EXECUTING DATABASE INSERT...");
      const result = await db.insert(quotes).values(insertQuote).returning();

      console.log("🟢 DATABASE INSERT COMPLETED");
      console.log("🟢 Raw result from DB:", {
        isArray: Array.isArray(result),
        length: result?.length,
        hasData: !!result,
        resultType: typeof result,
      });

      const [quote] = result;
      console.log("🟢 Destructured quote:", {
        hasQuote: !!quote,
        quoteType: typeof quote,
        quoteKeys: quote ? Object.keys(quote) : "N/A",
      });

      if (!quote) {
        console.error(
          "🚨 CRITICAL: Database insert returned no quote in result array",
        );
        console.error("🚨 Full result object:", JSON.stringify(result));
        throw new Error("Database insert returned no quote");
      }

      console.log("🟢 Storage.createQuote - SUCCESS - Quote ID:", quote.id);
      console.log("🟢 Storage.createQuote - Contact:", quote.contactEmail);
      console.log(
        "🟢 Storage.createQuote - Final quote object:",
        JSON.stringify(quote).substring(0, 300),
      );

      return quote;
    }, "createQuote");
  }

  async updateQuote(updateQuote: UpdateQuote): Promise<Quote> {
    return await safeDbQuery(async () => {
      const [quote] = await db
        .update(quotes)
        .set({ ...updateQuote, updatedAt: new Date() })
        .where(eq(quotes.id, updateQuote.id))
        .returning();

      if (!quote) {
        throw new Error(
          `Quote with ID ${updateQuote.id} not found or could not be updated`,
        );
      }

      return quote;
    }, "updateQuote");
  }

  async archiveQuote(id: number): Promise<Quote> {
    return await safeDbQuery(async () => {
      const [quote] = await db
        .update(quotes)
        .set({ archived: true, updatedAt: new Date() })
        .where(eq(quotes.id, id))
        .returning();

      if (!quote) {
        throw new Error(
          `Quote with ID ${id} not found or could not be archived`,
        );
      }

      return quote;
    }, "archiveQuote");
  }

  async getQuotesByEmail(email: string): Promise<Quote[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.contactEmail, email), eq(quotes.archived, false)));
    }, "getQuotesByEmail");
  }

  async getQuote(id: number): Promise<Quote | undefined> {
    return await safeDbQuery(async () => {
      const [quote] = await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.id, id), eq(quotes.archived, false)));
      return quote || undefined;
    }, "getQuote");
  }

  async getAllQuotes(
    ownerId: number,
    search?: string,
    sortField?: string,
    sortOrder?: "asc" | "desc",
  ): Promise<Quote[]> {
    return await safeDbQuery(async () => {
      console.log("getAllQuotes - Parameters:", {
        ownerId,
        search,
        sortField,
        sortOrder,
      });

      const ownerFilter = eq(quotes.ownerId, ownerId);
      const archivedFilter = eq(quotes.archived, false);
      const baseFilter = and(ownerFilter, archivedFilter);

      if (search && sortField && sortOrder) {
        console.log("getAllQuotes - Search with sort");
        const orderColumn =
          sortField === "contactEmail"
            ? quotes.contactEmail
            : sortField === "updatedAt"
              ? quotes.updatedAt
              : sortField === "monthlyFee"
                ? quotes.monthlyFee
                : sortField === "setupFee"
                  ? quotes.setupFee
                  : quotes.updatedAt;

        const result = await db
          .select()
          .from(quotes)
          .where(and(like(quotes.contactEmail, `%${search}%`), baseFilter))
          .orderBy(sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn));
        console.log(
          "getAllQuotes - Search with sort result count:",
          result.length,
        );
        return result;
      } else if (search) {
        console.log("getAllQuotes - Search only for:", search);
        const result = await db
          .select()
          .from(quotes)
          .where(and(like(quotes.contactEmail, `%${search}%`), baseFilter))
          .orderBy(desc(quotes.updatedAt));
        console.log("getAllQuotes - Search result count:", result.length);
        return result;
      } else if (sortField && sortOrder) {
        console.log("getAllQuotes - Sort only");
        const orderColumn =
          sortField === "contactEmail"
            ? quotes.contactEmail
            : sortField === "updatedAt"
              ? quotes.updatedAt
              : sortField === "monthlyFee"
                ? quotes.monthlyFee
                : sortField === "setupFee"
                  ? quotes.setupFee
                  : quotes.updatedAt;

        const result = await db
          .select()
          .from(quotes)
          .where(baseFilter)
          .orderBy(sortOrder === "asc" ? asc(orderColumn) : desc(orderColumn));
        console.log("getAllQuotes - Sort result count:", result.length);
        return result;
      } else {
        console.log("getAllQuotes - All quotes for owner");
        const result = await db
          .select()
          .from(quotes)
          .where(baseFilter)
          .orderBy(desc(quotes.updatedAt));
        console.log("getAllQuotes - All quotes result count:", result.length);
        return result;
      }
    }, "getAllQuotes");
  }

  async getQuotesByOwner(ownerId: number): Promise<Quote[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(quotes)
        .where(and(eq(quotes.ownerId, ownerId), eq(quotes.archived, false)));
    }, "getQuotesByOwner");
  }

  async createApprovalCode(
    insertApprovalCode: InsertApprovalCode,
  ): Promise<ApprovalCode> {
    return await safeDbQuery(async () => {
      const [approvalCode] = await db
        .insert(approvalCodes)
        .values(insertApprovalCode)
        .returning();

      if (!approvalCode) {
        throw new Error("Failed to create approval code");
      }

      return approvalCode;
    }, "createApprovalCode");
  }

  async validateApprovalCode(code: string, email: string): Promise<boolean> {
    return await safeDbQuery(async () => {
      const [approvalCode] = await db
        .select()
        .from(approvalCodes)
        .where(
          and(
            eq(approvalCodes.code, code),
            eq(approvalCodes.contactEmail, email),
            eq(approvalCodes.used, false),
            sql`${approvalCodes.expiresAt} > NOW()`,
          ),
        );
      return !!approvalCode;
    }, "validateApprovalCode");
  }

  async markApprovalCodeUsed(code: string, email: string): Promise<void> {
    await safeDbQuery(async () => {
      const result = await db
        .update(approvalCodes)
        .set({ used: true })
        .where(
          and(
            eq(approvalCodes.code, code),
            eq(approvalCodes.contactEmail, email),
          ),
        );

      // Note: Drizzle doesn't return affected rows count easily, so we trust the operation
      return result;
    }, "markApprovalCodeUsed");
  }

  // Knowledge Base Categories
  async getKbCategories(): Promise<KbCategory[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(kbCategories)
        .where(eq(kbCategories.isActive, true))
        .orderBy(asc(kbCategories.sortOrder), asc(kbCategories.name));
    }, "getKbCategories");
  }

  async createKbCategory(
    insertCategory: InsertKbCategory,
  ): Promise<KbCategory> {
    return await safeDbQuery(async () => {
      const [category] = await db
        .insert(kbCategories)
        .values(insertCategory)
        .returning();

      if (!category) {
        throw new Error("Failed to create category");
      }

      return category;
    }, "createKbCategory");
  }

  async updateKbCategory(
    id: number,
    category: Partial<InsertKbCategory>,
  ): Promise<KbCategory> {
    return await safeDbQuery(async () => {
      const [updatedCategory] = await db
        .update(kbCategories)
        .set({ ...category, updatedAt: new Date() })
        .where(eq(kbCategories.id, id))
        .returning();

      if (!updatedCategory) {
        throw new Error(`Category with ID ${id} not found`);
      }

      return updatedCategory;
    }, "updateKbCategory");
  }

  async deleteKbCategory(id: number): Promise<void> {
    await safeDbQuery(async () => {
      await db
        .update(kbCategories)
        .set({ isActive: false })
        .where(eq(kbCategories.id, id));
    }, "deleteKbCategory");
  }

  // Knowledge Base Articles
  async getKbArticles(
    categoryId?: number,
    status?: string,
    featured?: boolean,
    title?: string,
  ): Promise<KbArticle[]> {
    return await safeDbQuery(async () => {
      const conditions = [];

      if (categoryId) conditions.push(eq(kbArticles.categoryId, categoryId));
      if (status) conditions.push(eq(kbArticles.status, status));
      if (featured !== undefined)
        conditions.push(eq(kbArticles.featured, featured));
      if (title) conditions.push(eq(kbArticles.title, title));

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      return await db
        .select()
        .from(kbArticles)
        .where(whereClause)
        .orderBy(desc(kbArticles.featured), desc(kbArticles.updatedAt));
    }, "getKbArticles");
  }

  async getKbArticle(id: number): Promise<KbArticle | undefined> {
    return await safeDbQuery(async () => {
      const [article] = await db
        .select()
        .from(kbArticles)
        .where(eq(kbArticles.id, id));
      return article || undefined;
    }, "getKbArticle");
  }

  async getKbArticleBySlug(slug: string): Promise<KbArticle | undefined> {
    return await safeDbQuery(async () => {
      const [article] = await db
        .select()
        .from(kbArticles)
        .where(eq(kbArticles.slug, slug));
      return article || undefined;
    }, "getKbArticleBySlug");
  }

  async createKbArticle(insertArticle: InsertKbArticle): Promise<KbArticle> {
    return await safeDbQuery(async () => {
      const [article] = await db
        .insert(kbArticles)
        .values(insertArticle)
        .returning();

      if (!article) {
        throw new Error("Failed to create article");
      }

      return article;
    }, "createKbArticle");
  }

  async updateKbArticle(
    id: number,
    article: Partial<InsertKbArticle>,
  ): Promise<KbArticle> {
    return await safeDbQuery(async () => {
      const [updatedArticle] = await db
        .update(kbArticles)
        .set({ ...article, updatedAt: new Date() })
        .where(eq(kbArticles.id, id))
        .returning();

      if (!updatedArticle) {
        throw new Error(`Article with ID ${id} not found`);
      }

      return updatedArticle;
    }, "updateKbArticle");
  }

  async deleteKbArticle(id: number): Promise<void> {
    await safeDbQuery(async () => {
      await db.delete(kbArticles).where(eq(kbArticles.id, id));
    }, "deleteKbArticle");
  }

  async archiveKbArticle(id: number): Promise<void> {
    await safeDbQuery(async () => {
      await db
        .update(kbArticles)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(kbArticles.id, id));
    }, "archiveKbArticle");
  }

  async undeleteKbArticle(id: number): Promise<void> {
    await safeDbQuery(async () => {
      await db
        .update(kbArticles)
        .set({ status: "draft", updatedAt: new Date() })
        .where(eq(kbArticles.id, id));
    }, "undeleteKbArticle");
  }

  async incrementArticleViews(id: number): Promise<void> {
    await safeDbQuery(async () => {
      await db
        .update(kbArticles)
        .set({ viewCount: sql`${kbArticles.viewCount} + 1` })
        .where(eq(kbArticles.id, id));
    }, "incrementArticleViews");
  }

  // Search
  async searchKbArticles(query: string, userId?: number): Promise<KbArticle[]> {
    return await safeDbQuery(async () => {
      const searchResults = await db
        .select()
        .from(kbArticles)
        .where(
          and(
            eq(kbArticles.status, "published"),
            sql`(
              ${kbArticles.title} ILIKE ${`%${query}%`} OR
              ${kbArticles.content} ILIKE ${`%${query}%`} OR
              ${kbArticles.excerpt} ILIKE ${`%${query}%`}
            )`,
          ),
        )
        .orderBy(desc(kbArticles.featured), desc(kbArticles.viewCount));

      return searchResults;
    }, "searchKbArticles");
  }

  async recordKbSearch(
    insertSearch: InsertKbSearchHistory,
  ): Promise<KbSearchHistory> {
    return await safeDbQuery(async () => {
      const [search] = await db
        .insert(kbSearchHistory)
        .values(insertSearch)
        .returning();

      if (!search) {
        throw new Error("Failed to record search");
      }

      return search;
    }, "recordKbSearch");
  }

  // Bookmarks
  async getUserKbBookmarks(userId: number): Promise<KbBookmark[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(kbBookmarks)
        .where(eq(kbBookmarks.userId, userId))
        .orderBy(desc(kbBookmarks.createdAt));
    }, "getUserKbBookmarks");
  }

  async createKbBookmark(
    insertBookmark: InsertKbBookmark,
  ): Promise<KbBookmark> {
    return await safeDbQuery(async () => {
      const [bookmark] = await db
        .insert(kbBookmarks)
        .values(insertBookmark)
        .returning();

      if (!bookmark) {
        throw new Error("Failed to create bookmark");
      }

      return bookmark;
    }, "createKbBookmark");
  }

  async deleteKbBookmark(userId: number, articleId: number): Promise<void> {
    await safeDbQuery(async () => {
      await db
        .delete(kbBookmarks)
        .where(
          and(
            eq(kbBookmarks.userId, userId),
            eq(kbBookmarks.articleId, articleId),
          ),
        );
    }, "deleteKbBookmark");
  }

  // Workspace Users - synced from Google Admin API
  async getAllWorkspaceUsers(): Promise<WorkspaceUser[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(workspaceUsers)
        .orderBy(asc(workspaceUsers.fullName));
    }, "getAllWorkspaceUsers");
  }

  async getWorkspaceUserByEmail(
    email: string,
  ): Promise<WorkspaceUser | undefined> {
    return await safeDbQuery(async () => {
      const [user] = await db
        .select()
        .from(workspaceUsers)
        .where(eq(workspaceUsers.email, email))
        .limit(1);
      return user;
    }, "getWorkspaceUserByEmail");
  }

  async getWorkspaceUserByGoogleId(
    googleId: string,
  ): Promise<WorkspaceUser | undefined> {
    return await safeDbQuery(async () => {
      const [user] = await db
        .select()
        .from(workspaceUsers)
        .where(eq(workspaceUsers.googleId, googleId))
        .limit(1);
      return user;
    }, "getWorkspaceUserByGoogleId");
  }

  async upsertWorkspaceUser(
    insertUser: InsertWorkspaceUser,
  ): Promise<WorkspaceUser> {
    return await safeDbQuery(async () => {
      // Try to update existing user first
      const existingUser = await this.getWorkspaceUserByGoogleId(
        insertUser.googleId,
      );

      if (existingUser) {
        // Update existing user
        const [updatedUser] = await db
          .update(workspaceUsers)
          .set({
            ...insertUser,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(workspaceUsers.googleId, insertUser.googleId))
          .returning();

        if (!updatedUser) {
          throw new Error("Failed to update workspace user");
        }

        return updatedUser;
      } else {
        // Create new user
        const [newUser] = await db
          .insert(workspaceUsers)
          .values({
            ...insertUser,
            lastSyncedAt: new Date(),
          })
          .returning();

        if (!newUser) {
          throw new Error("Failed to create workspace user");
        }

        return newUser;
      }
    }, "upsertWorkspaceUser");
  }

  async updateWorkspaceUser(
    googleId: string,
    updateData: Partial<InsertWorkspaceUser>,
  ): Promise<WorkspaceUser> {
    return await safeDbQuery(async () => {
      const [updatedUser] = await db
        .update(workspaceUsers)
        .set({
          ...updateData,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(workspaceUsers.googleId, googleId))
        .returning();

      if (!updatedUser) {
        throw new Error("Failed to update workspace user");
      }

      return updatedUser;
    }, "updateWorkspaceUser");
  }

  async deleteInactiveWorkspaceUsers(
    activeGoogleIds: string[],
  ): Promise<number> {
    return await safeDbQuery(async () => {
      if (activeGoogleIds.length === 0) {
        // Don't delete all users if the list is empty (safety check)
        return 0;
      }

      const result = await db
        .delete(workspaceUsers)
        .where(
          sql`${workspaceUsers.googleId} NOT IN (${activeGoogleIds.map((id) => `'${id}'`).join(", ")})`,
        );

      return result.rowCount || 0;
    }, "deleteInactiveWorkspaceUsers");
  }

  async syncWorkspaceUsers(
    users: InsertWorkspaceUser[],
  ): Promise<{ created: number; updated: number; deleted: number }> {
    return await safeDbQuery(async () => {
      let created = 0;
      let updated = 0;

      // Get current Google IDs to track what should remain active
      const activeGoogleIds = users.map((user) => user.googleId);

      // Upsert each user
      for (const user of users) {
        const existingUser = await this.getWorkspaceUserByGoogleId(
          user.googleId,
        );
        if (existingUser) {
          await this.updateWorkspaceUser(user.googleId, user);
          updated++;
        } else {
          await this.upsertWorkspaceUser(user);
          created++;
        }
      }

      // Delete users that are no longer in Google Workspace
      const deleted = await this.deleteInactiveWorkspaceUsers(activeGoogleIds);

      return { created, updated, deleted };
    }, "syncWorkspaceUsers");
  }

  // Commission tracking methods
  // Sales Representatives
  async getAllSalesReps(): Promise<SalesRep[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(salesReps)
        .where(eq(salesReps.isActive, true))
        .orderBy(asc(salesReps.id));
    }, "getAllSalesReps");
  }

  async getSalesRepByUserId(userId: number): Promise<SalesRep | undefined> {
    return await safeDbQuery(async () => {
      const [salesRep] = await db
        .select()
        .from(salesReps)
        .where(and(eq(salesReps.userId, userId), eq(salesReps.isActive, true)));
      return salesRep || undefined;
    }, "getSalesRepByUserId");
  }

  async createSalesRep(insertSalesRep: InsertSalesRep): Promise<SalesRep> {
    return await safeDbQuery(async () => {
      const [salesRep] = await db
        .insert(salesReps)
        .values(insertSalesRep)
        .returning();

      if (!salesRep) {
        throw new Error("Failed to create sales rep");
      }

      return salesRep;
    }, "createSalesRep");
  }

  async updateSalesRep(
    id: number,
    updateData: Partial<InsertSalesRep>,
  ): Promise<SalesRep> {
    return await safeDbQuery(async () => {
      const [updatedSalesRep] = await db
        .update(salesReps)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(salesReps.id, id))
        .returning();

      if (!updatedSalesRep) {
        throw new Error("Failed to update sales rep");
      }

      return updatedSalesRep;
    }, "updateSalesRep");
  }

  // Deals
  async getAllDeals(salesRepId?: number): Promise<Deal[]> {
    return await safeDbQuery(async () => {
      if (salesRepId) {
        // Get deals for specific sales rep by matching user ID through sales rep table
        const salesRep = await this.getSalesRepByUserId(salesRepId);
        if (!salesRep) return [];

        return await db
          .select()
          .from(deals)
          .where(eq(deals.ownerId, salesRepId))
          .orderBy(desc(deals.updatedAt));
      } else {
        return await db.select().from(deals).orderBy(desc(deals.updatedAt));
      }
    }, "getAllDeals");
  }

  async getDeal(id: number): Promise<Deal | undefined> {
    return await safeDbQuery(async () => {
      const [deal] = await db.select().from(deals).where(eq(deals.id, id));
      return deal || undefined;
    }, "getDeal");
  }

  async getDealsByHubSpotOwnerId(hubspotOwnerId: string): Promise<Deal[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(deals)
        .where(eq(deals.hubspotOwnerId, hubspotOwnerId))
        .orderBy(desc(deals.updatedAt));
    }, "getDealsByHubSpotOwnerId");
  }

  async createDeal(insertDeal: InsertDeal): Promise<Deal> {
    return await safeDbQuery(async () => {
      const [deal] = await db.insert(deals).values(insertDeal).returning();

      if (!deal) {
        throw new Error("Failed to create deal");
      }

      return deal;
    }, "createDeal");
  }

  async updateDeal(id: number, updateData: Partial<InsertDeal>): Promise<Deal> {
    return await safeDbQuery(async () => {
      const [updatedDeal] = await db
        .update(deals)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(deals.id, id))
        .returning();

      if (!updatedDeal) {
        throw new Error("Failed to update deal");
      }

      return updatedDeal;
    }, "updateDeal");
  }

  // Commissions
  async getAllCommissions(salesRepId?: number): Promise<Commission[]> {
    return await safeDbQuery(async () => {
      if (salesRepId) {
        return await db
          .select()
          .from(commissions)
          .where(eq(commissions.salesRepId, salesRepId))
          .orderBy(desc(commissions.dateEarned));
      } else {
        return await db
          .select()
          .from(commissions)
          .orderBy(desc(commissions.dateEarned));
      }
    }, "getAllCommissions");
  }

  async getCommissionsBySalesRep(salesRepId: number): Promise<Commission[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(commissions)
        .where(eq(commissions.salesRepId, salesRepId))
        .orderBy(desc(commissions.dateEarned));
    }, "getCommissionsBySalesRep");
  }

  async getCommissionsByDeal(dealId: number): Promise<Commission[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(commissions)
        .where(eq(commissions.dealId, dealId))
        .orderBy(desc(commissions.dateEarned));
    }, "getCommissionsByDeal");
  }

  async createCommission(
    insertCommission: InsertCommission,
  ): Promise<Commission> {
    return await safeDbQuery(async () => {
      const [commission] = await db
        .insert(commissions)
        .values(insertCommission)
        .returning();

      if (!commission) {
        throw new Error("Failed to create commission");
      }

      return commission;
    }, "createCommission");
  }

  async updateCommission(
    id: number,
    updateData: Partial<InsertCommission>,
  ): Promise<Commission> {
    return await safeDbQuery(async () => {
      const [updatedCommission] = await db
        .update(commissions)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(commissions.id, id))
        .returning();

      if (!updatedCommission) {
        throw new Error("Failed to update commission");
      }

      return updatedCommission;
    }, "updateCommission");
  }

  // Commission Adjustments
  async getAllCommissionAdjustments(): Promise<CommissionAdjustment[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(commissionAdjustments)
        .orderBy(desc(commissionAdjustments.requestedDate));
    }, "getAllCommissionAdjustments");
  }

  async getCommissionAdjustmentsByCommission(
    commissionId: number,
  ): Promise<CommissionAdjustment[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(commissionAdjustments)
        .where(eq(commissionAdjustments.commissionId, commissionId))
        .orderBy(desc(commissionAdjustments.requestedDate));
    }, "getCommissionAdjustmentsByCommission");
  }

  async createCommissionAdjustment(
    insertAdjustment: InsertCommissionAdjustment,
  ): Promise<CommissionAdjustment> {
    return await safeDbQuery(async () => {
      const [adjustment] = await db
        .insert(commissionAdjustments)
        .values(insertAdjustment)
        .returning();

      if (!adjustment) {
        throw new Error("Failed to create commission adjustment");
      }

      return adjustment;
    }, "createCommissionAdjustment");
  }

  async updateCommissionAdjustmentStatus(
    id: number,
    status: string,
    approvedBy: number,
    finalAmount?: number,
    notes?: string,
  ): Promise<CommissionAdjustment> {
    return await safeDbQuery(async () => {
      const updateData: any = {
        status,
        approvedBy,
        reviewedDate: new Date(),
        updatedAt: new Date(),
      };

      if (finalAmount !== undefined) {
        updateData.finalAmount = finalAmount;
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const [updatedAdjustment] = await db
        .update(commissionAdjustments)
        .set(updateData)
        .where(eq(commissionAdjustments.id, id))
        .returning();

      if (!updatedAdjustment) {
        throw new Error("Failed to update commission adjustment");
      }

      return updatedAdjustment;
    }, "updateCommissionAdjustmentStatus");
  }

  // Monthly Bonuses
  async getMonthlyBonuses(salesRepId?: number): Promise<MonthlyBonus[]> {
    return await safeDbQuery(async () => {
      if (salesRepId) {
        return await db
          .select()
          .from(monthlyBonuses)
          .where(eq(monthlyBonuses.salesRepId, salesRepId))
          .orderBy(desc(monthlyBonuses.dateEarned));
      } else {
        return await db
          .select()
          .from(monthlyBonuses)
          .orderBy(desc(monthlyBonuses.dateEarned));
      }
    }, "getMonthlyBonuses");
  }

  async getMonthlyBonusesBySalesRep(
    salesRepId: number,
  ): Promise<MonthlyBonus[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(monthlyBonuses)
        .where(eq(monthlyBonuses.salesRepId, salesRepId))
        .orderBy(desc(monthlyBonuses.dateEarned));
    }, "getMonthlyBonusesBySalesRep");
  }

  async createMonthlyBonus(
    insertBonus: InsertMonthlyBonus,
  ): Promise<MonthlyBonus> {
    return await safeDbQuery(async () => {
      const [bonus] = await db
        .insert(monthlyBonuses)
        .values(insertBonus)
        .returning();

      if (!bonus) {
        throw new Error("Failed to create monthly bonus");
      }

      return bonus;
    }, "createMonthlyBonus");
  }

  async updateMonthlyBonus(
    id: number,
    updateData: Partial<InsertMonthlyBonus>,
  ): Promise<MonthlyBonus> {
    return await safeDbQuery(async () => {
      const [updatedBonus] = await db
        .update(monthlyBonuses)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(monthlyBonuses.id, id))
        .returning();

      if (!updatedBonus) {
        throw new Error("Failed to update monthly bonus");
      }

      return updatedBonus;
    }, "updateMonthlyBonus");
  }

  // Milestone Bonuses
  async getMilestoneBonuses(salesRepId?: number): Promise<MilestoneBonus[]> {
    return await safeDbQuery(async () => {
      if (salesRepId) {
        return await db
          .select()
          .from(milestoneBonuses)
          .where(eq(milestoneBonuses.salesRepId, salesRepId))
          .orderBy(desc(milestoneBonuses.dateEarned));
      } else {
        return await db
          .select()
          .from(milestoneBonuses)
          .orderBy(desc(milestoneBonuses.dateEarned));
      }
    }, "getMilestoneBonuses");
  }

  async getMilestoneBonusesBySalesRep(
    salesRepId: number,
  ): Promise<MilestoneBonus[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(milestoneBonuses)
        .where(eq(milestoneBonuses.salesRepId, salesRepId))
        .orderBy(desc(milestoneBonuses.dateEarned));
    }, "getMilestoneBonusesBySalesRep");
  }

  async createMilestoneBonus(
    insertBonus: InsertMilestoneBonus,
  ): Promise<MilestoneBonus> {
    return await safeDbQuery(async () => {
      const [bonus] = await db
        .insert(milestoneBonuses)
        .values(insertBonus)
        .returning();

      if (!bonus) {
        throw new Error("Failed to create milestone bonus");
      }

      return bonus;
    }, "createMilestoneBonus");
  }

  async updateMilestoneBonus(
    id: number,
    updateData: Partial<InsertMilestoneBonus>,
  ): Promise<MilestoneBonus> {
    return await safeDbQuery(async () => {
      const [updatedBonus] = await db
        .update(milestoneBonuses)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(milestoneBonuses.id, id))
        .returning();

      if (!updatedBonus) {
        throw new Error("Failed to update milestone bonus");
      }

      return updatedBonus;
    }, "updateMilestoneBonus");
  }

  // Pricing Configuration Methods Implementation
  async getAllPricingBase(): Promise<PricingBase[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(pricingBase)
        .where(eq(pricingBase.isActive, true));
    }, "getAllPricingBase");
  }

  async getPricingBaseByService(
    service: string,
  ): Promise<PricingBase | undefined> {
    return await safeDbQuery(async () => {
      const [result] = await db
        .select()
        .from(pricingBase)
        .where(
          and(eq(pricingBase.service, service), eq(pricingBase.isActive, true)),
        );
      return result || undefined;
    }, "getPricingBaseByService");
  }

  async updatePricingBase(
    id: number,
    updateData: Partial<InsertPricingBase>,
    changedBy: number,
  ): Promise<PricingBase> {
    return await safeDbQuery(async () => {
      const [oldRecord] = await db
        .select()
        .from(pricingBase)
        .where(eq(pricingBase.id, id));

      const [updatedRecord] = await db
        .update(pricingBase)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(pricingBase.id, id))
        .returning();

      if (!updatedRecord) {
        throw new Error("Failed to update pricing base");
      }

      // Record history for each changed field
      for (const [field, newValue] of Object.entries(updateData)) {
        if (field !== "updatedAt" && oldRecord) {
          const oldValue = oldRecord[field as keyof PricingBase];
          if (oldValue !== newValue) {
            await db.insert(pricingHistory).values({
              tableAffected: "pricing_base",
              recordId: id,
              fieldChanged: field,
              oldValue: oldValue?.toString() || null,
              newValue: newValue?.toString() || "",
              changedBy,
            });
          }
        }
      }

      return updatedRecord;
    }, "updatePricingBase");
  }

  async getAllIndustryMultipliers(): Promise<PricingIndustryMultiplier[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(pricingIndustryMultipliers)
        .where(eq(pricingIndustryMultipliers.isActive, true));
    }, "getAllIndustryMultipliers");
  }

  async getIndustryMultiplier(
    industry: string,
  ): Promise<PricingIndustryMultiplier | undefined> {
    return await safeDbQuery(async () => {
      const [result] = await db
        .select()
        .from(pricingIndustryMultipliers)
        .where(
          and(
            eq(pricingIndustryMultipliers.industry, industry),
            eq(pricingIndustryMultipliers.isActive, true),
          ),
        );
      return result || undefined;
    }, "getIndustryMultiplier");
  }

  async updateIndustryMultiplier(
    id: number,
    updateData: Partial<InsertPricingIndustryMultiplier>,
    changedBy: number,
  ): Promise<PricingIndustryMultiplier> {
    return await safeDbQuery(async () => {
      const [oldRecord] = await db
        .select()
        .from(pricingIndustryMultipliers)
        .where(eq(pricingIndustryMultipliers.id, id));

      const [updatedRecord] = await db
        .update(pricingIndustryMultipliers)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(pricingIndustryMultipliers.id, id))
        .returning();

      if (!updatedRecord) {
        throw new Error("Failed to update industry multiplier");
      }

      // Record history
      for (const [field, newValue] of Object.entries(updateData)) {
        if (field !== "updatedAt" && oldRecord) {
          const oldValue = oldRecord[field as keyof PricingIndustryMultiplier];
          if (oldValue !== newValue) {
            await db.insert(pricingHistory).values({
              tableAffected: "pricing_industry_multipliers",
              recordId: id,
              fieldChanged: field,
              oldValue: oldValue?.toString() || null,
              newValue: newValue?.toString() || "",
              changedBy,
            });
          }
        }
      }

      return updatedRecord;
    }, "updateIndustryMultiplier");
  }

  async getAllRevenueMultipliers(): Promise<PricingRevenueMultiplier[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(pricingRevenueMultipliers)
        .where(eq(pricingRevenueMultipliers.isActive, true));
    }, "getAllRevenueMultipliers");
  }

  async getRevenueMultiplier(
    revenueRange: string,
  ): Promise<PricingRevenueMultiplier | undefined> {
    return await safeDbQuery(async () => {
      const [result] = await db
        .select()
        .from(pricingRevenueMultipliers)
        .where(
          and(
            eq(pricingRevenueMultipliers.revenueRange, revenueRange),
            eq(pricingRevenueMultipliers.isActive, true),
          ),
        );
      return result || undefined;
    }, "getRevenueMultiplier");
  }

  async updateRevenueMultiplier(
    id: number,
    updateData: Partial<InsertPricingRevenueMultiplier>,
    changedBy: number,
  ): Promise<PricingRevenueMultiplier> {
    return await safeDbQuery(async () => {
      const [oldRecord] = await db
        .select()
        .from(pricingRevenueMultipliers)
        .where(eq(pricingRevenueMultipliers.id, id));

      const [updatedRecord] = await db
        .update(pricingRevenueMultipliers)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(pricingRevenueMultipliers.id, id))
        .returning();

      if (!updatedRecord) {
        throw new Error("Failed to update revenue multiplier");
      }

      // Record history
      for (const [field, newValue] of Object.entries(updateData)) {
        if (field !== "updatedAt" && oldRecord) {
          const oldValue = oldRecord[field as keyof PricingRevenueMultiplier];
          if (oldValue !== newValue) {
            await db.insert(pricingHistory).values({
              tableAffected: "pricing_revenue_multipliers",
              recordId: id,
              fieldChanged: field,
              oldValue: oldValue?.toString() || null,
              newValue: newValue?.toString() || "",
              changedBy,
            });
          }
        }
      }

      return updatedRecord;
    }, "updateRevenueMultiplier");
  }

  async getAllTransactionSurcharges(): Promise<PricingTransactionSurcharge[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(pricingTransactionSurcharges)
        .where(eq(pricingTransactionSurcharges.isActive, true));
    }, "getAllTransactionSurcharges");
  }

  async getTransactionSurcharge(
    transactionRange: string,
  ): Promise<PricingTransactionSurcharge | undefined> {
    return await safeDbQuery(async () => {
      const [result] = await db
        .select()
        .from(pricingTransactionSurcharges)
        .where(
          and(
            eq(pricingTransactionSurcharges.transactionRange, transactionRange),
            eq(pricingTransactionSurcharges.isActive, true),
          ),
        );
      return result || undefined;
    }, "getTransactionSurcharge");
  }

  async updateTransactionSurcharge(
    id: number,
    updateData: Partial<InsertPricingTransactionSurcharge>,
    changedBy: number,
  ): Promise<PricingTransactionSurcharge> {
    return await safeDbQuery(async () => {
      const [oldRecord] = await db
        .select()
        .from(pricingTransactionSurcharges)
        .where(eq(pricingTransactionSurcharges.id, id));

      const [updatedRecord] = await db
        .update(pricingTransactionSurcharges)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(pricingTransactionSurcharges.id, id))
        .returning();

      if (!updatedRecord) {
        throw new Error("Failed to update transaction surcharge");
      }

      // Record history
      for (const [field, newValue] of Object.entries(updateData)) {
        if (field !== "updatedAt" && oldRecord) {
          const oldValue =
            oldRecord[field as keyof PricingTransactionSurcharge];
          if (oldValue !== newValue) {
            await db.insert(pricingHistory).values({
              tableAffected: "pricing_transaction_surcharges",
              recordId: id,
              fieldChanged: field,
              oldValue: oldValue?.toString() || null,
              newValue: newValue?.toString() || "",
              changedBy,
            });
          }
        }
      }

      return updatedRecord;
    }, "updateTransactionSurcharge");
  }

  async getAllServiceSettings(): Promise<PricingServiceSetting[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(pricingServiceSettings)
        .where(eq(pricingServiceSettings.isActive, true));
    }, "getAllServiceSettings");
  }

  async getServiceSettingsByService(
    service: string,
  ): Promise<PricingServiceSetting[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(pricingServiceSettings)
        .where(
          and(
            eq(pricingServiceSettings.service, service),
            eq(pricingServiceSettings.isActive, true),
          ),
        );
    }, "getServiceSettingsByService");
  }

  async getServiceSetting(
    service: string,
    settingKey: string,
  ): Promise<PricingServiceSetting | undefined> {
    return await safeDbQuery(async () => {
      const [result] = await db
        .select()
        .from(pricingServiceSettings)
        .where(
          and(
            eq(pricingServiceSettings.service, service),
            eq(pricingServiceSettings.settingKey, settingKey),
            eq(pricingServiceSettings.isActive, true),
          ),
        );
      return result || undefined;
    }, "getServiceSetting");
  }

  async updateServiceSetting(
    id: number,
    updateData: Partial<InsertPricingServiceSetting>,
    changedBy: number,
  ): Promise<PricingServiceSetting> {
    return await safeDbQuery(async () => {
      const [oldRecord] = await db
        .select()
        .from(pricingServiceSettings)
        .where(eq(pricingServiceSettings.id, id));

      const [updatedRecord] = await db
        .update(pricingServiceSettings)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(pricingServiceSettings.id, id))
        .returning();

      if (!updatedRecord) {
        throw new Error("Failed to update service setting");
      }

      // Record history
      for (const [field, newValue] of Object.entries(updateData)) {
        if (field !== "updatedAt" && oldRecord) {
          const oldValue = oldRecord[field as keyof PricingServiceSetting];
          if (oldValue !== newValue) {
            await db.insert(pricingHistory).values({
              tableAffected: "pricing_service_settings",
              recordId: id,
              fieldChanged: field,
              oldValue: oldValue?.toString() || null,
              newValue: newValue?.toString() || "",
              changedBy,
            });
          }
        }
      }

      return updatedRecord;
    }, "updateServiceSetting");
  }

  async getAllPricingTiers(): Promise<PricingTier[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.isActive, true));
    }, "getAllPricingTiers");
  }

  async getPricingTiersByService(service: string): Promise<PricingTier[]> {
    return await safeDbQuery(async () => {
      return await db
        .select()
        .from(pricingTiers)
        .where(
          and(
            eq(pricingTiers.service, service),
            eq(pricingTiers.isActive, true),
          ),
        );
    }, "getPricingTiersByService");
  }

  async getPricingTier(
    service: string,
    tier: string,
    volumeBand: string,
  ): Promise<PricingTier | undefined> {
    return await safeDbQuery(async () => {
      const [result] = await db
        .select()
        .from(pricingTiers)
        .where(
          and(
            eq(pricingTiers.service, service),
            eq(pricingTiers.tier, tier),
            eq(pricingTiers.volumeBand, volumeBand),
            eq(pricingTiers.isActive, true),
          ),
        );
      return result || undefined;
    }, "getPricingTier");
  }

  async updatePricingTier(
    id: number,
    updateData: Partial<InsertPricingTier>,
    changedBy: number,
  ): Promise<PricingTier> {
    return await safeDbQuery(async () => {
      const [oldRecord] = await db
        .select()
        .from(pricingTiers)
        .where(eq(pricingTiers.id, id));

      const [updatedRecord] = await db
        .update(pricingTiers)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(pricingTiers.id, id))
        .returning();

      if (!updatedRecord) {
        throw new Error("Failed to update pricing tier");
      }

      // Record history
      for (const [field, newValue] of Object.entries(updateData)) {
        if (field !== "updatedAt" && oldRecord) {
          const oldValue = oldRecord[field as keyof PricingTier];
          if (oldValue !== newValue) {
            await db.insert(pricingHistory).values({
              tableAffected: "pricing_tiers",
              recordId: id,
              fieldChanged: field,
              oldValue: oldValue?.toString() || null,
              newValue: newValue?.toString() || "",
              changedBy,
            });
          }
        }
      }

      return updatedRecord;
    }, "updatePricingTier");
  }

  async getPricingHistory(
    tableAffected?: string,
    recordId?: number,
  ): Promise<PricingHistory[]> {
    return await safeDbQuery(async () => {
      let query = db.select().from(pricingHistory);

      if (tableAffected && recordId) {
        query = query.where(
          and(
            eq(pricingHistory.tableAffected, tableAffected),
            eq(pricingHistory.recordId, recordId),
          ),
        );
      } else if (tableAffected) {
        query = query.where(eq(pricingHistory.tableAffected, tableAffected));
      }

      return await query.orderBy(desc(pricingHistory.createdAt));
    }, "getPricingHistory");
  }
}

// Export a function that creates the storage instance
// This allows us to control when storage is initialized
export function createStorage(): DatabaseStorage {
  return new DatabaseStorage();
}

// Create the singleton instance
const storageInstance = createStorage();

// Initialize Redis asynchronously
storageInstance.init().catch((err) => {
  console.error("[Storage] Failed to initialize Redis storage:", err);
});

// Export the singleton instance
export const storage = storageInstance;
