// server/tenant/require-tenant-context.ts

import { and, eq, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { tenantMemberships, tenants, users } from "@/drizzle/schema";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import {
  getPermissionsForTenantRole,
  type TenantRole,
} from "@/server/permissions/roles";

import type { TenantContext } from "./tenant-context.types";

type RequireTenantContextInput = {
  tenantSlug: string;
};

export async function requireTenantContext({
  tenantSlug,
}: RequireTenantContextInput): Promise<TenantContext> {
  const session = await requireSession();

  const userId = session.user.id;

  const user = await controlDb.query.users.findFirst({
    where: and(eq(users.id, userId), isNull(users.deletedAt)),
    columns: {
      id: true,
      globalRole: true,
      status: true,
    },
  });

  if (!user || user.status !== "active") {
    redirect("/login");
  }

  const tenant = await controlDb.query.tenants.findFirst({
    where: and(eq(tenants.slug, tenantSlug), isNull(tenants.deletedAt)),
    columns: {
      id: true,
      slug: true,
      name: true,
      status: true,
    },
  });

  if (!tenant || tenant.status !== "active") {
    notFound();
  }

  /**
   * Super admin access is allowed at control layer, but should be audited
   * when used to access tenant data. At this stage we only create the context.
   */
  if (user.globalRole === "SUPER_ADMIN") {
    const role: TenantRole = "TENANT_OWNER";

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      userId: user.id,
      role,
      permissions: getPermissionsForTenantRole(role),
      controlDb,
      isSuperAdminAccess: true,
    };
  }

  const membership = await controlDb.query.tenantMemberships.findFirst({
    where: and(
      eq(tenantMemberships.userId, user.id),
      eq(tenantMemberships.tenantId, tenant.id),
      eq(tenantMemberships.status, "active"),
      isNull(tenantMemberships.deletedAt),
    ),
    columns: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!membership) {
    redirect("/my/assessment");
  }

  const role = membership.role as TenantRole;

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.name,
    userId: user.id,
    role,
    permissions: getPermissionsForTenantRole(role),
    controlDb,
    isSuperAdminAccess: false,
  };
}