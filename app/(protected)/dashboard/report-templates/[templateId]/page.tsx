//app/(protected)/dashboard/report-templates/[templateId]/page.tsx

import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { ReportTemplateDetailsPage } from "@/features/report-builder/components/report-template-details-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;





type PageProps = {
  params: Promise<{
    templateId: string;
  }>;
  searchParams: Promise<{
    archivedTemplateVersions?: string;
  }>;
};


export default async function Page({ params, searchParams }: PageProps) {
  await requireSuperAdmin();

  const { templateId } = await params;
  const { archivedTemplateVersions } = await searchParams;

  return (
    <ReportTemplateDetailsPage
      reportTemplateId={templateId}
      showArchivedTemplateVersions={archivedTemplateVersions === "1"}
    />
  );
}