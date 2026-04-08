import { NextResponse } from "next/server";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

import { requireAdminAccess } from "@/lib/admin/auth";
import { getServerEnv } from "@/lib/config/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MigrationFile {
  filename: string;
  content: string;
}

export async function GET(request: Request) {
  const access = requireAdminAccess(request);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const env = getServerEnv();

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase credentials not configured" },
      { status: 503 }
    );
  }

  try {
    // List available migrations
    const migrationsDir = join(process.cwd(), "supabase", "migrations");
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    return NextResponse.json({
      migrations: files,
      count: files.length,
      note: "POST to apply migrations. Migrations are applied in order.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list migrations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = requireAdminAccess(request);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const env = getServerEnv();

  if (!env.SUPABASE_URL) {
    return NextResponse.json(
      { error: "Supabase URL not configured" },
      { status: 503 }
    );
  }

  try {
    // Get optional specific migration from request body
    const body = await request.json().catch(() => ({}));
    const specificMigration = body.migration as string | undefined;

    const migrationsDir = join(process.cwd(), "supabase", "migrations");
    let files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (specificMigration) {
      files = files.filter((f) => f === specificMigration);
      if (files.length === 0) {
        return NextResponse.json(
          { error: `Migration not found: ${specificMigration}` },
          { status: 404 }
        );
      }
    }

    // Return SQL content for manual execution
    const migrations: MigrationFile[] = files.map((filename) => ({
      filename,
      content: readFileSync(join(migrationsDir, filename), "utf-8"),
    }));

    return NextResponse.json({
      migrations,
      count: migrations.length,
      supabaseUrl: env.SUPABASE_URL,
      instructions: [
        "1. Go to your Supabase project dashboard",
        "2. Navigate to SQL Editor",
        "3. Run each migration SQL in order",
        "4. Or use Supabase CLI: supabase db push",
      ],
      note: "Migrations must be applied manually via Supabase Dashboard SQL Editor or CLI",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read migrations";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
