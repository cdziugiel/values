import { eq } from "drizzle-orm";

import { tenantMemberships, tenants, users } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

export async function getUserForPostLoginRedirect(userId: string) {
  return controlDb.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      globalRole: true,
      status: true,
    },
  });
}

export async function listTenantMembershipsForPostLoginRedirect(userId: string) {
  return controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      role: tenantMemberships.role,
      membershipStatus: tenantMemberships.status,
      tenantStatus: tenants.status,
    })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
    .where(eq(tenantMemberships.userId, userId));
}