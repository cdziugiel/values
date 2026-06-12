// app/a/[token]/session/[sessionId]/questionnaire/[projectQuestionnaireId]/page.tsx

import Link from "next/link";

import { AssessmentResponseForm } from "@/features/public-assessment";
import { resolveAssessmentSessionQuestionnaireForm } from "@/server/assessment/resolve-assessment-session-questionnaire-form";

type PublicAssessmentQuestionnairePageProps = {
  params: Promise<{
    token: string;
    sessionId: string;
    projectQuestionnaireId: string;
  }>;
};

export default async function PublicAssessmentQuestionnairePage({
  params,
}: PublicAssessmentQuestionnairePageProps) {
  const { token, sessionId, projectQuestionnaireId } = await params;

  const result = await resolveAssessmentSessionQuestionnaireForm({
    token,
    sessionId,
    projectQuestionnaireId,
  });

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
        <div className="rounded-2xl border bg-card p-8">
          <div className="text-sm font-medium text-muted-foreground">
            HUMANET VALUES
          </div>

          <h1 className="mt-4 text-3xl font-semibold">
            Kwestionariusz jest niedostępny
          </h1>

          <p className="mt-4 text-muted-foreground">{result.message}</p>

          <Link
            href={`/a/${token}/session/${sessionId}`}
            className="mt-6 inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do listy kwestionariuszy
          </Link>
        </div>
      </main>
    );
  }

  const { data } = result;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <div className="space-y-8">
        <section className="rounded-2xl border bg-card p-8">
          <div className="text-sm font-medium text-muted-foreground">
            HUMANET VALUES
          </div>

          <h1 className="mt-4 text-3xl font-semibold">
            {data.questionnaire.questionnaireName}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {data.questionnaire.questionnaireVersionName}
          </p>

          <div className="mt-6">
            <Link
              href={`/a/${token}/session/${sessionId}`}
              className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
            >
              Wróć do listy kwestionariuszy
            </Link>
          </div>
        </section>

<AssessmentResponseForm
  token={token}
  sessionId={sessionId}
  projectQuestionnaireId={projectQuestionnaireId}
  items={data.items}
/>
      </div>
    </main>
  );
}