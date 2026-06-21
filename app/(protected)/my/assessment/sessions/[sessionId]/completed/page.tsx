// app/(protected)/my/assessment/sessions/[sessionId]/completed/page.tsx

import Link from "next/link";
import { getMyAssessmentCompletedResult } from "@/features/my-assessment/api/my-assessment-result.queries";
import { MyAssessmentCompletedResultView } from "@/features/my-assessment/components/my-assessment-completed-result-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    sessionId: string;
  }>;
searchParams: Promise<{
  tenant?: string;
  projectQuestionnaireId?: string;
  questionnaireVersionId?: string;
}>;
};

export default async function Page({
  params,
  searchParams,
}: PageProps) {
  const { sessionId } = await params;
  const { tenant, projectQuestionnaireId, questionnaireVersionId } =
  await searchParams;

  if (!tenant) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
        <section className="rounded-2xl border bg-card p-8">
          <h1 className="text-2xl font-semibold">
            Brakuje informacji o partnerze
          </h1>

          <p className="mt-3 text-muted-foreground">
            Nie możemy wyświetlić wyniku, ponieważ w adresie brakuje parametru.
          </p>

          <Link
            href="/my/assessment"
            className="mt-6 inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do moich badań
          </Link>
        </section>
      </main>
    );
  }

const result = await getMyAssessmentCompletedResult({
  tenantSlug: tenant,
  sessionId,
  projectQuestionnaireId: projectQuestionnaireId ?? null,
  questionnaireVersionId: questionnaireVersionId ?? null,
});

  if (!result) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
        <section className="rounded-2xl border bg-card p-8">
          <h1 className="text-2xl font-semibold">
            Nie znaleziono wyniku badania
          </h1>

          <p className="mt-3 text-muted-foreground">
            Sesja nie istnieje albo nie masz do niej dostępu.
          </p>

          <Link
            href="/my/assessment"
            className="mt-6 inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do moich badań
          </Link>
        </section>
      </main>
    );
  }

  if (!result.payload) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
        <section className="rounded-2xl border bg-card p-8">
          <div className="text-sm font-medium text-muted-foreground">
            HUMANET VALUES
          </div>

          <h1 className="mt-4 text-3xl font-semibold">
            Badanie zostało zakończone
          </h1>

          <p className="mt-3 text-muted-foreground">
            Twoje odpowiedzi zostały zapisane, ale podsumowanie wyniku nie jest
            obecnie dostępne. Możesz wrócić do swoich badań i spróbować ponownie
            później.
          </p>

          <div className="mt-4 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
            <div>Sesja: {sessionId}</div>
            <div>Partner: {tenant}</div>
          </div>

          <Link
            href="/my/assessment"
            className="mt-6 inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do moich badań
          </Link>
        </section>
      </main>
    );
  }

  return (
<MyAssessmentCompletedResultView
  result={{
    tenantSlug: result.tenantSlug,
    sessionId: result.sessionId,
    payload: result.payload,

    projectQuestionnaireId:
      result.projectQuestionnaireId ?? null,

    questionnaireVersionId:
      result.questionnaireVersionId ?? null,
  }}
/>
  );
}