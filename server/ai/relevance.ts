export type CandidateFile = {
  id: string;
  name: string;
  size?: number;
  modified_at?: string;
};

// Expanded financial terminology for filename relevance matching
const EXPAND = {
  financial: ["financial", "report", "reports", "package", "statement"],
  balanceSheet: [
    "balance",
    "balance-sheet",
    "balance_sheet",
    "sofp",
    "statement of financial position",
    "bs",
    "balancesheet",
  ],
  incomeStatement: [
    "income",
    "statement of operations",
    "statement of income",
    "p&l",
    "pnl",
    "profit",
    "loss",
    "pl",
    "earnings",
    "revenue",
    "sales",
  ],
  cashFlow: ["cash", "cash-flow", "cashflow", "statement of cash flows", "cfs"],
  kpis: ["kpi", "metric", "metrics", "dashboard"],
  ledger: ["trial balance", "tb", "general ledger", "gl", "ledger"],
  workingCapital: ["ar", "accounts receivable", "ap", "accounts payable", "aging"],
  expenses: ["expenses", "cogs", "cost of goods", "sga", "sg&a"],
  ebitda: ["ebitda", "ebit", "operating income"],
  capex: ["capex", "capital expenditures", "depreciation", "amortization"],
  planning: ["budget", "forecast", "variance", "plan", "actual"],
  months: [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
    "monthly",
    "q1",
    "q2",
    "q3",
    "q4",
    "fy",
    "ytd",
    "qtd",
  ],
} as const;

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s&/.-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

export function selectTopRelevantFiles(
  question: string,
  candidates: CandidateFile[],
  max: number
): CandidateFile[] {
  const baseTokens = tokenize(question || "");
  const keywords = new Set<string>(baseTokens);

  const q = (question || "").toLowerCase();
  const addAll = (arr: readonly string[]) => arr.forEach((v) => keywords.add(v));

  if (/financial|report|package/.test(q)) addAll(EXPAND.financial);
  if (/balance|bs|financial position/.test(q)) addAll(EXPAND.balanceSheet);
  if (/p&?l|profit|loss|income|operations|revenue|sales/i.test(q)) addAll(EXPAND.incomeStatement);
  if (/cash\s*flow|cashflow|cfs/i.test(q)) addAll(EXPAND.cashFlow);
  if (/kpi|metric/i.test(q)) addAll(EXPAND.kpis);
  if (/ledger|trial|tb\b|\bgl\b/i.test(q)) addAll(EXPAND.ledger);
  if (/\bar\b|receivable|\bap\b|payable|aging/i.test(q)) addAll(EXPAND.workingCapital);
  if (/expense|cogs|sga|sg&a/i.test(q)) addAll(EXPAND.expenses);
  if (/ebitda|ebit|operating income/i.test(q)) addAll(EXPAND.ebitda);
  if (/capex|depreciation|amortization/i.test(q)) addAll(EXPAND.capex);
  if (/budget|forecast|variance|plan|actual/i.test(q)) addAll(EXPAND.planning);
  EXPAND.months.forEach((m) => {
    if (q.includes(m)) keywords.add(m);
  });

  const scored = candidates.map((f) => {
    const name = (f.name || "").toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (!kw) continue;
      if (name.includes(kw)) score += kw.length >= 4 ? 2 : 1;
    }
    if (f.modified_at) {
      const days = Math.max(
        0,
        (Date.now() - new Date(f.modified_at).getTime()) / (1000 * 60 * 60 * 24)
      );
      const recencyBoost = days < 45 ? 2 : days < 120 ? 1 : 0;
      score += recencyBoost;
    }
    return { f, score };
  });

  scored.sort((a, b) => b.score - a.score || a.f.name.localeCompare(b.f.name));

  const picked: CandidateFile[] = [];
  const seen = new Set<string>();
  for (const s of scored) {
    if (picked.length >= max) break;
    if (seen.has(s.f.id)) continue;
    seen.add(s.f.id);
    picked.push(s.f);
  }
  return picked;
}
