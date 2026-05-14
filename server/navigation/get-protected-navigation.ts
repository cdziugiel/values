import type { Session } from "next-auth";
import { and, eq, isNull } from "drizzle-orm";

import { tenantMemberships, tenants, users } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

export type ProtectedNavigationItem = {
  label: string;
  href: string;
};

const baseUserNavigation: ProtectedNavigationItem[] = [
  {
    label: "Moje badanie",
    href: "/my/assessment",
  },
];

export async function getProtectedNavigation(
  session: Session,
): Promise<ProtectedNavigationItem[]> {
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
    return baseUserNavigation;
  }

  if (user.globalRole === "SUPER_ADMIN") {
    return [
      {
        label: "Dashboard",
        href: "/dashboard",
      },
      {
        label: "Tenanty",
        href: "/dashboard/tenants",
      },
      {
        label: "Migracje tenantów",
        href: "/dashboard/tenant-migrations",
      },
      {
        label: "Kwestionariusze",
        href: "/dashboard/questionnaires",
      },
      ...baseUserNavigation,
    ];
  }

  const memberships = await controlDb
    .select({
      tenantSlug: tenants.slug,
      tenantStatus: tenants.status,
      membershipStatus: tenantMemberships.status,
    })
    .from(tenantMemberships)
    .innerJoin(tenants, eq(tenantMemberships.tenantId, tenants.id))
    .where(eq(tenantMemberships.userId, userId));

  const activeTenantSlugs = memberships
    .filter((membership) => {
      return (
        membership.membershipStatus === "active" &&
        membership.tenantStatus === "active"
      );
    })
    .map((membership) => membership.tenantSlug);

  if (activeTenantSlugs.length === 0) {
    return baseUserNavigation;
  }

  return [
    {
      label: "Dashboard",
      href: "/dashboard",
    },
    ...baseUserNavigation,
    {
      label: "Panel tenanta",
      href: `/t/${activeTenantSlugs[0]}/dashboard`,
    },
  ];
}