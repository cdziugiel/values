import type { GlobalRole, TenantRole } from "@/server/permissions/roles";

import { tenantAuditLog } from "@/drizzle/schema/tenant";

export type TenantAuditActorContext = {
  userId: string;
  role: TenantRole | GlobalRole;
};

export type WriteTenantAuditLogInput = {
  db: any;
  ctx: TenantAuditActorContext;
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