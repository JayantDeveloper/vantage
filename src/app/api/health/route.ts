import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("vault").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ok", db: "connected", ts: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { status: "error", db: "unreachable", message: String(err) },
      { status: 503 }
    );
  }
}
