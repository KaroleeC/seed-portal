/*
 Minimal golden tests for Command Dock filtering/sorting and keyboard navigation.
 Run with:
   NODE_ENV=development tsx client/src/components/command/__tests__/command-dock.golden.ts
 or via npm script `npm run test:command-dock` if added.
*/

import {
  applyOperatorFilters,
  buildSearchBlob,
  clampIndex,
  scoreItemLike,
  type Recents,
  type NavCategory,
} from "../command-dock.utils";

function assert(name: string, cond: boolean) {
  if (!cond) throw new Error(`Assertion failed: ${name}`);
}

function approxGreater(name: string, a: number, b: number) {
  assert(`${name} expected ${a} > ${b}`, a > b);
}

// --- Operator filters ---
{
  const { categoryFilter, q } = applyOperatorFilters("apps:seedqc ai");
  assert("apps: sets category to Apps", categoryFilter === "Apps");
  assert("apps: strips token and keeps tail query", q === "ai");
}
{
  const { categoryFilter, q } = applyOperatorFilters("role:admin foo");
  assert("role:admin maps to Admin category", categoryFilter === "Admin");
  assert("role:admin keeps free text", q === "foo");
}

// --- Search blob ---
{
  const blob = buildSearchBlob("SEEDQC", ["Quote", "Pricing"]);
  assert("searchBlob lowercases", blob === "seedqc quote pricing");
}

// --- Scoring and sorting ---
{
  const recents: Recents = {
    "apps.seedqc": { count: 5, ts: Date.now() },
  };

  const seedqc = {
    id: "apps.seedqc",
    label: "SEEDQC",
    category: "Apps" as NavCategory,
    keywords: ["calculator", "quote"],
    searchBlob: "seedqc calculator quote",
  };
  const seed = {
    id: "apps.seed",
    label: "Seed",
    category: "Apps" as NavCategory,
    keywords: ["seed"],
    searchBlob: "seed",
  };
  const profiles = {
    id: "apps.clientProfiles",
    label: "Client Profiles",
    category: "Apps" as NavCategory,
    keywords: ["clients", "profiles"],
    searchBlob: "client profiles clients profiles",
  };

  const q = "seed";
  const sExact = scoreItemLike(seed, q, { location: "/", recents });
  const sStarts = scoreItemLike(seedqc, q, { location: "/", recents });
  const sKw = scoreItemLike(profiles, q, { location: "/", recents });
  approxGreater("exact match > startsWith", sExact, sStarts);
  approxGreater("startsWith > keyword includes", sStarts, sKw);

  const sWithRecent = scoreItemLike(seedqc, "seedqc", { location: "/", recents });
  const sNoRecent = scoreItemLike({ ...seedqc }, "seedqc", { location: "/" });
  approxGreater("recency boosts score", sWithRecent, sNoRecent);

  const adminBoost = scoreItemLike({ ...seedqc, label: "User Management" }, "user", {
    location: "/admin",
  });
  const noBoost = scoreItemLike({ ...seedqc, label: "User Management" }, "user", { location: "/" });
  approxGreater("admin route boost applies", adminBoost, noBoost);
}

// --- Keyboard navigation clamp ---
{
  const max = 9; // e.g., 10 items
  assert("down within bounds", clampIndex(0, +1, max) === 1);
  assert("up stays at 0", clampIndex(0, -1, max) === 0);
  assert("down clamps at max", clampIndex(max, +1, max) === max);
}

console.log("Command Dock golden tests passed.");
