import type { Session } from "next-auth";
import { and, eq, isNull } from "drizzle-orm";

import { tenantMemberships, tenants, users } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";
import type { ReactNode } from "react";

import {
  Building2,
  ClipboardCheck,
  ClipboardList,
  DatabaseZap,
  FileText,
  LayoutDashboard,
  PackageCheck,
  PanelsTopLeft,
} from "lucide-react";

export type ProtectedNavigationItem = {
  href: string;
  label: string;
  icon?: ReactNode;
};

const baseUserNavigation: ProtectedNavigationItem[] = [
  {
    label: "Moje badanie",
    href: "/my/assessment",
    icon: <ClipboardCheck className="h-4 w-4 shrink-0" />,
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
        icon: <LayoutDashboard className="h-4 w-4 shrink-0" />,
      },
      {
        label: "Partnerzy",
        href: "/dashboard/tenants",
        icon: <Building2 className="h-4 w-4 shrink-0" />,
      },
      {
        label: "Migracje",
        href: "/dashboard/tenant-migrations",
        icon: <DatabaseZap className="h-4 w-4 shrink-0" />,
      },
      {
        label: "Kwestionariusze",
        href: "/dashboard/questionnaires",
        icon: <ClipboardList className="h-4 w-4 shrink-0" />,
      },
      {
        label: "Szablony raportów",
        href: "/dashboard/report-templates",
        icon: <FileText className="h-4 w-4 shrink-0" />,
      },
      {
        label: "Produkty",
        href: "/dashboard/report-access",
        icon: <PackageCheck className="h-4 w-4 shrink-0" />,
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
    ...baseUserNavigation,
    {
      label: "Panel tenanta",
      href: `/t/${activeTenantSlugs[0]}/dashboard`,
      icon: <PanelsTopLeft className="h-4 w-4 shrink-0" />,
    },
  ];
}