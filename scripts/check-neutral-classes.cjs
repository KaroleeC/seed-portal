#!/usr/bin/env node
/*
  Neutral design system guard
  - Forbids hard-coded neutrals (bg/text/border whites/grays) and hex colors
    in TS/JS/TSX/JSX and CSS files.
  - Forbids deprecated KB utility names (kb-*, seedkb-*) outside index.css.

  Runs in pre-commit via lint-staged (receives staged file list), and can run
  in CI without args (will recursively scan client/src by default).

  Allowed: brand/semantic accents in components; DS tokens should be used for
  structural surfaces/typography.
*/

const fs = require("fs");
const path = require("path");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

let files = process.argv.slice(2);
if (files.length === 0) {
  // CI mode: scan primary source tree
  const root = path.join(process.cwd(), "client", "src");
  if (fs.existsSync(root)) files = walk(root);
}

// Only check relevant file types
files = files.filter((f) => /\.(t|j)sx?$|\.css$/.test(f));
if (files.length === 0) process.exit(0);

const INDEX_CSS = path.join("client", "src", "index.css");

// Disallowed structural utility classes (should be tokens)
const DISALLOWED_TW = [
  /\bbg-(white|gray|zinc|neutral)(?:-[^\s\"]+)?(?:\/[0-9]{1,3})?\b/,
  /\btext-(white|gray|zinc|neutral)(?:-[^\s\"]+)?(?:\/[0-9]{1,3})?\b/,
  /\bborder-(gray|zinc|neutral)(?:-[^\s\"]+)?(?:\/[0-9]{1,3})?\b/,
];

// Hex colors and raw rgb(a) (CSS/JS string) — tokens preferred
const DISALLOWED_COLOR = [/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/, /\brgba?\(/];

// Deprecated DS utility names
const DISALLOWED_KB = [/\bkb-(surface|quick-action|hover-motion)\b/, /\bseedkb-(hero|band)\b/];

let failed = false;
for (const file of files) {
  const rel = path.relative(process.cwd(), file);
  let content;
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }

  // Skip legacy aliases inside index.css for now
  const isIndexCss = rel.endsWith(INDEX_CSS);

  const violations = [];

  // TW neutrals + direct colors
  for (const re of [...DISALLOWED_TW, ...DISALLOWED_COLOR]) {
    const m = content.match(re);
    if (m) violations.push(re);
  }

  // Deprecated KB selector usage (skip index.css which still hosts aliases)
  if (!isIndexCss) {
    for (const re of DISALLOWED_KB) {
      const m = content.match(re);
      if (m) violations.push(re);
    }
  }

  if (violations.length) {
    failed = true;
    console.error(`\n[neutral-classes-guard] Disallowed patterns in ${rel}:`);
    for (const v of violations) console.error(`  - ${v}`);
  }
}

if (failed) {
  console.error(
    "\nUse tokens/utilities instead: bg-card, bg-muted, bg-popover, text-foreground, text-muted-foreground, border, surface-glass, surface-motion, surface-hero, surface-band.",
  );
  console.error(
    "Avoid deprecated utilities: kb-surface, kb-quick-action, kb-hover-motion, seedkb-hero, seedkb-band.",
  );
  process.exit(1);
}

process.exit(0);
