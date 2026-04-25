import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const payload = {
    user_id:      userId,
    full_name:    body.full_name    ?? "",
    bio_text:     body.bio_text     ?? null,
    is_first_gen: body.is_first_gen ?? false,
    gpa:          body.gpa          ?? null,
    context_dump: body.context_dump ?? null,
    narrative:    body.narrative    ?? null,
    major:        body.major        ?? null,
    skills:       body.skills       ?? [],
  };

  const admin = createAdminClient();
  const { error } = await admin
    .from("vault")
    .upsert(payload, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
