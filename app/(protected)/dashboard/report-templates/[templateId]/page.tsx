//app/(protected)/dashboard/report-templates/[templateId]/page.tsx

import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { ReportTemplateDetailsPage } from "@/features/report-builder/components/report-template-details-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    templateId: string;
  }>;
};

export default async function ReportTemplatePage({ params }: PageProps) {
  await requireSuperAdmin();

  const { templateId } = await params;

  return <ReportTemplateDetailsPage reportTemplateId={templateId} />;
}