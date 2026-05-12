import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div>
          <div className="font-medium text-foreground">{ctx.tenantName}</div>
          <div>
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

      {children}
    </div>
  );
}