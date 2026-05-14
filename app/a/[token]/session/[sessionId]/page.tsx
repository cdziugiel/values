// app/a/[token]/session/[sessionId]/page.tsx
import { AssessmentResponseForm } from "@/features/public-assessment";
import { resolveAssessmentSessionForm } from "@/server/assessment/resolve-assessment-session-form";



type PublicAssessmentSessionPageProps = {
  params: Promise<{
    token: string;
    sessionId: string;
  }>;
};

export default async function PublicAssessmentSessionPage({
  params,
}: PublicAssessmentSessionPageProps) {
  const { token, sessionId } = await params;

  const result = await resolveAssessmentSessionForm({
    token,
    sessionId,
  });

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
        <div className="rounded-2xl border bg-card p-8">
          <div className="text-sm font-medium text-muted-foreground">
            HUMANET VALUES
          </div>

          <h1 className="mt-4 text-3xl font-semibold">
            Sesja badania jest niedostępna
          </h1>

          <p className="mt-4 text-muted-foreground">{result.message}</p>
        </div>
      </main>
    );
  }

  const { data } = result;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <div className="space-y-8">
        <div className="rounded-2xl border bg-card p-8">
          <div className="text-sm font-medium text-muted-foreground">
            HUMANET VALUES
          </div>

          <h1 className="mt-4 text-3xl font-semibold">
            {data.project.name}
          </h1>

          {data.project.description ? (
            <p className="mt-4 text-muted-foreground">
              {data.project.description}
            </p>
          ) : null}

          <div className="mt-8 grid gap-4 rounded-xl border bg-muted/30 p-4 md:grid-cols-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Respondent
              </div>
              <div className="mt-1 font-medium">
                {data.respondent.displayName}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Status sesji
              </div>
              <div className="mt-1 font-medium">{data.session.status}</div>
            </div>

            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Liczba pytań
              </div>
              <div className="mt-1 font-medium">{data.items.length}</div>
            </div>
          </div>
        </div>

        <AssessmentResponseForm
          token={token}
          sessionId={sessionId}
          items={data.items}
        />
      </div>
    </main>
  );
}