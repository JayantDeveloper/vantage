import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { formHtml, userId } = await req.json();

    if (!formHtml || !userId) {
      return NextResponse.json({ error: "formHtml and userId are required" }, { status: 400 });
    }

    // Fetch vault data for this user
    const admin = createAdminClient();
    const { data: vault, error } = await admin
      .from("vault")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !vault) {
      return NextResponse.json({ error: "Vault not found for user" }, { status: 404 });
    }

    const systemPrompt = `You are an expert scholarship application assistant.
Given a student's profile (the Vault) and an HTML form, return a JSON object mapping
each form field's name/id attribute to the best-fit answer drawn from the Vault.

Rules:
- Only map fields you can confidently fill from the Vault.
- Use the field's name or id as the key.
- Values must be plain strings (no HTML).
- If a field cannot be mapped, omit it entirely.
- Respond with ONLY a valid JSON object, no markdown fences.`;

    const userMessage = `Student Vault:
${JSON.stringify(vault, null, 2)}

Form HTML:
${formHtml.slice(0, 8000)}`; // cap to avoid token overflow

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText = message.content[0].type === "text" ? message.content[0].text : "{}";

    let mapping: Record<string, string>;
    try {
      mapping = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: "Failed to parse AI response", raw: rawText }, { status: 502 });
    }

    return NextResponse.json({ mapping });
  } catch (err) {
    console.error("[autofill]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
