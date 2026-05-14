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
  listRespondentOrganizations,
  listRespondents,
  listRespondentUnits,
} from "../api/respondent.queries";
import { CreateRespondentForm } from "./create-respondent-form";
import { RespondentRowActions } from "./respondent-row-actions";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getRespondentName({
  firstName,
  lastName,
  email,
}: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return fullName || email || "—";
}

type RespondentsPageProps = {
  tenantSlug: string;
};

export async function RespondentsPage({ tenantSlug }: RespondentsPageProps) {
  const ctx = await requireTenantContext({
    tenantSlug,
  });

  const canRead = ctx.permissions.includes("respondent:read");
  const canCreate = ctx.permissions.includes("respondent:create");
  const canUpdate = ctx.permissions.includes("respondent:update");

  if (!canRead) {
    throw new Error("Missing permission: respondent:read");
  }

  const db = await getTenantDb(ctx);

  const [respondents, organizations, units] = await Promise.all([
    listRespondents(db),
    listRespondentOrganizations(db),
    listRespondentUnits(db),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Respondenci"
        description="Uczestnicy badań przypisani do organizacji i jednostek klienta."
      />

      <CreateRespondentForm
        tenantSlug={ctx.tenantSlug}
        canCreate={canCreate}
        organizations={organizations}
        units={units}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista respondentów</CardTitle>
        </CardHeader>

        <CardContent>
          {respondents.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Brak respondentów.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Respondent</th>
                    <th className="py-3 pr-4 font-medium">Email</th>
                    <th className="py-3 pr-4 font-medium">Kod</th>
                    <th className="py-3 pr-4 font-medium">Organizacja</th>
                    <th className="py-3 pr-4 font-medium">Jednostka</th>
                    <th className="py-3 pr-4 font-medium">Telefon</th>
                    <th className="py-3 pr-4 font-medium">Utworzono</th>
                    <th className="py-3 pr-4 font-medium">Akcje</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {respondents.map((respondent) => (
                    <tr key={respondent.id}>
                      <td className="py-3 pr-4 font-medium">
                        {getRespondentName(respondent)}
                      </td>

                      <td className="py-3 pr-4">
                        {respondent.email ?? "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {respondent.externalCode ? (
                          <Badge variant="outline">
                            {respondent.externalCode}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="py-3 pr-4">
                        {respondent.clientOrganizationName ?? "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {respondent.clientUnitName ?? "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {respondent.phone ?? "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {formatDate(respondent.createdAt)}
                      </td>

                      <td className="py-3 pr-4">
                        <RespondentRowActions
                          tenantSlug={ctx.tenantSlug}
                          respondent={respondent}
                          organizations={organizations}
                          units={units}
                          canManage={canUpdate}
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