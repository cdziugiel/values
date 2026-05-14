import Link from "next/link";

import type { AssessmentSessionOverviewQuestionnaire } from "@/server/assessment/resolve-assessment-session-overview";

import { CompleteAssessmentSessionForm } from "./complete-assessment-session-form";

type PublicAssessmentSessionOverviewProps = {
  token: string;
  sessionId: string;
  project: {
    name: string;
    description: string | null;
  };
  respondent: {
    displayName: string;
    email: string | null;
  };
  session: {
    status: string;
  };
  questionnaires: AssessmentSessionOverviewQuestionnaire[];
  allRequiredCompleted: boolean;
};

function statusLabel(questionnaire: AssessmentSessionOverviewQuestionnaire) {
  if (questionnaire.isCompleted) {
    return "Ukończony";
  }

  if (questionnaire.answeredItemsCount > 0) {
    return "W trakcie";
  }

  return "Nierozpoczęty";
}

export function PublicAssessmentSessionOverview({
  token,
  sessionId,
  project,
  respondent,
  session,
  questionnaires,
  allRequiredCompleted,
}: PublicAssessmentSessionOverviewProps) {
  const canComplete = session.status === "in_progress" && allRequiredCompleted;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border bg-card p-8">
        <div className="text-sm font-medium text-muted-foreground">
          HUMANET VALUES
        </div>

        <h1 className="mt-4 text-3xl font-semibold">{project.name}</h1>

        {project.description ? (
          <p className="mt-4 text-muted-foreground">{project.description}</p>
        ) : null}

        <div className="mt-8 grid gap-4 rounded-xl border bg-muted/30 p-4 md:grid-cols-3">
          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Respondent
            </div>
            <div className="mt-1 font-medium">{respondent.displayName}</div>
            {respondent.email ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {respondent.email}
              </div>
            ) : null}
          </div>

          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Status sesji
            </div>
            <div className="mt-1 font-medium">{session.status}</div>
          </div>

          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Kwestionariusze
            </div>
            <div className="mt-1 font-medium">{questionnaires.length}</div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Wybierz kwestionariusz</h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Możesz wypełniać kwestionariusze w dowolnej kolejności. Odpowiedzi są
          zapisywane podczas przechodzenia między stronami.
        </p>

        <div className="mt-6 space-y-3">
          {questionnaires.map((questionnaire) => (
            <Link
              key={questionnaire.projectQuestionnaireId}
              href={`/a/${token}/session/${sessionId}/questionnaire/${questionnaire.projectQuestionnaireId}`}
              className="block rounded-xl border bg-background p-4 transition hover:bg-muted/40"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-base font-semibold">
                    {questionnaire.questionnaireName}
                  </div>

                  <div className="mt-1 text-sm text-muted-foreground">
                    {questionnaire.questionnaireVersionName}
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    Odpowiedzi: {questionnaire.answeredItemsCount}/
                    {questionnaire.totalItemsCount}
                    {questionnaire.requiredItemsCount > 0
                      ? ` · wymagane: ${questionnaire.answeredRequiredItemsCount}/${questionnaire.requiredItemsCount}`
                      : ""}
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 md:items-end">
                  <span className="rounded-full border px-3 py-1 text-xs font-medium">
                    {statusLabel(questionnaire)}
                  </span>

                  <span className="text-sm font-medium">
                    {questionnaire.completionPercent}%
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Zakończenie badania</h2>

        {canComplete ? (
          <div className="mt-4">
            <CompleteAssessmentSessionForm token={token} sessionId={sessionId} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Badanie będzie można zakończyć po uzupełnieniu wszystkich wymaganych
            kwestionariuszy.
          </p>
        )}
      </section>
    </div>
  );
}