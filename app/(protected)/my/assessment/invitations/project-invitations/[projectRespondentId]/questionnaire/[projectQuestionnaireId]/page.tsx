import { redirect } from "next/navigation";

import { startOrContinueInvitedAssessmentSession } from "@/features/my-assessment/api/start-or-continue-invited-assessment-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    projectRespondentId: string;
    projectQuestionnaireId: string;
  }>;
  searchParams: Promise<{
    tenant?: string;
  }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { projectRespondentId, projectQuestionnaireId } = await params;
  const { tenant } = await searchParams;

  const result = await startOrContinueInvitedAssessmentSession({
    tenantSlug: tenant,
    projectRespondentId,
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
            Nie można otworzyć zaproszenia
          </h1>

          <p className="mt-4 text-muted-foreground">{result.message}</p>

          <a
            href="/my/assessment"
            className="mt-6 inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do moich badań
          </a>
        </div>
      </main>
    );
  }

  redirect(result.href);
}