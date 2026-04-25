import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("opportunities")
      .select("*")
      .order("scraped_at", { ascending: false });
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}
