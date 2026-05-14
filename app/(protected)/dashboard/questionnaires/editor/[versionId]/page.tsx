import { QuestionnaireVersionEditorPage } from "@/features/questionnaire-admin";

type QuestionnaireVersionEditorRouteProps = {
  params: Promise<{
    versionId: string;
  }>;
};

export default async function QuestionnaireVersionEditorRoute({
  params,
}: QuestionnaireVersionEditorRouteProps) {
  const { versionId } = await params;

  return <QuestionnaireVersionEditorPage versionId={versionId} />;
}