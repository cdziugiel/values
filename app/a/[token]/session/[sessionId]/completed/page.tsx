import { resolveCompletedAssessmentSession } from "@/server/assessment/resolve-completed-assessment-session";

type CompletedAssessmentSessionPageProps = {
  params: Promise<{
    token: string;
    sessionId: string;
  }>;
};

export default async function CompletedAssessmentSessionPage({
  params,
}: CompletedAssessmentSessionPageProps) {
  const { token, sessionId } = await params;

  const result = await resolveCompletedAssessmentSession({
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
            Nie znaleziono zakończonego badania
          </h1>

          <p className="mt-4 text-muted-foreground">{result.message}</p>
        </div>
      </main>
    );
  }

  const { data } = result;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
      <div className="rounded-2xl border bg-card p-8">
        <div className="text-sm font-medium text-muted-foreground">
          HUMANET VALUES
        </div>

        <h1 className="mt-4 text-3xl font-semibold">
          Dziękujemy za udział w badaniu
        </h1>

        <p className="mt-4 text-muted-foreground">
          Twoje odpowiedzi zostały zapisane. Możesz bezpiecznie zamknąć tę stronę.
        </p>

        <div className="mt-8 rounded-xl border bg-muted/30 p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Projekt
          </div>
          <div className="mt-1 font-medium">{data.project.name}</div>

          <div className="mt-4 text-xs uppercase text-muted-foreground">
            Status sesji
          </div>
          <div className="mt-1 font-medium">{data.session.status}</div>

          <div className="mt-4 text-xs uppercase text-muted-foreground">
            Zakończono
          </div>
          <div className="mt-1 font-medium">
            {new Intl.DateTimeFormat("pl-PL", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(data.session.completedAt)}
          </div>
        </div>
      </div>
    </main>
  );
}