import type { ReactNode } from "react";

import { AppShellTopbarSetter } from "@/shared/ui/app-shell-topbar-context";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

type TenantLayoutProps = {
  children: ReactNode;
  params: Promise<{
    tenantSlug: string;
  }>;
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

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const { tenantSlug } = await params;

  const ctx = await requireTenantContext({
    tenantSlug,
  });

  return (
    <>
      <AppShellTopbarSetter
        value={{
          eyebrow: "Panel partnera",
          title: ctx.tenantName,
          badges: [
            {
              label: getRoleLabel(ctx.role),
              tone: "accent",
            },
            ...(ctx.isSuperAdminAccess
              ? [
                  {
                    label: "SUPER_ADMIN access",
                    tone: "danger" as const,
                  },
                ]
              : []),
          ],
        }}
      />

      <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto w-full max-w-7xl space-y-6">
          {children}
        </div>
      </div>
    </>
  );
}