import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";
import { PageHeader } from "@/shared/ui";

import { listClientOrganizations } from "../api/client-organization.queries";
import { ClientOrganizationRowActions } from "./client-organization-row-actions";
import { CreateClientOrganizationForm } from "./create-client-organization-form";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

type ClientOrganizationsPageProps = {
  tenantSlug: string;
};

export async function ClientOrganizationsPage({
  tenantSlug,
}: ClientOrganizationsPageProps) {
  const ctx = await requireTenantContext({
    tenantSlug,
  });

  const canRead = ctx.permissions.includes("client_organization:read");
  const canCreate = ctx.permissions.includes("client_organization:create");

  if (!canRead) {
    throw new Error("Missing permission: client_organization:read");
  }

  const db = await getTenantDb(ctx);
  const organizations = await listClientOrganizations(db);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Organizacje klientów"
        description="Firmy, jednostki lub organizacje, dla których prowadzone są badania."
      />

      <CreateClientOrganizationForm
        tenantSlug={ctx.tenantSlug}
        canCreate={canCreate}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista organizacji</CardTitle>
        </CardHeader>

        <CardContent>
          {organizations.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Brak organizacji klientów.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Nazwa</th>
                    <th className="py-3 pr-4 font-medium">Branża</th>
                    <th className="py-3 pr-4 font-medium">Wielkość</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Utworzono</th>
                    <th className="py-3 pr-4 font-medium">Aktualizacja</th>
                    <th className="py-3 pr-4 font-medium">Akcje</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {organizations.map((organization) => (
                    <tr key={organization.id}>
                      <td className="py-3 pr-4 font-medium">
                        {organization.name}
                      </td>

                      <td className="py-3 pr-4">
                        {organization.industry ?? "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {organization.size ?? "—"}
                      </td>

                      <td className="py-3 pr-4">
                        <Badge variant="outline">{organization.status}</Badge>
                      </td>

                      <td className="py-3 pr-4">
                        {formatDate(organization.createdAt)}
                      </td>

                      <td className="py-3 pr-4">
                        {formatDate(organization.updatedAt)}
                      </td>

                      <td className="py-3 pr-4">
                        <ClientOrganizationRowActions
                          tenantSlug={ctx.tenantSlug}
                          organization={organization}
                          canManage={canCreate}
                        />
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