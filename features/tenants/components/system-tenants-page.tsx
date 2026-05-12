import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/shared/ui";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";

import { listSystemTenants } from "../api/tenant.queries";
import { CreateTenantForm } from "./create-tenant-form";
import { TenantRowActions } from "./tenant-row-actions";

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getMigrationBadgeVariant(status: string | null) {
  if (status === "success") {
    return "secondary";
  }

  if (status === "failed") {
    return "destructive";
  }

  return "outline";
}

export async function SystemTenantsPage() {
  await requireSuperAdmin();

  const tenants = await listSystemTenants();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tenanty"
        description="Zarządzanie tenantami, bazami danych i statusem migracji."
      />

      <CreateTenantForm />

      <Card>
        <CardHeader>
          <CardTitle>Lista tenantów</CardTitle>
        </CardHeader>

        <CardContent>
          {tenants.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Brak tenantów.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Nazwa</th>
                    <th className="py-3 pr-4 font-medium">Slug</th>
                    <th className="py-3 pr-4 font-medium">Owner</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Baza</th>
                    <th className="py-3 pr-4 font-medium">Migracje</th>
                    <th className="py-3 pr-4 font-medium">Wersja</th>
                    <th className="py-3 pr-4 font-medium">Ostatnia migracja</th>
                    <th className="py-3 pr-4 font-medium">Akcje</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {tenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td className="py-3 pr-4 font-medium">{tenant.name}</td>

                      <td className="py-3 pr-4 font-mono text-xs">
                        {tenant.slug}
                      </td>
                      <td className="py-3 pr-4">
                        {tenant.ownerEmail ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline">{tenant.status}</Badge>
                      </td>

                      <td className="py-3 pr-4 font-mono text-xs">
                        {tenant.databaseName ?? "—"}
                      </td>

                      <td className="py-3 pr-4">
                        <Badge
                          variant={getMigrationBadgeVariant(
                            tenant.migrationStatus,
                          )}
                        >
                          {tenant.migrationStatus ?? "missing"}
                        </Badge>
                      </td>

                      <td className="py-3 pr-4">
                        {tenant.schemaVersion ?? "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {formatDate(tenant.lastMigratedAt)}
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/t/${tenant.slug}/dashboard`}>Otwórz</Link>
                          </Button>

                          <TenantRowActions
                            tenant={{
                              id: tenant.id,
                              name: tenant.name,
                              slug: tenant.slug,
                              status: tenant.status,
                              ownerEmail: tenant.ownerEmail,
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}