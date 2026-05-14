import { and, asc, eq, isNull } from "drizzle-orm";

import { tenantMemberships, tenants, users } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

import type { TenantMemberListItem } from "../types/tenant-member.types";

export async function listTenantMembers(
  tenantSlug: string,
): Promise<TenantMemberListItem[]> {
  const rows = await controlDb
    .select({
      membershipId: tenantMemberships.id,
      userId: users.id,
      email: users.email,
      name: users.name,
      role: tenantMemberships.role,
      status: tenantMemberships.status,
      createdAt: tenantMemberships.createdAt,
      updatedAt: tenantMemberships.updatedAt,
    })
    .from(tenantMemberships)
    .innerJoin(users, eq(users.id, tenantMemberships.userId))
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(
      and(
        eq(tenants.slug, tenantSlug),
        isNull(tenants.deletedAt),
        isNull(tenantMemberships.deletedAt),
        isNull(users.deletedAt),
      ),
    )
    .orderBy(asc(users.email));

  return rows as TenantMemberListItem[];
}