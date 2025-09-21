import { db } from '../db.js';
import { commissions, monthlyBonuses, milestoneBonuses, salesReps } from '../../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../logger.js';

interface BonusEligibility {
  salesRepId: number;
  salesRepName: string;
  clientsClosedThisMonth: number;
  totalClientsAllTime: number;
  currentMonth: string;
}

export class BonusTrackingService {
  
  /**
   * Check and award monthly bonuses for all sales reps
   */
  async checkAndAwardMonthlyBonuses(salesRepMetrics: BonusEligibility[]): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    for (const rep of salesRepMetrics) {
      await this.processMonthlyBonus(rep, currentMonth);
    }
  }

  /**
   * Process monthly bonus for a specific sales rep
   */
  private async processMonthlyBonus(rep: BonusEligibility, month: string): Promise<void> {
    try {
      // Check if bonus already awarded for this month
      const existingBonus = await db
        .select()
        .from(monthlyBonuses)
        .where(and(
          eq(monthlyBonuses.salesRepId, rep.salesRepId),
          eq(monthlyBonuses.month, month)
        ))
        .limit(1);

      if (existingBonus.length > 0) {
        logger.info(`Monthly bonus already awarded for ${rep.salesRepName} in ${month}`);
        return;
      }

      // Determine bonus eligibility
      const bonusInfo = this.calculateMonthlyBonus(rep.clientsClosedThisMonth);
      
      if (!bonusInfo) {
        return; // No bonus earned
      }

      // Create monthly bonus record
      const [bonusRecord] = await db
        .insert(monthlyBonuses)
        .values({
          salesRepId: rep.salesRepId,
          month,
          clientsClosedCount: rep.clientsClosedThisMonth,
          bonusAmount: bonusInfo.amount.toString(),
          bonusType: bonusInfo.type,
          status: 'pending',
          dateEarned: new Date(),
          notes: `${bonusInfo.description} - ${rep.clientsClosedThisMonth} clients closed in ${month}`
        })
        .returning();

      // Create corresponding commission record
      await db
        .insert(commissions)
        .values({
          monthlyBonusId: bonusRecord.id,
          salesRepId: rep.salesRepId,
          type: 'monthly_bonus',
          amount: bonusInfo.amount.toString(),
          status: 'pending',
          monthNumber: 1, // Bonuses are one-time payments
          serviceType: 'bonus',
          dateEarned: new Date(),
          notes: `Monthly bonus: ${bonusInfo.description}`
        });

      logger.info(`Monthly bonus awarded: ${rep.salesRepName} earned ${bonusInfo.description} ($${bonusInfo.amount}) for ${rep.clientsClosedThisMonth} clients`);
      
    } catch (error) {
      logger.error(`Error processing monthly bonus for ${rep.salesRepName}:`, error);
    }
  }

  /**
   * Check and award milestone bonuses for all sales reps
   */
  async checkAndAwardMilestoneBonuses(salesRepMetrics: BonusEligibility[]): Promise<void> {
    for (const rep of salesRepMetrics) {
      await this.processMilestoneBonuses(rep);
    }
  }

  /**
   * Process milestone bonuses for a specific sales rep
   */
  private async processMilestoneBonuses(rep: BonusEligibility): Promise<void> {
    try {
      const milestones = [
        { threshold: 25, amount: 1000, description: 'Pro Level - 25 Clients' },
        { threshold: 40, amount: 5000, description: 'Expert Level - 40 Clients' },
        { threshold: 60, amount: 7500, description: 'Master Level - 60 Clients' },
        { threshold: 100, amount: 10000, description: 'Elite Level - 100 Clients + Equity' }
      ];

      for (const milestone of milestones) {
        if (rep.totalClientsAllTime >= milestone.threshold) {
          await this.awardMilestoneBonus(rep, milestone);
        }
      }
    } catch (error) {
      logger.error(`Error processing milestone bonuses for ${rep.salesRepName}:`, error);
    }
  }

  /**
   * Award a specific milestone bonus if not already awarded
   */
  private async awardMilestoneBonus(rep: BonusEligibility, milestone: any): Promise<void> {
    try {
      // Check if milestone already awarded
      const existingMilestone = await db
        .select()
        .from(milestoneBonuses)
        .where(and(
          eq(milestoneBonuses.salesRepId, rep.salesRepId),
          eq(milestoneBonuses.milestone, milestone.threshold)
        ))
        .limit(1);

      if (existingMilestone.length > 0) {
        return; // Already awarded
      }

      // Create milestone bonus record
      const [bonusRecord] = await db
        .insert(milestoneBonuses)
        .values({
          salesRepId: rep.salesRepId,
          milestone: milestone.threshold,
          bonusAmount: milestone.amount.toString(),
          includesEquity: milestone.threshold >= 100,
          status: 'pending',
          dateEarned: new Date(),
          notes: `${milestone.description} - ${rep.totalClientsAllTime} total clients`
        })
        .returning();

      // Create corresponding commission record
      await db
        .insert(commissions)
        .values({
          milestoneBonusId: bonusRecord.id,
          salesRepId: rep.salesRepId,
          type: 'milestone_bonus',
          amount: milestone.amount.toString(),
          status: 'pending',
          monthNumber: 1, // Bonuses are one-time payments
          serviceType: 'bonus',
          dateEarned: new Date(),
          notes: `Milestone bonus: ${milestone.description}`
        });

      logger.info(`Milestone bonus awarded: ${rep.salesRepName} earned ${milestone.description} ($${milestone.amount})`);
      
    } catch (error) {
      logger.error(`Error awarding milestone bonus for ${rep.salesRepName}:`, error);
    }
  }

  /**
   * Calculate monthly bonus based on clients closed
   */
  private calculateMonthlyBonus(clientsClosedThisMonth: number): { amount: number; type: string; description: string } | null {
    if (clientsClosedThisMonth >= 15) {
      return { amount: 1500, type: 'macbook_air', description: 'MacBook Air Bonus' };
    }
    if (clientsClosedThisMonth >= 10) {
      return { amount: 1000, type: 'apple_watch', description: 'Apple Watch Bonus' };
    }
    if (clientsClosedThisMonth >= 5) {
      return { amount: 500, type: 'airpods', description: 'AirPods Bonus' };
    }
    return null;
  }

  /**
   * Get all pending bonuses (for admin review)
   */
  async getPendingBonuses(): Promise<any[]> {
    try {
      const pendingMonthlyBonuses = await db
        .select()
        .from(monthlyBonuses)
        .where(eq(monthlyBonuses.status, 'pending'))
        .orderBy(desc(monthlyBonuses.dateEarned));

      const pendingMilestoneBonuses = await db
        .select()
        .from(milestoneBonuses)
        .where(eq(milestoneBonuses.status, 'pending'))
        .orderBy(desc(milestoneBonuses.dateEarned));

      return [
        ...pendingMonthlyBonuses.map((b: any) => ({ ...b, bonusCategory: 'monthly' })),
        ...pendingMilestoneBonuses.map((b: any) => ({ ...b, bonusCategory: 'milestone' }))
      ];
    } catch (error) {
      logger.error('Error fetching pending bonuses:', error);
      return [];
    }
  }
}

export const bonusTrackingService = new BonusTrackingService();