/**
 * OLIVIA BRAIN — CRISTIANO VERDICT PERSISTENCE
 * ==============================================
 *
 * Wraps the `cristiano_verdicts` Prisma model with three operations:
 *   - `findExistingVerdict` — idempotency lookup by (userId, requestHash)
 *   - `saveVerdict` — insert a freshly-rendered verdict
 *   - `toRecord` — Prisma row → `CristianoVerdictRecord` mapping
 *
 * Held to Apple / Microsoft / Google 2026 leading coding practices per
 * `~/CLAUDE.md` and `docs/api-specs/_MASTER_REGISTER.md §10.4`.
 */

import type { CristianoVerdict, Prisma } from "@prisma/client";

import prisma from "@/lib/db/client";

import {
  CRISTIANO_VERDICT_KINDS,
  CRISTIANO_SOURCE_APPS,
  type CristianoSourceApp,
  type CristianoVerdictBody,
  type CristianoVerdictKind,
  type CristianoVerdictRecord,
  type CristianoVerdictRequest,
} from "@/lib/cristiano/types";

// ─── Lookup ──────────────────────────────────────────────────────────────────

/**
 * Find an existing verdict by (userId, requestHash). Returns null if
 * no row exists. Used by both `/api/cristiano/judge` and the gateway
 * push endpoint for idempotent re-fires.
 */
export async function findExistingVerdict(
  userId: string,
  requestHash: string,
): Promise<CristianoVerdict | null> {
  return prisma.cristianoVerdict.findUnique({
    where: {
      userId_requestHash: { userId, requestHash },
    },
  });
}

/**
 * List verdicts for a user, newest-first. Filterable by kind, source
 * app, and limit. Powers the Verdict Library + Gateway Inbox sub-tabs.
 */
export interface ListVerdictsOptions {
  userId: string;
  kind?: CristianoVerdictKind;
  sourceApp?: CristianoSourceApp;
  /** Cursor for keyset pagination — return verdicts created BEFORE this date. */
  beforeCreatedAt?: Date;
  /** Max rows. Defaults to 50, capped at 200. */
  limit?: number;
}

export async function listVerdicts(
  opts: ListVerdictsOptions,
): Promise<CristianoVerdict[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const where: Prisma.CristianoVerdictWhereInput = {
    userId: opts.userId,
  };
  if (opts.kind) where.kind = opts.kind;
  if (opts.sourceApp) where.sourceApp = opts.sourceApp;
  if (opts.beforeCreatedAt) where.createdAt = { lt: opts.beforeCreatedAt };
  return prisma.cristianoVerdict.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * Fetch a single verdict by id + owning user. Owner check is enforced
 * at the query level so a wrong-user fetch returns null (404 at route).
 */
export async function findVerdictByIdForUser(
  id: string,
  userId: string,
): Promise<CristianoVerdict | null> {
  return prisma.cristianoVerdict.findFirst({
    where: { id, userId },
  });
}

// ─── Insert ──────────────────────────────────────────────────────────────────

export interface SaveVerdictInput {
  userId: string;
  kind: CristianoVerdictKind;
  sourceApp: CristianoSourceApp;
  externalId?: string | null;
  requestPayload: CristianoVerdictRequest["payload"];
  requestHash: string;
  verdictBody: CristianoVerdictBody["body"];
  spokenScript: string;
  verdictTitle: string;
  preRenderedVideoUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  status?: "pending" | "ready" | "failed";
  errorMessage?: string | null;
  modelUsed?: string | null;
  tokenInputCount?: number | null;
  tokenOutputCount?: number | null;
  latencyMs?: number | null;
  expiresAt?: Date | null;
}

/**
 * Insert a verdict row. Caller is responsible for ensuring no existing
 * row exists for (userId, requestHash) — typically by calling
 * `findExistingVerdict` first. The unique constraint on the table
 * acts as a safety net.
 */
export async function saveVerdict(
  input: SaveVerdictInput,
): Promise<CristianoVerdict> {
  return prisma.cristianoVerdict.create({
    data: {
      userId: input.userId,
      kind: input.kind,
      sourceApp: input.sourceApp,
      externalId: input.externalId ?? null,
      requestPayload: input.requestPayload as Prisma.InputJsonValue,
      requestHash: input.requestHash,
      verdictBody: input.verdictBody as Prisma.InputJsonValue,
      spokenScript: input.spokenScript,
      verdictTitle: input.verdictTitle,
      preRenderedVideoUrl: input.preRenderedVideoUrl ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      durationSeconds: input.durationSeconds ?? null,
      status: input.status ?? "ready",
      errorMessage: input.errorMessage ?? null,
      modelUsed: input.modelUsed ?? null,
      tokenInputCount: input.tokenInputCount ?? null,
      tokenOutputCount: input.tokenOutputCount ?? null,
      latencyMs: input.latencyMs ?? null,
      expiresAt: input.expiresAt ?? null,
    },
  });
}

// ─── Mapping ─────────────────────────────────────────────────────────────────

/**
 * Map a Prisma row to the public `CristianoVerdictRecord` shape. Forces
 * the persisted `kind` + `sourceApp` strings through the type guards so
 * a stale/corrupted row can't punch out of the discriminated union
 * silently — invalid values throw, which is the 2026 "no silent
 * failure" bar.
 */
export function toRecord(row: CristianoVerdict): CristianoVerdictRecord {
  if (!(CRISTIANO_VERDICT_KINDS as readonly string[]).includes(row.kind)) {
    throw new Error(`Corrupted CristianoVerdict.kind: ${row.kind}`);
  }
  if (!(CRISTIANO_SOURCE_APPS as readonly string[]).includes(row.sourceApp)) {
    throw new Error(`Corrupted CristianoVerdict.sourceApp: ${row.sourceApp}`);
  }

  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind as CristianoVerdictKind,
    sourceApp: row.sourceApp as CristianoSourceApp,
    externalId: row.externalId,
    requestPayload: row.requestPayload as CristianoVerdictRequest["payload"],
    requestHash: row.requestHash,
    verdictBody: row.verdictBody as CristianoVerdictBody["body"],
    spokenScript: row.spokenScript,
    verdictTitle: row.verdictTitle,
    preRenderedVideoUrl: row.preRenderedVideoUrl,
    thumbnailUrl: row.thumbnailUrl,
    durationSeconds: row.durationSeconds,
    status: row.status as "pending" | "ready" | "failed",
    errorMessage: row.errorMessage,
    modelUsed: row.modelUsed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
  };
}
