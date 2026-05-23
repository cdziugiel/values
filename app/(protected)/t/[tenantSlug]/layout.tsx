import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  Building2,
  ChevronDown,
  ClipboardList,
  FileText,
  KeyRound,
  Network,
  ShieldCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

type TenantLayoutProps = {
  children: ReactNode;
  params: Promise<{
    tenantSlug: string;
  }>;
};

type TenantNavigationItem = {
  label: string;
  href: string;
  icon: ReactNode;
  description: string;
};

function getRoleLabel(role: string) {
  switch (role) {
    case "TENANT_OWNER":
      return "Owner";
    case "TENANT_ADMIN":
      return "Admin";
    case "TENANT_MEMBER":
      return "Członek";
    default:
      return role;
  }
}

function TenantNavLink({ item }: { item: TenantNavigationItem }) {
  return (
    <Link
      href={item.href}
      className="group inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-medium text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:border-black/20 hover:bg-white hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
    >
      <span className="text-[#6b7280] transition group-hover:text-[#0f766e]">
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

function TenantMobileNavLink({ item }: { item: TenantNavigationItem }) {
  return (
    <Link
      href={item.href}
      className="flex gap-3 rounded-[1.25rem] border border-black/10 bg-white/70 p-4 transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
        {item.icon}
      </div>

      <div>
        <div className="font-semibold tracking-[-0.02em] text-[#171717]">
          {item.label}
        </div>

        <div className="mt-1 text-xs leading-5 text-[#6b7280]">
          {item.description}
        </div>
      </div>
    </Link>
  );
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { tenantSlug } = await params;

  const ctx = await requireTenantContext({
    tenantSlug,
  });

  const tenantNavigation: TenantNavigationItem[] = [
    {
      label: "Dashboard",
      href: `/t/${ctx.tenantSlug}/dashboard`,
      icon: <BarChart3 size={15} />,
      description: "Operacyjny obraz projektów, sesji i raportów.",
    },
    {
      label: "Organizacje",
      href: `/t/${ctx.tenantSlug}/client-organizations`,
      icon: <Building2 size={15} />,
      description: "Firmy i organizacje klientów partnera.",
    },
    {
      label: "Jednostki",
      href: `/t/${ctx.tenantSlug}/client-units`,
      icon: <Network size={15} />,
      description: "Działy, zespoły i struktura organizacyjna.",
    },
    {
      label: "Respondenci",
      href: `/t/${ctx.tenantSlug}/respondents`,
      icon: <Users size={15} />,
      description: "Baza respondentów w środowisku partnera.",
    },
    {
      label: "Projekty badawcze",
      href: `/t/${ctx.tenantSlug}/assessment-projects`,
      icon: <ClipboardList size={15} />,
      description: "Badania, respondenci, kwestionariusze i wyniki.",
    },
    {
      label: "Członkowie",
      href: `/t/${ctx.tenantSlug}/members`,
      icon: <ShieldCheck size={15} />,
      description: "Zespół partnera, role i dostęp użytkowników.",
    },
    {
      label: "Dostępy raportowe",
      href: `/t/${ctx.tenantSlug}/report-access`,
      icon: <KeyRound size={15} />,
      description: "Pule, kody i zamówienia dostępów do raportów.",
    },
  ];

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:items-start md:p-6 lg:p-7">
            <div className="min-w-0">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <ShieldCheck size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Panel partnera
                </span>
              </div>

              <h1 className="truncate text-2xl font-semibold tracking-[-0.04em] text-[#171717] md:text-3xl">
                {ctx.tenantName}
              </h1>

            </div>

            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                {getRoleLabel(ctx.role)}
              </Badge>

              {ctx.isSuperAdminAccess ? (
                <Badge className="rounded-full border-red-200 bg-red-50 text-red-700">
                  SUPER_ADMIN access
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="border-t border-black/10 bg-white/35 px-5 py-4 md:px-6 lg:px-7">
            <nav className="hidden flex-wrap gap-2 lg:flex">
              {tenantNavigation.map((item) => (
                <TenantNavLink key={item.href} item={item} />
              ))}
            </nav>

            <details className="group lg:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[1.25rem] border border-black/10 bg-white/70 px-4 py-3 text-sm font-semibold text-[#171717] shadow-sm">
                <span className="flex items-center gap-2">
                  <FileText size={16} className="text-[#0f766e]" />
                  Nawigacja partnera
                </span>

                <ChevronDown
                  size={16}
                  className="text-[#6b7280] transition group-open:rotate-180"
                />
              </summary>

              <div className="mt-3 grid gap-2">
                {tenantNavigation.map((item) => (
                  <TenantMobileNavLink key={item.href} item={item} />
                ))}
              </div>
            </details>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}