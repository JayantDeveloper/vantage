/**
 * Unit tests for normalizeDeadline()
 * Run: npx tsx scripts/scout.test.ts
 */
import { normalizeDeadline } from "./deadline";

type Case = {
  input:              string | null;
  expectedValue:      string | null;
  expectedResolution: string;
  label:              string;
};

const CASES: Case[] = [
  // ── Already ISO ──────────────────────────────────────────────────────────
  { input: "2026-06-01", expectedValue: "2026-06-01", expectedResolution: "iso",              label: "ISO date passes through unchanged" },
  { input: "2026-07-15", expectedValue: "2026-07-15", expectedResolution: "iso",              label: "Conroy deadline in ISO form" },

  // ── Natural-language full dates ───────────────────────────────────────────
  { input: "June 1, 2026",           expectedValue: "2026-06-01", expectedResolution: "natural_language", label: "Senatorial: June 1, 2026" },
  { input: "July 15, 2026",          expectedValue: "2026-07-15", expectedResolution: "natural_language", label: "Conroy: July 15, 2026" },
  { input: "March 15, 2026",         expectedValue: "2026-03-15", expectedResolution: "natural_language", label: "March date" },
  { input: "1 June 2026",            expectedValue: "2026-06-01", expectedResolution: "natural_language", label: "Day-Month-Year order" },
  { input: "December 31, 2026",      expectedValue: "2026-12-31", expectedResolution: "natural_language", label: "End of year" },

  // ── Month-year only (first of month) ──────────────────────────────────────
  { input: "September 2026",         expectedValue: "2026-09-01", expectedResolution: "month_year",       label: "Month-Year only" },
  { input: "January 2027",           expectedValue: "2027-01-01", expectedResolution: "month_year",       label: "Next year month-year" },

  // ── Fuzzy / prefixed ──────────────────────────────────────────────────────
  { input: "Expected Open September 2026", expectedValue: "2026-09-01", expectedResolution: "month_year", label: "Expected Open Month Year" },
  { input: "Opens June 2026",              expectedValue: "2026-06-01", expectedResolution: "month_year", label: "Opens Month Year" },
  { input: "By March 2026",               expectedValue: "2026-03-01", expectedResolution: "month_year", label: "By Month Year" },
  { input: "Around December 2026",        expectedValue: "2026-12-01", expectedResolution: "month_year", label: "Around Month Year" },

  // ── Season → approximate month ────────────────────────────────────────────
  { input: "Fall 2026",   expectedValue: "2026-09-01", expectedResolution: "fuzzy", label: "Fall season" },
  { input: "Spring 2026", expectedValue: "2026-03-01", expectedResolution: "fuzzy", label: "Spring season" },
  { input: "Summer 2026", expectedValue: "2026-06-01", expectedResolution: "fuzzy", label: "Summer season" },
  { input: "Opens Fall 2026", expectedValue: "2026-09-01", expectedResolution: "fuzzy", label: "Opens Fall season" },

  // ── Null-worthy values ────────────────────────────────────────────────────
  { input: null,           expectedValue: null, expectedResolution: "already_null", label: "Explicit null" },
  { input: "",             expectedValue: null, expectedResolution: "already_null", label: "Empty string" },
  { input: "Varies",       expectedValue: null, expectedResolution: "nullified",    label: "Varies keyword" },
  { input: "Rolling",      expectedValue: null, expectedResolution: "nullified",    label: "Rolling keyword" },
  { input: "TBD",          expectedValue: null, expectedResolution: "nullified",    label: "TBD keyword" },
  { input: "TBA",          expectedValue: null, expectedResolution: "nullified",    label: "TBA keyword" },
  { input: "N/A",          expectedValue: null, expectedResolution: "nullified",    label: "N/A keyword" },
  { input: "Ongoing",      expectedValue: null, expectedResolution: "nullified",    label: "Ongoing keyword" },
  { input: "No Deadline",  expectedValue: null, expectedResolution: "nullified",    label: "No Deadline keyword" },
  { input: "Open",         expectedValue: null, expectedResolution: "nullified",    label: "Open keyword" },
  { input: "See website",  expectedValue: null, expectedResolution: "nullified",    label: "See website" },
  { input: "Contact financial aid office for details", expectedValue: null, expectedResolution: "nullified", label: "Contact keyword" },
];

let passed = 0;
let failed = 0;

for (const tc of CASES) {
  const { value, resolution } = normalizeDeadline(tc.input);
  const valueOk = value === tc.expectedValue;
  const resOk   = resolution === tc.expectedResolution;

  if (valueOk && resOk) {
    console.log(`  ✓  ${tc.label}`);
    passed++;
  } else {
    console.error(`  ✗  ${tc.label}`);
    if (!valueOk) console.error(`       value:      got "${value}", expected "${tc.expectedValue}"`);
    if (!resOk)   console.error(`       resolution: got "${resolution}", expected "${tc.expectedResolution}"`);
    failed++;
  }
}

console.log(`\n${passed + failed} tests — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
