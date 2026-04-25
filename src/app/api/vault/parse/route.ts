import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ParsedVaultFields = {
  full_name:   string | null;
  gpa:         number | null;
  major:       string | null;
  skills:      string[];
  is_first_gen: boolean | null;
  bio_text:    string | null;
};

export async function POST(req: NextRequest) {
  try {
    const { contextDump } = await req.json();

    if (!contextDump || typeof contextDump !== "string") {
      return NextResponse.json({ error: "contextDump is required" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a profile extraction assistant. Given raw text (a resume, bio, or personal statement),
extract structured profile data and return ONLY a valid JSON object with these exact keys:
- full_name: string or null
- gpa: number (0.0–4.0) or null
- major: string (field of study) or null
- skills: array of strings (technical + soft skills, max 15, concise labels)
- is_first_gen: boolean or null (true if text mentions being first-generation college student)
- bio_text: string — a clean 2–3 sentence professional summary derived from the text, or null

Rules:
- Return ONLY the raw JSON object — no markdown, no explanation.
- If a field cannot be determined, use null (or [] for skills).
- skills should be short, clean labels: "Python", "Leadership", "Data Analysis" — not sentences.`,
      messages: [
        {
          role: "user",
          content: `Extract my profile from the following text:\n\n${contextDump.slice(0, 12000)}`,
        },
      ],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "{}";

    let parsed: ParsedVaultFields;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: "LLM returned unparseable JSON", raw },
        { status: 502 }
      );
    }

    // Sanitize
    const result: ParsedVaultFields = {
      full_name:    typeof parsed.full_name === "string" ? parsed.full_name : null,
      gpa:          typeof parsed.gpa === "number" && parsed.gpa >= 0 && parsed.gpa <= 4
                      ? parsed.gpa : null,
      major:        typeof parsed.major === "string" ? parsed.major : null,
      skills:       Array.isArray(parsed.skills) ? parsed.skills.filter((s) => typeof s === "string").slice(0, 15) : [],
      is_first_gen: typeof parsed.is_first_gen === "boolean" ? parsed.is_first_gen : null,
      bio_text:     typeof parsed.bio_text === "string" ? parsed.bio_text : null,
    };

    return NextResponse.json({ parsed: result });
  } catch (err) {
    console.error("[vault/parse]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
