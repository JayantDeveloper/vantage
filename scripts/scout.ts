/**
 * Vantage Scout — scrapes UMD, CMNS, CS, and MHEC scholarship portals via Firecrawl
 * and upserts results into the Supabase opportunities table.
 *
 * Usage: npx tsx scripts/scout.ts
 *
 * Fixes applied (2026-04-24):
 *   BUG-1  Added normalizeDeadline() — handles Varies/Rolling/natural-language dates
 *   BUG-2  Removed match_score from upsert payload — preserves user-set scores
 *   BUG-3  Per-row upsert with isolated error handling — one bad row never kills a batch
 *   BUG-4  Expanded TARGET_URLS to cover MHEC, CS, CMNS, and OMSE portals
 */

import { createClient } from "@supabase/supabase-js";
import FirecrawlApp from "@mendable/firecrawl-js";
import { normalizeDeadline, type DeadlineResolution } from "./deadline";

// ── Environment ────────────────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;

// ── Target URLs ───────────────────────────────────────────────────────────────
// Organised by source so the audit report can group by portal.
const TARGET_URLS: Array<{ url: string; label: string }> = [
  // ── UMD Financial Aid ──────────────────────────────────────────────────
  {
    url:   "https://financialaid.umd.edu/types-aid/scholarships",
    label: "UMD Financial Aid — Scholarships",
  },
  {
    url:   "https://financialaid.umd.edu/types-aid/grants",
    label: "UMD Financial Aid — Grants",
  },
  {
    url:   "https://undergraduate.umd.edu/tuition-financial-aid/scholarships-grants",
    label: "UMD Undergraduate — Scholarships & Grants",
  },

  // ── UMD Student Affairs ────────────────────────────────────────────────
  {
    url:   "https://sa.umd.edu/crisis-fund",
    label: "UMD Student Crisis Fund",
  },
  {
    url:   "https://studentaffairs.umd.edu/financial-aid-scholarships",
    label: "UMD Student Affairs — Financial Aid",
  },

  // ── CMNS (College of Computer, Math & Natural Sciences) ───────────────
  {
    url:   "https://cmns.umd.edu/undergraduate/scholarships",
    label: "CMNS — Undergraduate Scholarships",
  },
  {
    url:   "https://cmns.umd.edu/current-students/funding",
    label: "CMNS — Student Funding",
  },

  // ── CS Department ──────────────────────────────────────────────────────
  {
    url:   "https://www.cs.umd.edu/undergraduate/scholarships",
    label: "UMD CS — Undergraduate Scholarships",
  },
  {
    url:   "https://www.cs.umd.edu/community/scholarships-and-awards",
    label: "UMD CS — Community Awards",
  },

  // ── OMSE (Multi-Ethnic Student Education) ─────────────────────────────
  {
    url:   "https://omse.umd.edu/scholarships",
    label: "OMSE — Scholarships",
  },

  // ── MHEC (Maryland Higher Education Commission) ────────────────────────
  {
    url:   "https://mhec.maryland.gov/preparing/Pages/FinancialAid/descriptions.aspx",
    label: "MHEC — All Aid Programs",
  },
  {
    url:   "https://mhec.maryland.gov/preparing/Pages/FinancialAid/ProgramDescriptions/prog_senatorial.aspx",
    label: "MHEC — Maryland Senatorial Scholarship",
  },
  {
    url:   "https://mhec.maryland.gov/preparing/Pages/FinancialAid/ProgramDescriptions/prog_conroy.aspx",
    label: "MHEC — Edward T. Conroy Memorial Scholarship",
  },
  {
    url:   "https://mhec.maryland.gov/preparing/Pages/FinancialAid/ProgramDescriptions/prog_distinguished.aspx",
    label: "MHEC — Distinguished Scholar Program",
  },
  {
    url:   "https://mhec.maryland.gov/preparing/Pages/FinancialAid/ProgramDescriptions/prog_delegate.aspx",
    label: "MHEC — Delegate Scholarship",
  },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type Category = "scholarship" | "grant" | "event";

type ScrapedOpportunity = {
  title:       string;
  url:         string;
  deadline:    string | null;
  description: string | null;
  source:      string;
  label:       string;
  category:    Category;
};

type AuditRow = {
  title:              string;
  url:                string;
  deadline_raw:       string | null;
  deadline_resolved:  string | null;
  resolution:         DeadlineResolution;
  status:             "ok" | "failed";
  category:           Category;
  error?:             string;
};

// ── Clients ───────────────────────────────────────────────────────────────────
const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY);
const firecrawl = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

// normalizeDeadline imported from ./deadline

// ── Scrape a single URL ───────────────────────────────────────────────────────
async function scrapePage(
  target: (typeof TARGET_URLS)[number]
): Promise<ScrapedOpportunity[]> {
  console.log(`\n  Scraping: ${target.label}`);

  const result = await firecrawl.scrape(target.url, {
    formats: [
      {
        type: "json",
        prompt: `Extract ALL scholarships, grants, and financial aid programs listed on this page.
For each opportunity return:
  - title: the full official name (string)
  - url: direct link to the scholarship detail page, or this page's URL if none exists (string)
  - deadline: the application deadline EXACTLY as written on the page (string or null).
    Do NOT convert it — return the raw text (e.g. "June 1, 2026", "Varies", "Rolling", "Expected Open September 2026").
  - description: 1–3 sentence summary of eligibility and award amount (string or null)

Return a JSON object with key "opportunities" containing an array of the above objects.
If no scholarships are found on this page, return { "opportunities": [] }.`,
        schema: {
          type: "object",
          properties: {
            opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title:       { type: "string" },
                  url:         { type: "string" },
                  deadline:    { type: "string", nullable: true },
                  description: { type: "string", nullable: true },
                },
                required: ["title", "url"],
              },
            },
          },
          required: ["opportunities"],
        },
      },
    ],
  });

  if (!result.json) {
    console.warn(`    ⚠ No json returned`);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: ScrapedOpportunity[] = ((result.json as any).opportunities ?? []);
  return items.map((item) => ({
    ...item,
    deadline:    item.deadline ?? null,
    description: item.description ?? null,
    source:      new URL(target.url).hostname,
    label:       target.label,
    category:    "scholarship" as Category,
  }));
}

// ── BUG-2 + BUG-3 FIX: Per-row upsert, no match_score in payload ─────────────
async function upsertOpportunities(
  opps: ScrapedOpportunity[],
  auditLog: AuditRow[]
): Promise<void> {
  if (opps.length === 0) {
    console.log("    — No opportunities extracted from this page");
    return;
  }

  let ok = 0, failed = 0;

  for (const opp of opps) {
    const { value: deadline, resolution } = normalizeDeadline(opp.deadline);

    // BUG-2 FIX: match_score is intentionally ABSENT from this payload.
    // Supabase's upsert ON CONFLICT DO UPDATE only touches listed columns,
    // so existing user-set match_score values are preserved on update.
    const row = {
      title:       opp.title,
      url:         opp.url,
      deadline,
      description: opp.description,
      source:      opp.source,
      category:    opp.category,
      scraped_at:  new Date().toISOString(),
      // match_score: intentionally omitted
    };

    // BUG-3 FIX: per-row try/catch — one bad record never kills the batch
    const { error } = await supabase
      .from("opportunities")
      .upsert(row, { onConflict: "url", ignoreDuplicates: false });

    const auditRow: AuditRow = {
      title:             opp.title,
      url:               opp.url,
      deadline_raw:      opp.deadline,
      deadline_resolved: deadline,
      resolution,
      category:          opp.category,
      status:            error ? "failed" : "ok",
      error:             error?.message,
    };

    auditLog.push(auditRow);

    if (error) {
      console.error(`    ✗ [${opp.title}]: ${error.message}`);
      failed++;
    } else {
      const dlLabel = deadline
        ? `${deadline} (${resolution})`
        : `null (${resolution})`;
      console.log(`    ✓ ${opp.title} | deadline: ${dlLabel}`);
      ok++;
    }
  }

  console.log(`    → ${ok} ok, ${failed} failed`);
}

// ── Audit report printer ──────────────────────────────────────────────────────
function printAuditReport(auditLog: AuditRow[], elapsed: number): void {
  const total      = auditLog.length;
  const ok         = auditLog.filter((r) => r.status === "ok").length;
  const failed     = auditLog.filter((r) => r.status === "failed").length;
  const nullified  = auditLog.filter((r) => r.resolution === "nullified").length;
  const naturalLang = auditLog.filter((r) =>
    ["natural_language", "month_year", "fuzzy"].includes(r.resolution)
  ).length;

  // Check for the three benchmark scholarships
  const BENCHMARKS: Array<{ name: string; match: RegExp; expectedDeadline: string; expectedUrl?: string }> = [
    {
      name:             "Maryland Senatorial Scholarship",
      match:            /senatorial/i,
      expectedDeadline: "2026-06-01",
    },
    {
      name:             "Edward T. Conroy Memorial Scholarship",
      match:            /conroy/i,
      expectedDeadline: "2026-07-15",
    },
    {
      name:             "UMD Student Crisis Fund",
      match:            /crisis\s*fund/i,
      expectedDeadline: "",
      expectedUrl:      "sa.umd.edu/crisis-fund",
    },
  ];

  console.log("\n");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  VANTAGE SCOUT — ACCURACY REPORT");
  console.log(`  Run at: ${new Date().toISOString()} | Duration: ${(elapsed / 1000).toFixed(1)}s`);
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Total opportunities processed : ${total}`);
  console.log(`  Successfully upserted         : ${ok}`);
  console.log(`  Failed                        : ${failed}`);
  console.log(`  Deadlines → null (ambiguous)  : ${nullified}`);
  console.log(`  Deadlines normalised (NLP)    : ${naturalLang}`);
  console.log("───────────────────────────────────────────────────────────────");
  console.log("  BENCHMARK SCHOLARSHIP CHECK");

  for (const bm of BENCHMARKS) {
    const found = auditLog.find((r) => bm.match.test(r.title));
    if (!found) {
      console.log(`  ✗ MISSING  : ${bm.name}`);
      continue;
    }
    const dlOk = !bm.expectedDeadline || found.deadline_resolved === bm.expectedDeadline;
    const urlOk = !bm.expectedUrl   || found.url.includes(bm.expectedUrl);
    const allOk = found.status === "ok" && dlOk && urlOk;
    const icon  = allOk ? "✓" : "⚠";
    console.log(`  ${icon} ${allOk ? "FOUND   " : "PARTIAL "}: ${bm.name}`);
    if (!dlOk) {
      console.log(`      deadline mismatch: expected ${bm.expectedDeadline}, got ${found.deadline_resolved}`);
    }
    if (!urlOk) {
      console.log(`      url mismatch: expected to contain ${bm.expectedUrl}, got ${found.url}`);
    }
  }

  if (failed > 0) {
    console.log("───────────────────────────────────────────────────────────────");
    console.log("  FAILED ROWS");
    for (const r of auditLog.filter((r) => r.status === "failed")) {
      console.log(`  ✗ [${r.title}]: ${r.error}`);
    }
  }

  if (nullified > 0) {
    console.log("───────────────────────────────────────────────────────────────");
    console.log("  NULLIFIED DEADLINES (non-standard formats)");
    for (const r of auditLog.filter((r) => r.resolution === "nullified")) {
      console.log(`  — "${r.deadline_raw}" → null  [${r.title}]`);
    }
  }

  console.log("═══════════════════════════════════════════════════════════════\n");
}

// ── TerpLink worker ───────────────────────────────────────────────────────────
async function syncTerpLink(auditLog: AuditRow[]): Promise<void> {
  console.log("\n  Fetching: TerpLink campus events");
  try {
    const resp = await fetch(
      "https://terplink.umd.edu/api/discovery/event/search?status=Approved&take=300",
      { headers: { "User-Agent": "VantageBot/1.0", "Accept": "application/json" }, signal: AbortSignal.timeout(15000) }
    );
    if (!resp.ok) { console.warn(`    ⚠ TerpLink returned ${resp.status}`); return; }

    const data = await resp.json() as { value?: any[] };
    const events = data.value ?? [];
    console.log(`    ${events.length} events received`);

    let ok = 0, failed = 0;
    for (const e of events) {
      const id  = e.id ?? "";
      const url = `https://terplink.umd.edu/event/${id}`;
      const start = e.startsOn ? new Date(e.startsOn).toISOString().split("T")[0] : null;

      const row = {
        title:       (e.name ?? "").trim(),
        url,
        deadline:    start,
        description: e.description ? String(e.description).replace(/<[^>]+>/g, "").slice(0, 400) : null,
        source:      "terplink.umd.edu",
        category:    "event" as Category,
        scraped_at:  new Date().toISOString(),
      };
      if (!row.title || !row.url) continue;

      const { error } = await supabase.from("opportunities").upsert(row, { onConflict: "url", ignoreDuplicates: false });
      auditLog.push({ title: row.title, url, deadline_raw: e.startsOn ?? null, deadline_resolved: start, resolution: start ? "iso" : "already_null", category: "event", status: error ? "failed" : "ok", error: error?.message });
      error ? failed++ : ok++;
    }
    console.log(`    → ${ok} ok, ${failed} failed`);
  } catch (err) {
    console.error("  ✗ TerpLink fatal:", err);
  }
}


// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Vantage Scout starting…");
  console.log(`Targeting ${TARGET_URLS.length} scholarship portals + TerpLink + CS News\n`);

  const auditLog: AuditRow[] = [];
  const start = Date.now();

  for (const target of TARGET_URLS) {
    try {
      const opps = await scrapePage(target);
      await upsertOpportunities(opps, auditLog);
    } catch (err) {
      console.error(`  ✗ Fatal error scraping ${target.label}:`, err);
    }
  }

  await syncTerpLink(auditLog);

  printAuditReport(auditLog, Date.now() - start);
  console.log("Scout complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
