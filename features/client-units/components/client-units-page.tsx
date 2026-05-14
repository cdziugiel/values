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

import {
  listClientUnitOrganizations,
  listClientUnitParentOptions,
  listClientUnits,
} from "../api/client-unit.queries";
import { ClientUnitRowActions } from "./client-unit-row-actions";
import { CreateClientUnitForm } from "./create-client-unit-form";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

type ClientUnitsPageProps = {
  tenantSlug: string;
};

export async function ClientUnitsPage({ tenantSlug }: ClientUnitsPageProps) {
  const ctx = await requireTenantContext({
    tenantSlug,
  });

  const canRead = ctx.permissions.includes("client_unit:read");
  const canCreate = ctx.permissions.includes("client_unit:create");
  const canUpdate = ctx.permissions.includes("client_unit:update");

  if (!canRead) {
    throw new Error("Missing permission: client_unit:read");
  }

  const db = await getTenantDb(ctx);

  const [units, organizations, parentOptions] = await Promise.all([
    listClientUnits(db),
    listClientUnitOrganizations(db),
    listClientUnitParentOptions(db),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Jednostki organizacyjne"
        description="Działy, zespoły i struktury organizacji klienta."
      />

      <CreateClientUnitForm
        tenantSlug={ctx.tenantSlug}
        canCreate={canCreate}
        organizations={organizations}
        parentOptions={parentOptions}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista jednostek</CardTitle>
        </CardHeader>

        <CardContent>
          {units.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Brak jednostek organizacyjnych.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Nazwa</th>
                    <th className="py-3 pr-4 font-medium">Organizacja</th>
                    <th className="py-3 pr-4 font-medium">Nadrzędna</th>
                    <th className="py-3 pr-4 font-medium">Typ</th>
                    <th className="py-3 pr-4 font-medium">Utworzono</th>
                    <th className="py-3 pr-4 font-medium">Aktualizacja</th>
                    <th className="py-3 pr-4 font-medium">Akcje</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {units.map((unit) => (
                    <tr key={unit.id}>
                      <td className="py-3 pr-4 font-medium">{unit.name}</td>

                      <td className="py-3 pr-4">
                        {unit.clientOrganizationName}
                      </td>

                      <td className="py-3 pr-4">
                        {unit.parentName ?? "—"}
                      </td>

                      <td className="py-3 pr-4">
                        <Badge variant="outline">{unit.type}</Badge>
                      </td>

                      <td className="py-3 pr-4">
                        {formatDate(unit.createdAt)}
                      </td>

                      <td className="py-3 pr-4">
                        {formatDate(unit.updatedAt)}
                      </td>

                      <td className="py-3 pr-4">
                        <ClientUnitRowActions
                          tenantSlug={ctx.tenantSlug}
                          unit={unit}
                          canManage={canUpdate}
                          organizations={organizations}
                          parentOptions={parentOptions}
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