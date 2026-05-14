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
import Link from "next/link";
import { Button } from "@/components/ui/button";

import { listActiveQuestionnaireVersions } from "@/features/questionnaires/api/questionnaire.queries";
import { ProjectQuestionnairePicker } from "@/features/assessment-project-questionnaires";

import {
  listAssessmentProjectOrganizations,
  listAssessmentProjects,
} from "../api/assessment-project.queries";
import { AssessmentProjectRowActions } from "./assessment-project-row-actions";
import { CreateAssessmentProjectForm } from "./create-assessment-project-form";

function formatDateTime(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
  }).format(value);
}

type AssessmentProjectsPageProps = {
  tenantSlug: string;
};

export async function AssessmentProjectsPage({
  tenantSlug,
}: AssessmentProjectsPageProps) {
  const ctx = await requireTenantContext({
    tenantSlug,
  });

  const canRead = ctx.permissions.includes("assessment_project:read");
  const canCreate = ctx.permissions.includes("assessment_project:create");
  const canUpdate = ctx.permissions.includes("assessment_project:update");

  if (!canRead) {
    throw new Error("Missing permission: assessment_project:read");
  }

  const db = await getTenantDb(ctx);

  const [projects, organizations, questionnaireOptions] = await Promise.all([
    listAssessmentProjects(db),
    listAssessmentProjectOrganizations(db),
    listActiveQuestionnaireVersions(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Projekty badawcze"
        description="Zarządzanie projektami diagnostycznymi i badaniami realizowanymi dla klientów."
      />

      <CreateAssessmentProjectForm
        tenantSlug={ctx.tenantSlug}
        canCreate={canCreate}
        organizations={organizations}
      />

      <Card>
        <CardHeader>
          <CardTitle>Lista projektów</CardTitle>
        </CardHeader>

        <CardContent>
          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-sm text-muted-foreground">
              Brak projektów badawczych.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Nazwa</th>
                    <th className="py-3 pr-4 font-medium">Organizacja</th>
                    <th className="py-3 pr-4 font-medium">Status</th>
                    <th className="py-3 pr-4 font-medium">Start</th>
                    <th className="py-3 pr-4 font-medium">Koniec</th>
                    <th className="py-3 pr-4 font-medium">Opis</th>
                    <th className="py-3 pr-4 font-medium">Aktualizacja</th>
                    <th className="py-3 pr-4 font-medium">Akcje</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td className="py-3 pr-4 font-medium">
                        {project.name}
                      </td>

                      <td className="py-3 pr-4">
                        {project.clientOrganizationName ?? "—"}
                      </td>

                      <td className="py-3 pr-4">
                        <Badge variant="outline">{project.status}</Badge>
                      </td>

                      <td className="py-3 pr-4">
                        {formatDateTime(project.startsAt)}
                      </td>

                      <td className="py-3 pr-4">
                        {formatDateTime(project.endsAt)}
                      </td>

                      <td className="max-w-[280px] truncate py-3 pr-4">
                        {project.description ?? "—"}
                      </td>

                      <td className="py-3 pr-4">
                        {formatDateTime(project.updatedAt)}
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link
                              href={`/t/${ctx.tenantSlug}/assessment-projects/${project.id}/respondents`}
                            >
                              Uczestnicy
                            </Link>
                          </Button>

                          <AssessmentProjectRowActions
                            tenantSlug={ctx.tenantSlug}
                            project={project}
                            organizations={organizations}
                            canManage={canUpdate}
                          />
                          <ProjectQuestionnairePicker
                            tenantSlug={ctx.tenantSlug}
                            assessmentProjectId={project.id}
                            options={questionnaireOptions}
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