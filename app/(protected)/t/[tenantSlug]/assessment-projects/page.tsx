import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/shared/ui";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

type AssessmentProjectsPageProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
};

export default async function AssessmentProjectsPage({
  params,
}: AssessmentProjectsPageProps) {
  const { tenantSlug } = await params;

  const ctx = await requireTenantContext({
    tenantSlug,
  });

  requirePermission(ctx, "assessment_project:read");

  return (
    <>
      <PageHeader
        title="Projekty badawcze"
        description="Zarządzanie badaniami realizowanymi dla klientów tenanta."
        actions={
          ctx.permissions.includes("assessment_project:create") ? (
            <Button>Nowy projekt</Button>
          ) : null
        }
      />

      <EmptyState
        title="Brak projektów badawczych"
        description="Po podłączeniu bazy danych tutaj pojawi się lista projektów badawczych."
      />
    </>
  );
}