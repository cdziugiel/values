import { systemAuditLog } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

type WriteSystemAuditLogInput = {
  actorUserId?: string | null;
  tenantId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function writeSystemAuditLog(input: WriteSystemAuditLogInput) {
  await controlDb.insert(systemAuditLog).values({
    actorUserId: input.actorUserId ?? null,
    tenantId: input.tenantId ?? null,
    actorRole: input.actorRole ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    before: input.before ?? null,
    after: input.after ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });
}