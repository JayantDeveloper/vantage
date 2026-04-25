import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(null, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("vault")
    .select("*")
    .eq("user_id", userId)
    .single();

  return NextResponse.json(data ?? null);
}
