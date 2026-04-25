import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Allow requests from any chrome-extension:// origin
  const origin = req.headers.get("origin") ?? "";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
  if (origin.startsWith("chrome-extension://")) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  let userId: string | null = null;
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const result = await auth();
    userId = result.userId;
  } catch {
    // Clerk not configured — userId stays null
  }

  return NextResponse.json({ userId }, { headers });
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin.startsWith("chrome-extension://") ? origin : "",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
