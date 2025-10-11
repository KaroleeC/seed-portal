import { Router } from "express";
import { requireAuth } from "../middleware/supabase-auth";
import { getErrorMessage } from "../utils/error-handling";

const router = Router();

router.get("/api/stripe/revenue", requireAuth, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({
        status: "error",
        message: "Stripe not configured - missing STRIPE_SECRET_KEY",
      });
    }

    const Stripe = await import("stripe");
    const stripe = new Stripe.default(process.env.STRIPE_SECRET_KEY as string);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const fetchAllCharges = async (params: any) => {
      const allCharges: any[] = [];
      let hasMore = true;
      let startingAfter: string | undefined = undefined;
      while (hasMore) {
        const response: any = await stripe.charges.list({ ...params, limit: 100, starting_after: startingAfter });
        allCharges.push(...response.data);
        hasMore = response.has_more;
        if (hasMore && response.data.length > 0) startingAfter = response.data[response.data.length - 1].id;
      }
      return { data: allCharges };
    };

    const [currentMonthCharges, yearToDateCharges, lastMonthCharges] = await Promise.all([
      fetchAllCharges({
        created: { gte: Math.floor(startOfMonth.getTime() / 1000) },
        expand: ["data.balance_transaction"],
      }),
      fetchAllCharges({
        created: { gte: Math.floor(startOfYear.getTime() / 1000) },
        expand: ["data.balance_transaction"],
      }),
      fetchAllCharges({
        created: {
          gte: Math.floor(lastMonth.getTime() / 1000),
          lt: Math.floor(endOfLastMonth.getTime() / 1000),
        },
        expand: ["data.balance_transaction"],
      }),
    ]);

    const calculateRevenue = (charges: any) =>
      charges.data
        .filter((c: any) => c.status === "succeeded" && c.livemode === true)
        .reduce((sum: number, c: any) => {
          const bt = c.balance_transaction;
          return sum + (bt ? bt.amount / 100 : c.amount / 100);
        }, 0);

    const calculateTransactionCount = (charges: any) =>
      charges.data.filter((c: any) => c.status === "succeeded" && c.livemode === true).length;

    const currentMonthRevenue = calculateRevenue(currentMonthCharges);
    const yearToDateRevenue = calculateRevenue(yearToDateCharges);
    const lastMonthRevenue = calculateRevenue(lastMonthCharges);

    const monthOverMonthGrowth = lastMonthRevenue > 0 ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    res.json({
      currentMonth: { revenue: currentMonthRevenue, transactions: calculateTransactionCount(currentMonthCharges) },
      lastMonth: { revenue: lastMonthRevenue, transactions: calculateTransactionCount(lastMonthCharges) },
      yearToDate: { revenue: yearToDateRevenue, transactions: calculateTransactionCount(yearToDateCharges) },
      growth: { monthOverMonth: monthOverMonthGrowth },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Stripe revenue fetch error:", getErrorMessage(error));
    res.status(500).json({ status: "error", message: "Failed to fetch revenue data from Stripe", error: getErrorMessage(error) });
  }
});

router.get("/api/stripe/recent-transactions", requireAuth, async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ status: "error", message: "Stripe not configured - missing STRIPE_SECRET_KEY" });
    }
    const Stripe = await import("stripe");
    const stripe = new Stripe.default(process.env.STRIPE_SECRET_KEY as string);

    const charges: any = await stripe.charges.list({ limit: 10 });
    const transactions = charges.data.map((charge: any) => ({
      id: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency.toUpperCase(),
      status: charge.status,
      description: charge.description || "No description",
      customer: charge.billing_details?.name || "Unknown",
      created: new Date(charge.created * 1000).toISOString(),
      receipt_url: charge.receipt_url,
    }));

    res.json({ transactions, lastUpdated: new Date().toISOString() });
  } catch (error: any) {
    console.error("Stripe transactions fetch error:", getErrorMessage(error));
    res.status(500).json({ status: "error", message: "Failed to fetch recent transactions from Stripe", error: getErrorMessage(error) });
  }
});

export default router;
