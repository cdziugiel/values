// app/(protected)/t/[tenantSlug]/assessment-projects/[projectId]/comparison/[reportTemplateVersionId]/configure/page.tsx

import { notFound } from "next/navigation";

import { ProjectComparisonReportPage } from "@/features/comparison-reports/components/project-comparison-report-page";
import { listProjectComparisonSubjects } from "@/features/comparison-reports/api/project-comparison-subjects.queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    tenantSlug: string;
    projectId: string;
    reportTemplateVersionId: string;
  }>;
  searchParams: Promise<{
    product?: string;
  }>;
};

export default async function ComparisonReportConfigurePage({
  params,
  searchParams,
}: PageProps) {
  const { tenantSlug, projectId, reportTemplateVersionId } = await params;
  const { product } = await searchParams;

  if (!product || !reportTemplateVersionId) {
    notFound();
  }

const comparisonData = await listProjectComparisonSubjects({
  tenantSlug,
  assessmentProjectId: projectId,
});

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
<ProjectComparisonReportPage
  subjects={comparisonData.subjects}
  questionnaires={comparisonData.questionnaires}
  tenantSlug={tenantSlug}
  projectId={projectId}
  productId={product}
  reportTemplateVersionId={reportTemplateVersionId}
/>
    </main>
  );
}