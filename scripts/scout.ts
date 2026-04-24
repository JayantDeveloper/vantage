/**
 * Vantage Scout — scrapes UMD scholarship portals via Firecrawl
 * and upserts results into the Supabase opportunities table.
 *
 * Usage: npx tsx scripts/scout.ts
 */

import { createClient } from "@supabase/supabase-js";
import FirecrawlApp from "@mendable/firecrawl-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!;

const TARGET_URLS = [
  "https://financialaid.umd.edu/types-aid/scholarships",
  "https://giving.umd.edu/giving/scholarships.php",
  "https://undergraduate.umd.edu/tuition-financial-aid/scholarships-grants",
];

type ScrapedOpportunity = {
  title: string;
  url: string;
  deadline: string | null;
  description: string | null;
  source: string;
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const firecrawl = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

async function scrapePage(url: string): Promise<ScrapedOpportunity[]> {
  console.log(`Scraping: ${url}`);

  const result = await firecrawl.scrape(url, {
    formats: ["extract"],
    extract: {
      prompt: `Extract all scholarships and grants listed on this page.
For each opportunity return: title (string), url (string, full URL or the page URL if no link),
deadline (string in YYYY-MM-DD format or null), description (string, 1-3 sentences max).
Return a JSON array of objects with keys: title, url, deadline, description.`,
      schema: {
        type: "object",
        properties: {
          opportunities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                url: { type: "string" },
                deadline: { type: "string", nullable: true },
                description: { type: "string", nullable: true },
              },
              required: ["title", "url"],
            },
          },
        },
        required: ["opportunities"],
      },
    },
  });

  if (!result.success || !result.extract) {
    console.warn(`  ⚠ No extract from ${url}`);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (result.extract as any).opportunities ?? [];
  return items.map((item: ScrapedOpportunity) => ({
    ...item,
    source: new URL(url).hostname,
  }));
}

async function upsertOpportunities(opps: ScrapedOpportunity[]) {
  if (opps.length === 0) return;

  const rows = opps.map((opp) => ({
    title: opp.title,
    url: opp.url,
    deadline: opp.deadline ?? null,
    description: opp.description ?? null,
    source: opp.source,
    match_score: null, // scored later per-user via Claude
    scraped_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("opportunities")
    .upsert(rows, { onConflict: "url", ignoreDuplicates: false });

  if (error) {
    console.error("  ✗ Upsert error:", error.message);
  } else {
    console.log(`  ✓ Upserted ${rows.length} opportunities`);
  }
}

async function main() {
  console.log("Vantage Scout starting...\n");

  for (const url of TARGET_URLS) {
    try {
      const opps = await scrapePage(url);
      await upsertOpportunities(opps);
    } catch (err) {
      console.error(`  ✗ Failed scraping ${url}:`, err);
    }
  }

  console.log("\nScout complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
