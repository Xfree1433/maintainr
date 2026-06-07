import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface MigrationRow {
  migration_name: string;
}
interface CountRow {
  c: bigint | number;
}

async function loadMigrations(): Promise<{ system: string; count: number; latest: string | null }> {
  // Prefer the formal _prisma_migrations table when it exists and has rows.
  try {
    const countRow: CountRow[] = await prisma.$queryRaw`
      SELECT count(*)::int AS c FROM "_prisma_migrations" WHERE finished_at IS NOT NULL
    `;
    const c = Number(countRow[0]?.c ?? 0);
    if (c > 0) {
      const latest: MigrationRow[] = await prisma.$queryRaw`
        SELECT migration_name FROM "_prisma_migrations"
        WHERE finished_at IS NOT NULL
        ORDER BY finished_at DESC LIMIT 1
      `;
      return { system: "prisma", count: c, latest: latest[0]?.migration_name ?? null };
    }
  } catch {
    // _prisma_migrations not present — fall through to manual count
  }
  // Fall back to counting user tables in the public schema.
  try {
    const tblCount: CountRow[] = await prisma.$queryRaw`
      SELECT count(*)::int AS c FROM information_schema.tables WHERE table_schema = 'public'
    `;
    return { system: "manual", count: Number(tblCount[0]?.c ?? 0), latest: null };
  } catch {
    return { system: "unknown", count: 0, latest: null };
  }
}

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const migrations = await loadMigrations();
    return NextResponse.json({ status: "ok", database: "connected", migrations });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { status: "degraded", database: "error", error: msg.slice(0, 200) },
      { status: 503 },
    );
  }
}
