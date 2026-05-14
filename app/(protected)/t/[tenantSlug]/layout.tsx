import type { ReactNode } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

type TenantLayoutProps = {
  children: ReactNode;
  params: Promise<{
    tenantSlug: string;
  }>;
};

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { tenantSlug } = await params;

  const ctx = await requireTenantContext({
    tenantSlug,
  });

const tenantNavigation = [
  {
    label: "Dashboard",
    href: `/t/${ctx.tenantSlug}/dashboard`,
  },
  {
    label: "Organizacje",
    href: `/t/${ctx.tenantSlug}/client-organizations`,
  },
  {
    label: "Projekty badawcze",
    href: `/t/${ctx.tenantSlug}/assessment-projects`,
  },
  {
    label: "Respondenci",
    href: `/t/${ctx.tenantSlug}/respondents`,
  },
  {
    label: "Raporty",
    href: `/t/${ctx.tenantSlug}/reports`,
  },
  {
    label: "Członkowie",
    href: `/t/${ctx.tenantSlug}/members`,
  },
];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-medium text-foreground">{ctx.tenantName}</div>
            <div className="text-sm text-muted-foreground">
              Tenant: <span className="font-mono">{ctx.tenantSlug}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{ctx.role}</Badge>

            {ctx.isSuperAdminAccess ? (
              <Badge variant="destructive">SUPER_ADMIN access</Badge>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          {tenantNavigation.map((item) => (
            <Button key={item.href} asChild size="sm" variant="outline">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      {children}
    </div>
  );
}