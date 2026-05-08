// middleware.ts
//
// Track F Session 18 — Clerk wired into Next.js middleware.
// Track U follow-up: pure passthrough until both Clerk keys land in
// Vercel env. Importing `@clerk/nextjs/server` at module load runs
// Clerk's init code, which crashes on Edge runtime when keys are
// absent — manifesting as MIDDLEWARE_INVOCATION_FAILED 500s on every
// request. The auth/session.ts STUB_USER_ID fallback continues to
// serve every route handler, so removing Clerk from middleware is
// functionally a no-op for now.
//
// To re-enable Clerk:
//   1. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (All Environments)
//   2. Set CLERK_SECRET_KEY (Production + Preview only, marked Sensitive)
//      — never All Environments per ~/CLAUDE.md
//   3. Replace the body below with the canonical Clerk wiring:
//
//        import { clerkMiddleware } from "@clerk/nextjs/server";
//        export default clerkMiddleware();
//
// Matcher follows Clerk's recommended Next.js App Router pattern: skip
// static assets, run on every page route + every API route.

import { NextResponse, type NextMiddleware } from "next/server";

const middleware: NextMiddleware = () => NextResponse.next();

export default middleware;

export const config = {
  matcher: [
    // Skip Next.js internals + static assets unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API + tRPC routes.
    "/(api|trpc)(.*)",
  ],
};
