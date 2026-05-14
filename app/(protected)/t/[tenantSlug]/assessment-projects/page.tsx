import { AssessmentProjectsPage } from "@/features/assessment-projects";

type AssessmentProjectsRouteProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
};

export default async function AssessmentProjectsRoute({
  params,
}: AssessmentProjectsRouteProps) {
  const { tenantSlug } = await params;

  return <AssessmentProjectsPage tenantSlug={tenantSlug} />;
}