// server/navigation/get-protected-navigation.tsx
import type { ReactNode } from "react";
import type { Session } from "next-auth";
import { and, eq, isNull } from "drizzle-orm";

import { tenantMemberships, tenants, users } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

import {
  BarChart3,
  Building2,
  Clipboard,
  ClipboardCheck,
  ClipboardList,
  ClipboardPenLine,
  DatabaseZap,
  FileText,
  IdCardLanyard,
  KeyRound,
  LayoutDashboard,
  Network,
  PackageCheck,
  ShieldCheck,
  Users,
  TicketPercent,
  GitCompare,
  GitCompareArrows
} from "lucide-react";

export type ProtectedNavigationItem = {
  href: string;
  label: string;
  icon?: ReactNode;
};

export type ProtectedNavigationGroup = {
  label: string;
  items: ProtectedNavigationItem[];
};
const respondentNavigationItems: ProtectedNavigationItem[] = [
  {
    label: "Do wypełnienia",
    href: "/my/assessment?tab=todo",
    icon: <Clipboard className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Rozpoczęte",
    href: "/my/assessment?tab=in_progress",
    icon: <ClipboardPenLine className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Zaproszenia",
    href: "/my/assessment?tab=invitations",
    icon: <IdCardLanyard className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Ukończone",
    href: "/my/assessment?tab=completed",
    icon: <ClipboardCheck className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Raporty",
    href: "/my/assessment?tab=reports",
    icon: <FileText className="h-4 w-4 shrink-0" />,
  },
  {
    label: "Dopasowanie",
    href: "/my/assessment/compare",
    icon: <GitCompareArrows className="h-4 w-4 shrink-0" />,
  },
];

const respondentNavigationGroup: ProtectedNavigationGroup = {
  label: "Panel respondenta",
  items: respondentNavigationItems,
};

const adminNavigationGroup: ProtectedNavigationGroup = {
  label: "Panel admina",
  items: [
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
    {
      label: "Rabaty",
      href: "/dashboard/discount-codes",
      icon: <TicketPercent className="h-4 w-4 shrink-0" />,
    },
  ],
};



function createPartnerNavigationGroup(
  tenantSlug: string,
): ProtectedNavigationGroup {
  return {
    label: "Panel partnera",
    items: [
      {
        label: "Dashboard",
        href: `/t/${tenantSlug}/dashboard`,
        icon: <BarChart3 className="h-4 w-4 shrink-0" />,
      },
      {
        label: "Organizacje",
        href: `/t/${tenantSlug}/client-organizations`,
        icon: <Building2 className="h-4 w-4 shrink-0" />,
      },
      {
        label: "Działy",
        href: `/t/${tenantSlug}/client-units`,
        icon: <Network className="h-4 w-4 shrink-0" />,
      },
      {
        label: "Respondenci",
        href: `/t/${tenantSlug}/respondents`,
        icon: <Users className="h-4 w-4 shrink-0" />,
      },
      {
        label: "Projekty badawcze",
        href: `/t/${tenantSlug}/assessment-projects`,
        icon: <ClipboardList className="h-4 w-4 shrink-0" />,
      },
      {
        label: "Uprawnienia",
        href: `/t/${tenantSlug}/members`,
        icon: <ShieldCheck className="h-4 w-4 shrink-0" />,
      },
      {
        label: "Dostępy raportowe",
        href: `/t/${tenantSlug}/report-access`,
        icon: <KeyRound className="h-4 w-4 shrink-0" />,
      },
    ],
  };
}

export async function getProtectedNavigation(
  session: Session,
): Promise<ProtectedNavigationGroup[]> {
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
    return [respondentNavigationGroup];
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

  const partnerNavigationGroup =
    activeTenantSlugs.length > 0
      ? createPartnerNavigationGroup(activeTenantSlugs[0])
      : null;

  if (user.globalRole === "SUPER_ADMIN") {
    return [
      adminNavigationGroup,
      ...(partnerNavigationGroup ? [partnerNavigationGroup] : []),
      respondentNavigationGroup,
    ];
  }

  if (!partnerNavigationGroup) {
    return [respondentNavigationGroup];
  }

  return [partnerNavigationGroup, respondentNavigationGroup];
}