import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { PageHeader } from "@/shared/ui";

import { getQuestionnaireVersionEditorData } from "../api/questionnaire-admin.queries";
import { QuestionnaireDimensionsEditor } from "./questionnaire-dimensions-editor";
import { QuestionnaireItemsEditor } from "./questionnaire-items-editor";
import { QuestionnairePagesEditor } from "./questionnaire-pages-editor";

type QuestionnaireVersionEditorPageProps = {
  versionId: string;
};

export async function QuestionnaireVersionEditorPage({
  versionId,
}: QuestionnaireVersionEditorPageProps) {
  await requireSuperAdmin();

  const data = await getQuestionnaireVersionEditorData(versionId);

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Nie znaleziono wersji"
          description="Wersja kwestionariusza nie istnieje albo została usunięta."
        />

        <Button asChild variant="outline">
          <Link href="/dashboard/questionnaires">Wróć</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Edytor: ${data.version.name}`}
        description={`Wersja ${data.version.version}. Zarządzanie stronami, wymiarami, itemami i scoringiem.`}
        actions={
          <Button asChild variant="outline">
            <Link href="/dashboard/questionnaires">Wróć do listy</Link>
          </Button>
        }
      />

      <QuestionnairePagesEditor
        versionId={versionId}
        pages={data.pages}
      />

      <QuestionnaireDimensionsEditor
        versionId={versionId}
        dimensions={data.dimensions}
      />

      <QuestionnaireItemsEditor
        versionId={versionId}
        pages={data.pages}
        dimensions={data.dimensions}
        items={data.items}
      />
    </div>
  );
}