import { AssessmentProjectResultsPage } from "@/features/assessment-results/components/assessment-project-results-page";

type PageProps = {
  params: Promise<{
    tenantSlug: string;
    projectId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { tenantSlug, projectId } = await params;

  return (
    <AssessmentProjectResultsPage
      tenantSlug={tenantSlug}
      assessmentProjectId={projectId}
    />
  );
}