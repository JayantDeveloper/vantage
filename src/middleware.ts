import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/health",
  "/api/health(.*)",
  "/api/autofill(.*)",
]);

// Clerk requires keys that start with pk_/sk_. If they aren't configured yet
// (e.g. placeholder values injected during CI), bypass auth so the app stays
// reachable and doesn't throw MIDDLEWARE_INVOCATION_FAILED on every request.
const clerkKeysValid =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_") &&
  process.env.CLERK_SECRET_KEY?.startsWith("sk_");

export default clerkKeysValid
  ? clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) {
        await auth.protect();
      }
    })
  : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
