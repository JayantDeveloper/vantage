/**
 * Deadline normalisation utility — extracted so it can be tested independently
 * of the Supabase/Firecrawl module-level initialisers in scout.ts.
 */

export type DeadlineResolution =
  | "iso"
  | "natural_language"
  | "month_year"
  | "fuzzy"
  | "nullified"
  | "already_null";

export type NormalizedDeadline = {
  value:      string | null;
  resolution: DeadlineResolution;
};

/**
 * Converts any deadline string the LLM might return into a Postgres-safe
 * YYYY-MM-DD string, or null if the value is ambiguous / non-date.
 */
export function normalizeDeadline(raw: string | null | undefined): NormalizedDeadline {
  if (raw === null || raw === undefined) {
    return { value: null, resolution: "already_null" };
  }

  const trimmed = raw.trim();
  if (trimmed === "") return { value: null, resolution: "already_null" };

  const lower = trimmed.toLowerCase();

  // ── Explicitly non-date tokens → null ─────────────────────────────────
  // STRICT: always nullify regardless of surrounding context
  const NULL_STRICT = [
    "varies", "variable", "rolling", "ongoing", "tbd", "tba",
    "n/a", "none", "check website", "contact", "see website",
    "continuous", "no deadline", "not specified",
  ];
  // CONDITIONAL: only nullify when no 4-digit year is present.
  // This prevents "Opens June 2026" / "Expected Open September 2026" from
  // being swallowed by the "open" token before prefix-stripping can run.
  const NULL_CONDITIONAL = ["open", "annual"];
  const hasYear = /\b\d{4}\b/.test(trimmed);

  if (NULL_STRICT.some((t) => lower.includes(t))) {
    return { value: null, resolution: "nullified" };
  }
  if (!hasYear && NULL_CONDITIONAL.some((t) => lower.includes(t))) {
    return { value: null, resolution: "nullified" };
  }

  // ── Already ISO: YYYY-MM-DD ────────────────────────────────────────────
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { value: trimmed, resolution: "iso" };
  }

  // ── Season keywords → approximate month ───────────────────────────────
  const SEASON_MAP: Record<string, string> = {
    spring: "03", summer: "06", fall: "09", autumn: "09", winter: "12",
  };
  for (const [season, month] of Object.entries(SEASON_MAP)) {
    const match = trimmed.match(new RegExp(`${season}\\s+(\\d{4})`, "i"));
    if (match) {
      return { value: `${match[1]}-${month}-01`, resolution: "fuzzy" };
    }
  }

  // ── Strip common fuzzy prefixes ────────────────────────────────────────
  const prefixStripped = trimmed
    .replace(
      /^(expected\s+open|expected\s+opening|opens|open|approximately|approx\.?|around|by)\s+/i,
      ""
    )
    .trim();

  // ── Month-Year only: "September 2026" → "2026-09-01" ──────────────────
  const MONTHS = "january|february|march|april|may|june|july|august|september|october|november|december";
  const monthYearRe = new RegExp(`^(${MONTHS})\\s+(\\d{4})$`, "i");
  const monthYearMatch = prefixStripped.match(monthYearRe);
  if (monthYearMatch) {
    const d = new Date(`${monthYearMatch[1]} 1, ${monthYearMatch[2]}`);
    if (!isNaN(d.getTime())) {
      return { value: d.toISOString().split("T")[0], resolution: "month_year" };
    }
  }

  // ── Natural-language full date via Date constructor ────────────────────
  for (const attempt of [trimmed, prefixStripped]) {
    const d = new Date(attempt);
    if (!isNaN(d.getTime())) {
      // Guard: reject bare years like "2026" which Date() interprets as Jan 1
      const tokenCount = attempt.trim().split(/\s+/).length;
      if (tokenCount < 2 && /^\d{4}$/.test(attempt.trim())) continue;
      return { value: d.toISOString().split("T")[0], resolution: "natural_language" };
    }
  }

  // ── Cannot normalise → null ────────────────────────────────────────────
  return { value: null, resolution: "nullified" };
}
