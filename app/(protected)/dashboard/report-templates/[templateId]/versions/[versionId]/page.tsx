// app/(protected)/dashboard/report-templates/[templateId]/versions/[versionId]/page.tsx

import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { ReportTemplateVersionEditorPage } from "@/features/report-builder/components/report-template-version-editor-page";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    templateId: string;
    versionId: string;
  }>;
};

export default async function ReportTemplateVersionPage({
  params,
}: PageProps) {
  await requireSuperAdmin();

  const { templateId, versionId } = await params;

  return (
    <ReportTemplateVersionEditorPage
      reportTemplateId={templateId}
      reportTemplateVersionId={versionId}
    />
  );
}