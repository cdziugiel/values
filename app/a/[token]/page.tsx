import { resolveAssessmentAccessToken } from "@/server/assessment/resolve-assessment-access-token";
import { StartPublicAssessmentForm } from "@/features/public-assessment";

type AssessmentAccessPageProps = {
  params: Promise<{
    token: string;
  }>;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function getRespondentDisplayName(respondent: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  externalCode: string | null;
}) {
  const name = [respondent.firstName, respondent.lastName]
    .filter(Boolean)
    .join(" ");

  return name || respondent.email || respondent.externalCode || "Respondent";
}

export default async function AssessmentAccessPage({
  params,
}: AssessmentAccessPageProps) {
  const { token } = await params;

  const result = await resolveAssessmentAccessToken(token);

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
        <div className="rounded-2xl border bg-card p-8">
          <div className="text-sm font-medium text-muted-foreground">
            HUMANET VALUES
          </div>

          <h1 className="mt-4 text-3xl font-semibold">
            Link do badania jest niedostępny
          </h1>

          <p className="mt-4 text-muted-foreground">{result.message}</p>

          <p className="mt-6 text-sm text-muted-foreground">
            Jeśli uważasz, że to błąd, skontaktuj się z osobą prowadzącą
            badanie.
          </p>
        </div>
      </main>
    );
  }

  const { data } = result;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-10">
      <div className="rounded-2xl border bg-card p-8">
        <div className="text-sm font-medium text-muted-foreground">
          HUMANET VALUES
        </div>

        <h1 className="mt-4 text-3xl font-semibold">{data.project.name}</h1>

        {data.project.description ? (
          <p className="mt-4 text-muted-foreground">
            {data.project.description}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 rounded-xl border bg-muted/30 p-4 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Organizacja
            </div>
            <div className="mt-1 font-medium">{data.tenant.name}</div>
          </div>

          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Respondent
            </div>
            <div className="mt-1 font-medium">
              {getRespondentDisplayName(data.respondent)}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Status udziału
            </div>
            <div className="mt-1 font-medium">
              {data.projectRespondent.status}
            </div>
          </div>

          <div>
            <div className="text-xs uppercase text-muted-foreground">
              Link ważny do
            </div>
            <div className="mt-1 font-medium">
              {formatDate(data.accessLink.expiresAt)}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-dashed p-5">
          <h2 className="text-lg font-semibold">Ekran startu badania</h2>

          <p className="mt-2 text-sm text-muted-foreground">
            Link został poprawnie rozpoznany. W następnym kroku podłączymy tutaj
            wybór kwestionariuszy, sesję badania i właściwy formularz odpowiedzi.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
            <StartPublicAssessmentForm token={token} />
        </div>
      </div>
    </main>
  );
}