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

function getTenantNavigation(tenantSlug: string): ProtectedNavigationItem[] {
  return [
    {
      label: `Tenant: ${tenantSlug}`,
      href: `/t/${tenantSlug}/dashboard`,
    },
    {
      label: "Projekty badawcze",
      href: `/t/${tenantSlug}/assessment-projects`,
    },
    {
      label: "Respondenci",
      href: `/t/${tenantSlug}/respondents`,
    },
    {
      label: "Raporty",
      href: `/t/${tenantSlug}/reports`,
    },
  ];
}

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
    const activeTenants = await controlDb.query.tenants.findMany({
      where: and(eq(tenants.status, "active"), isNull(tenants.deletedAt)),
      columns: {
        slug: true,
      },
    });

    return [
      {
        label: "Dashboard",
        href: "/dashboard",
      },
      ...baseUserNavigation,
      ...activeTenants.flatMap((tenant) => getTenantNavigation(tenant.slug)),
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
    ...activeTenantSlugs.flatMap((tenantSlug) =>
      getTenantNavigation(tenantSlug),
    ),
  ];
}