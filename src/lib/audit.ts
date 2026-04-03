import { prisma } from "@/lib/prisma";

interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  organizationId: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit trail entry. Fire-and-forget — does not throw on failure.
 */
export function logAudit(entry: AuditEntry) {
  prisma.auditLog
    .create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        userId: entry.userId ?? null,
        organizationId: entry.organizationId,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      },
    })
    .catch(() => {});
}
