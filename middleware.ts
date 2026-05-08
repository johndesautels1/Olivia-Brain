// middleware.ts
//
// Track F Session 18 — Clerk wired into Next.js middleware.
//
// In dev / preview without Clerk keys configured, the middleware no-ops so
// the existing STUB_USER_ID path in `src/lib/auth/session.ts` continues to
// serve. In Production / Preview with `CLERK_SECRET_KEY` set, Clerk takes
// over and `auth()` resolves the real user inside route handlers.
//
// Matcher follows Clerk's recommended Next.js App Router pattern: skip
// static assets, run on every page route + every API route.

import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextMiddleware } from "next/server";

const HAS_CLERK = Boolean(process.env.CLERK_SECRET_KEY);

const passthroughMiddleware: NextMiddleware = () => NextResponse.next();

const middleware: NextMiddleware = HAS_CLERK
  ? clerkMiddleware()
  : passthroughMiddleware;

export default middleware;

export const config = {
  matcher: [
    // Skip Next.js internals + static assets unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API + tRPC routes.
    "/(api|trpc)(.*)",
  ],
};
