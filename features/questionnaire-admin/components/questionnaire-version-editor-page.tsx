import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { PageHeader } from "@/shared/ui";

import { getQuestionnaireVersionEditorData } from "../api/questionnaire-admin.queries";
import { QuestionnaireDimensionsEditor } from "./questionnaire-dimensions-editor";
import { QuestionnairePagesEditor } from "./questionnaire-pages-editor";
import { QuestionnaireVersionPublishPanel } from "./questionnaire-version-publish-panel";

import { QuestionnaireVersionClonePanel } from "./questionnaire-version-clone-panel";

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
  const isDraft = data.version.status === "draft";
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

      <QuestionnaireVersionPublishPanel
        versionId={versionId}
        status={data.version.status}
      />

      {data.version.status !== "draft" ? (
        <QuestionnaireVersionClonePanel
          sourceVersionId={versionId}
          sourceVersion={data.version.version}
          sourceName={data.version.name}
          sourceStatus={data.version.status}
        />
      ) : null}
      {isDraft ? (
        <>
          <QuestionnaireDimensionsEditor
            versionId={versionId}
            dimensions={data.dimensions}
          />

          <QuestionnairePagesEditor
            versionId={data.version.id}
            pages={data.pages}
            dimensions={data.dimensions}
            items={data.items}
          />

        </>
      ) : (
        <section className="rounded-2xl border bg-muted/30 p-5">
          <h2 className="text-lg font-semibold">Wersja tylko do odczytu</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ta wersja kwestionariusza jest opublikowana lub archiwalna. Aby wprowadzić
            zmiany, utwórz nową wersję na podstawie tej wersji.
          </p>
        </section>
      )}
    </div>
  );
}