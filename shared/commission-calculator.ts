// Commission calculation utilities and business logic

export interface MonthlyBonusEligibility {
  eligible: boolean;
  amount: number;
  description: string;
  type: "cash" | "product";
}

export interface MilestoneBonusEligibility {
  eligible: boolean;
  amount: number;
  includesEquity: boolean;
  description: string;
}

export interface NextMilestone {
  nextMilestone: number;
  progress: number;
  remaining: number;
}

export interface TotalEarnings {
  totalEarnings: number;
  commissionEarnings: number;
  monthlyBonusEarnings: number;
  milestoneBonusEarnings: number;
}

/**
 * Calculate monthly bonus eligibility based on clients closed
 */
export function calculateMonthlyBonus(
  clientsClosedThisMonth: number
): MonthlyBonusEligibility | null {
  if (clientsClosedThisMonth >= 15) {
    return {
      eligible: true,
      amount: 1500,
      description: "15+ clients closed - $1,500 cash or MacBook Air",
      type: "cash",
    };
  }

  if (clientsClosedThisMonth >= 10) {
    return {
      eligible: true,
      amount: 1000,
      description: "10-14 clients closed - $1,000 cash or Apple Watch",
      type: "cash",
    };
  }

  if (clientsClosedThisMonth >= 5) {
    return {
      eligible: true,
      amount: 500,
      description: "5-9 clients closed - $500 cash or AirPods",
      type: "cash",
    };
  }

  return null;
}

/**
 * Calculate milestone bonus eligibility based on total clients closed
 */
export function calculateMilestoneBonus(
  totalClientsAllTime: number
): MilestoneBonusEligibility | null {
  const milestones = [
    {
      threshold: 100,
      amount: 10000,
      equity: true,
      description: "100 Client Milestone - $10,000 + Equity",
    },
    {
      threshold: 60,
      amount: 7500,
      equity: false,
      description: "60 Client Milestone - $7,500",
    },
    {
      threshold: 40,
      amount: 5000,
      equity: false,
      description: "40 Client Milestone - $5,000",
    },
    {
      threshold: 25,
      amount: 1000,
      equity: false,
      description: "25 Client Milestone - $1,000",
    },
  ];

  for (const milestone of milestones) {
    if (totalClientsAllTime >= milestone.threshold) {
      return {
        eligible: true,
        amount: milestone.amount,
        includesEquity: milestone.equity,
        description: milestone.description,
      };
    }
  }

  return null;
}

/**
 * Get next milestone information and progress
 */
export function getNextMilestone(totalClientsAllTime: number): NextMilestone {
  const milestones = [25, 40, 60, 100];

  for (const milestone of milestones) {
    if (totalClientsAllTime < milestone) {
      const progress = (totalClientsAllTime / milestone) * 100;
      const remaining = milestone - totalClientsAllTime;

      return {
        nextMilestone: milestone,
        progress: Math.min(progress, 100),
        remaining,
      };
    }
  }

  // If beyond all milestones
  return {
    nextMilestone: 100,
    progress: 100,
    remaining: 0,
  };
}

/**
 * Calculate total earnings from all sources
 */
export function calculateTotalEarnings(
  commissionEarnings: number,
  monthlyBonuses: Array<{ bonusAmount: number; status: string }>,
  milestoneBonuses: Array<{ bonusAmount: number; status: string }>
): TotalEarnings {
  const monthlyBonusEarnings = monthlyBonuses
    .filter((bonus) => bonus.status === "paid" || bonus.status === "approved")
    .reduce((sum, bonus) => sum + bonus.bonusAmount, 0);

  const milestoneBonusEarnings = milestoneBonuses
    .filter((bonus) => bonus.status === "paid" || bonus.status === "approved")
    .reduce((sum, bonus) => sum + bonus.bonusAmount, 0);

  const totalEarnings = commissionEarnings + monthlyBonusEarnings + milestoneBonusEarnings;

  return {
    totalEarnings,
    commissionEarnings,
    monthlyBonusEarnings,
    milestoneBonusEarnings,
  };
}

/**
 * Calculate commission rates based on service type and month
 */
export function calculateCommissionRate(serviceType: string, isFirstMonth: boolean): number {
  // Aligned with COMMISSION_BONUS_STRUCTURE.md:
  // - Month 1 Commission: 40% of first month's MRR
  // - Residual Commission: 10% of months 2-12 MRR
  // Note: Setup commission (20% of setup fee) is handled separately and should
  // not use this function. We keep the signature for backward compatibility but
  // ignore serviceType per the global policy.
  return isFirstMonth ? 0.4 : 0.1;
}

/**
 * Calculate projected commission based on deal value and service type
 */
export function calculateProjectedCommission(
  setupFee: number,
  monthlyFee: number,
  serviceType: string
): { firstMonth: number; monthly: number; total: number } {
  // Setup commission: 20% of setup fee
  const setupCommission = setupFee * 0.2;
  // Month 1 commission: 40% of first month's MRR
  const firstMonthCommission = monthlyFee * 0.4;
  // Residual commission (months 2–12): 10% of MRR
  const monthlyCommission = monthlyFee * 0.1;

  const firstMonth = setupCommission + firstMonthCommission;
  const total = firstMonth + monthlyCommission * 11; // 12-month projection (months 2–12)

  return {
    firstMonth,
    monthly: monthlyCommission,
    total,
  };
}

/**
 * Calculate commission from HubSpot invoice line item
 */
export function calculateCommissionFromInvoice(
  lineItem: { description?: string; quantity?: number; price?: number },
  totalInvoiceAmount: number
): { amount: number; type: "setup" | "monthly" | "other" } {
  const description = lineItem.description?.toLowerCase() || "";
  const amount = (lineItem.quantity || 0) * (lineItem.price || 0);

  // Determine commission type based on description
  let commissionRate = 0;
  let type: "setup" | "monthly" | "other" = "other";

  if (
    description.includes("setup") ||
    description.includes("onboarding") ||
    description.includes("implementation")
  ) {
    // Setup/onboarding fees get 20% commission
    commissionRate = 0.2;
    type = "setup";
  } else if (
    description.includes("monthly") ||
    description.includes("subscription") ||
    description.includes("recurring")
  ) {
    // Monthly fees - determine if first month (40%) or recurring (10%)
    // For now, assume 10% for monthly (admin can adjust for first month manually)
    commissionRate = 0.1;
    type = "monthly";

    // Check if this looks like a first month payment (higher rate)
    if (
      description.includes("first") ||
      description.includes("initial") ||
      description.includes("month 1")
    ) {
      commissionRate = 0.4;
    }
  } else if (
    description.includes("bookkeeping") ||
    description.includes("accounting") ||
    description.includes("taas") ||
    description.includes("payroll") ||
    description.includes("ap/ar") ||
    description.includes("fp&a")
  ) {
    // Service-specific rates (default to 10% for ongoing services)
    commissionRate = 0.1;
    type = "monthly";
  }

  const commissionAmount = amount * commissionRate;

  return {
    amount: commissionAmount,
    type,
  };
}
