import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/shared/ui";
import { getMyAssessments } from "../api/my-assessment.queries";
import { QuestionnaireSelectionCard } from "./questionnaire-selection-card";

export async function MyAssessmentPage() {
  const assessment = await getMyAssessments();

  return (
    <>
      <PageHeader
        title={assessment.name}
        description={assessment.description}
        actions={<Badge variant="secondary">Panel respondenta</Badge>}
      />

      <main className="space-y-8">
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Zaproszenia do badań</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Badania przypisane do adresu e-mail Twojego konta.
            </p>
          </div>

          {assessment.invitedQuestionnaires.length === 0 ? (
            <EmptyState
              title="Brak zaproszeń"
              description="Nie znaleźliśmy aktywnych zaproszeń przypisanych do adresu e-mail Twojego konta."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {assessment.invitedQuestionnaires.map((questionnaire) => (
                <QuestionnaireSelectionCard
                  key={questionnaire.id}
                  questionnaire={questionnaire}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Kwestionariusze publiczne</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kwestionariusze dostępne bez indywidualnego zaproszenia.
            </p>
          </div>

          {assessment.publicQuestionnaires.length === 0 ? (
            <EmptyState
              title="Brak publicznych kwestionariuszy"
              description="Obecnie żaden kwestionariusz nie jest udostępniony publicznie."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {assessment.publicQuestionnaires.map((questionnaire) => (
                <QuestionnaireSelectionCard
                  key={questionnaire.id}
                  questionnaire={questionnaire}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}