import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface CountRow {
  c: bigint | number;
}

// Anonymous endpoint: report only how many migrations ran, never their names
// (or any DB error text) — the status page and deploy tool read status,
// database and migrations.{system,count}.
async function loadMigrations(): Promise<{ system: string; count: number }> {
  // Prefer the formal _prisma_migrations table when it exists and has rows.
  try {
    const countRow: CountRow[] = await prisma.$queryRaw`
      SELECT count(*)::int AS c FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
    `;
    const c = Number(countRow[0]?.c ?? 0);
    if (c > 0) {
      return { system: "prisma", count: c };
    }
  } catch {
    // _prisma_migrations not present — fall through to manual count
  }
  // Fall back to counting user tables in the public schema.
  try {
    const tblCount: CountRow[] = await prisma.$queryRaw`
      SELECT count(*)::int AS c FROM information_schema.tables WHERE table_schema = 'public'
    `;
    return { system: "manual", count: Number(tblCount[0]?.c ?? 0) };
  } catch {
    return { system: "unknown", count: 0 };
  }
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const migrations = await loadMigrations();
    return NextResponse.json({ status: "ok", database: "connected", migrations });
  } catch (e: unknown) {
    // Detail stays in the server log; the anonymous caller gets the shape only.
    console.error("[health] database check failed:", e);
    return NextResponse.json(
      { status: "degraded", database: "error" },
      { status: 503 },
    );
  }
}
