import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

// Public paths that never require auth
const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up", "/health", "/api/health", "/api/autofill"];

function isPublic(req: NextRequest) {
  const { pathname } = req.nextUrl;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"));
}

// Clerk publishable keys are base64-encoded after the prefix and are 50+ chars.
// Placeholders injected during CI bootstrap are much shorter — skip Clerk entirely
// for those and fall through to a pass-through middleware.
const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const secKey = process.env.CLERK_SECRET_KEY ?? "";
const clerkReady = pubKey.length > 40 && secKey.length > 40 &&
  (pubKey.startsWith("pk_test_") || pubKey.startsWith("pk_live_")) &&
  (secKey.startsWith("sk_test_") || secKey.startsWith("sk_live_"));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _clerkMiddleware: any = null;

async function getClerkMiddleware() {
  if (!clerkReady) return null;
  if (_clerkMiddleware) return _clerkMiddleware;
  try {
    const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
    const isPublicRoute = createRouteMatcher(PUBLIC_PATHS.map((p) => p === "/" ? "/" : `${p}(.*)`));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _clerkMiddleware = clerkMiddleware(async (auth: any, _req: NextRequest) => {
      if (!isPublicRoute(_req)) await auth.protect();
    });
    return _clerkMiddleware;
  } catch {
    return null;
  }
}

export default async function middleware(req: NextRequest) {
  try {
    const clerk = await getClerkMiddleware();
    if (clerk) return clerk(req);
  } catch {
    // Clerk not configured or key invalid — fall through
  }

  // Pass-through: unauthenticated users can still load public pages;
  // server components handle their own auth() redirects.
  return NextResponse.next();
}
