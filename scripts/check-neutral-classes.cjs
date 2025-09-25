#!/usr/bin/env node
/*
  Grep-based fallback guard for neutral Tailwind classes and hex colors
  in JSX/TSX files. This runs in lint-staged and should fail if any
  staged file still contains hard-coded neutral UI colors instead of
  tokens.

  Allowed: semantic/status colors and brand accents. Disallowed: structural
  grays/whites that should be tokens (bg-card, bg-muted, bg-popover,
  text-foreground, text-muted-foreground, border).
*/

const fs = require("fs");
const path = require("path");

const files = process.argv.slice(2).filter((f) => /\.(t|j)sx?$/.test(f));
if (files.length === 0) process.exit(0);

const DISALLOWED = [
  // Backgrounds
  /\bbg-(white|gray|zinc|neutral)(?:-[^\s\"]+)?(?:\/[0-9]{1,3})?\b/,
  // Text
  /\btext-(white|gray|zinc|neutral)(?:-[^\s\"]+)?(?:\/[0-9]{1,3})?\b/,
  // Border
  /\bborder-(gray|zinc|neutral)(?:-[^\s\"]+)?(?:\/[0-9]{1,3})?\b/,
  // Hex code (quick heuristic)
  /#[0-9a-fA-F]{3,6}\b/,
];

let failed = false;
for (const file of files) {
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const matches = DISALLOWED.map((re) => ({
    re,
    found: content.match(re),
  })).filter((m) => m.found);
  if (matches.length) {
    failed = true;
    const rel = path.relative(process.cwd(), file);
    console.error(`\n[neutral-classes-guard] Disallowed classes in ${rel}:`);
    for (const m of matches) {
      console.error(`  - ${m.re}`);
    }
  }
}

if (failed) {
  console.error(
    "\nUse tokens instead: bg-card, bg-muted, bg-popover, text-foreground, text-muted-foreground, border.",
  );
  process.exit(1);
}

process.exit(0);
