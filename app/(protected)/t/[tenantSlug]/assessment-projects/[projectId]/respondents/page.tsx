import { AssessmentProjectRespondentsPage } from "@/features/assessment-project-respondents";

type ProjectRespondentsRouteProps = {
  params: Promise<{
    tenantSlug: string;
    projectId: string;
  }>;
};

export default async function ProjectRespondentsRoute({
  params,
}: ProjectRespondentsRouteProps) {
  const { tenantSlug, projectId } = await params;

  return (
    <AssessmentProjectRespondentsPage
      tenantSlug={tenantSlug}
      assessmentProjectId={projectId}
    />
  );
}