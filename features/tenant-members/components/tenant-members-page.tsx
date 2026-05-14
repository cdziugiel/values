import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/shared/ui";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import { listTenantMembers } from "../api/tenant-member.queries";
import { AddTenantMemberForm } from "./add-tenant-member-form";
import { TenantMemberRowActions } from "./tenant-member-row-actions";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

type TenantMembersPageProps = {
  tenantSlug: string;
};

export async function TenantMembersPage({ tenantSlug }: TenantMembersPageProps) {
  const ctx = await requireTenantContext({
    tenantSlug,
  });

  const canManageMembers = ctx.permissions.includes("user:invite");

  const members = await listTenantMembers(ctx.tenantSlug);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Członkowie tenanta"
        description="Zarządzanie dostępem użytkowników do tenanta i ich rolami."
      />

      <AddTenantMemberForm
        tenantSlug={ctx.tenantSlug}
        canInvite={canManageMembers}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista członków</CardTitle>
        </CardHeader>

        <CardContent>
          {members.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Brak członków tenanta.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Email</th>
                    <th className="py-3 pr-4 font-medium">Nazwa</th>
                    <th className="py-3 pr-4 font-medium">Rola</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Dodano</th>
                    <th className="py-3 pr-4 font-medium">Aktualizacja</th>
                    <th className="py-3 pr-4 font-medium">Akcje</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {members.map((member) => (
                    <tr key={member.membershipId}>
                      <td className="py-3 pr-4 font-medium">
                        {member.email}
                      </td>

                      <td className="py-3 pr-4">
                        {member.name ?? "—"}
                      </td>

                      <td className="py-3 pr-4">
                        <Badge variant="secondary">{member.role}</Badge>
                      </td>

                      <td className="py-3 pr-4">
                        <Badge variant="outline">{member.status}</Badge>
                      </td>

                      <td className="py-3 pr-4">
                        {formatDate(member.createdAt)}
                      </td>

                      <td className="py-3 pr-4">
                        {formatDate(member.updatedAt)}
                      </td>

                      <td className="py-3 pr-4">
                        <TenantMemberRowActions
                          tenantSlug={ctx.tenantSlug}
                          member={member}
                          canManage={canManageMembers}
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