import { QuestionnairePreviewPage } from "@/features/questionnaire-admin/components/questionnaire-preview-page";

type PageProps = {
  params: Promise<{
    versionId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { versionId } = await params;

  return <QuestionnairePreviewPage versionId={versionId} />;
}