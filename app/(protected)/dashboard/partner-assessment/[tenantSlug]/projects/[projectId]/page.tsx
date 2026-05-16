import { PartnerAssessmentProjectRespondentsPage } from "@/features/assessment-projects/components/partner-assessment-project-respondents-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    tenantSlug: string;
    projectId: string;
  }>;
};

export default async function PartnerAssessmentProjectPage({
  params,
}: PageProps) {
  const { tenantSlug, projectId } = await params;

  return (
    <PartnerAssessmentProjectRespondentsPage
      tenantSlug={tenantSlug}
      projectId={projectId}
    />
  );
}