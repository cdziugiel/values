// features/my-assessment/components/my-assessment-page.tsx

import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/shared/ui";
import { getMyAssessments } from "../api/my-assessment.queries";
import { QuestionnaireSelectionCard } from "./questionnaire-selection-card";

export async function MyAssessmentPage() {
  const assessment = await getMyAssessments();

  const allQuestionnaires = [
    ...assessment.invitedQuestionnaires,
    ...assessment.publicQuestionnaires,
  ];

  const inProgressQuestionnaires = allQuestionnaires.filter(
    (questionnaire) => questionnaire.status === "in_progress",
  );

  const completedQuestionnaires = allQuestionnaires.filter(
    (questionnaire) => questionnaire.status === "completed",
  );

  const invitedAvailableQuestionnaires = assessment.invitedQuestionnaires.filter(
    (questionnaire) => questionnaire.status === "available",
  );

  const publicAvailableQuestionnaires = assessment.publicQuestionnaires.filter(
    (questionnaire) => questionnaire.status === "available",
  );

  return (
    <>
      <PageHeader
        title={assessment.name}
        description={assessment.description}
        actions={<Badge variant="secondary">Panel respondenta</Badge>}
      />

      <main className="space-y-10">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5">
            <div className="text-xs uppercase text-muted-foreground">
              Rozpoczęte
            </div>
            <div className="mt-1 text-3xl font-semibold">
              {inProgressQuestionnaires.length}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Badania, do których możesz wrócić.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <div className="text-xs uppercase text-muted-foreground">
              Zakończone
            </div>
            <div className="mt-1 text-3xl font-semibold">
              {completedQuestionnaires.length}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Badania zapisane i przeliczone.
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-5">
            <div className="text-xs uppercase text-muted-foreground">
              Dostępne
            </div>
            <div className="mt-1 text-3xl font-semibold">
              {invitedAvailableQuestionnaires.length +
                publicAvailableQuestionnaires.length}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Zaproszenia i publiczne kwestionariusze.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Moje rozpoczęte badania</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kontynuuj badania, które zostały już rozpoczęte, ale nie są jeszcze
              zakończone.
            </p>
          </div>

          {inProgressQuestionnaires.length === 0 ? (
            <EmptyState
              title="Brak rozpoczętych badań"
              description="Nie masz obecnie żadnego badania w toku."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {inProgressQuestionnaires.map((questionnaire) => (
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
            <h2 className="text-xl font-semibold">Moje zakończone badania</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tu znajdziesz badania, które zostały już zakończone.
            </p>
          </div>

          {completedQuestionnaires.length === 0 ? (
            <EmptyState
              title="Brak zakończonych badań"
              description="Po zakończeniu badania pojawi się ono w tej sekcji."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {completedQuestionnaires.map((questionnaire) => (
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
            <h2 className="text-xl font-semibold">Zaproszenia do badań</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Badania przypisane do adresu e-mail Twojego konta.
            </p>
          </div>

          {invitedAvailableQuestionnaires.length === 0 ? (
            <EmptyState
              title="Brak aktywnych zaproszeń"
              description="Nie znaleźliśmy nowych zaproszeń przypisanych do adresu e-mail Twojego konta."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {invitedAvailableQuestionnaires.map((questionnaire) => (
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

          {publicAvailableQuestionnaires.length === 0 ? (
            <EmptyState
              title="Brak nowych publicznych kwestionariuszy"
              description="Obecnie nie ma publicznych kwestionariuszy, których jeszcze nie rozpocząłeś/aś."
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {publicAvailableQuestionnaires.map((questionnaire) => (
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