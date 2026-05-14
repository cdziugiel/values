import { tenantAuditLog } from "@/drizzle/schema/tenant-schema";
import type { TenantDb } from "@/server/db/tenant-db";
import type { TenantContext } from "@/server/tenant/tenant-context.types";

type WriteTenantAuditLogInput = {
  db: TenantDb;
  ctx: TenantContext;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function writeTenantAuditLog({
  db,
  ctx,
  action,
  entityType,
  entityId,
  before,
  after,
  ipAddress,
  userAgent,
}: WriteTenantAuditLogInput) {
  await db.insert(tenantAuditLog).values({
    actorUserId: ctx.userId,
    actorRole: ctx.role,
    action,
    entityType: entityType ?? null,
    entityId: entityId ?? null,
    before: before ?? null,
    after: after ?? null,
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });
}