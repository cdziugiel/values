// app/(protected)/my/assessment/sessions/[sessionId]/page.tsx

export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { redirect } from "next/navigation";

import { resolveMyAssessmentSessionEntry } from "@/features/my-assessment/api/resolve-my-assessment-session-entry";

type PageProps = {
  params: Promise<{
    sessionId: string;
  }>;
  searchParams: Promise<{
    tenant?: string;
    questionnaireVersionId?: string;
  }>;
};

export default async function MyAssessmentSessionPage({
  params,
  searchParams,
}: PageProps) {
  const { sessionId } = await params;
  const { tenant, questionnaireVersionId } = await searchParams;

  const result = await resolveMyAssessmentSessionEntry({
    tenantSlug: tenant ?? "",
    sessionId,
    questionnaireVersionId: questionnaireVersionId ?? "",
  });

  if (!result.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
        <div className="rounded-2xl border bg-card p-8">
          <div className="text-sm font-medium text-muted-foreground">
            HUMANET VALUES
          </div>

          <h1 className="mt-4 text-3xl font-semibold">
            Nie można otworzyć badania
          </h1>

          <p className="mt-4 text-muted-foreground">{result.message}</p>

          <Link
            href="/my/assessment"
            className="mt-6 inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do moich badań
          </Link>
        </div>
      </main>
    );
  }

if (result.data.sessionStatus === "completed") {
  redirect(
    `/my/assessment/sessions/${sessionId}/completed?tenant=${result.data.tenantSlug}`,
  );
}

redirect(
  `/my/assessment/sessions/${sessionId}/questionnaire/${result.data.projectQuestionnaireId}?tenant=${result.data.tenantSlug}`,
);
}