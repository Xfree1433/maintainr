import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Authenticate an external API request via Bearer token (API key).
 * Returns the organizationId or a 401 error response.
 */
export async function authenticateApiKey(
  req: NextRequest
): Promise<{ orgId: string } | NextResponse> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header. Use: Bearer mt_live_..." },
      { status: 401 }
    );
  }

  const rawKey = authHeader.slice(7);
  const hashed = hashKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hashed },
    select: { id: true, organizationId: true },
  });

  if (!apiKey) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { orgId: apiKey.organizationId };
}
