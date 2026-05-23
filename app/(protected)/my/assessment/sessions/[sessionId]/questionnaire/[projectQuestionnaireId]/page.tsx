// app/(protected)/my/assessment/sessions/[sessionId]/questionnaire/[projectQuestionnaireId]/page.tsx

import Link from "next/link";

import { AssessmentResponseForm } from "@/features/public-assessment";
import { resolveMyAssessmentSessionQuestionnaireForm } from "@/features/my-assessment/api/resolve-my-assessment-session-questionnaire-form";
import { eq } from "drizzle-orm";

import { users } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";
import { getCurrentSession } from "@/server/auth/get-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    sessionId: string;
    projectQuestionnaireId: string;
  }>;
  searchParams: Promise<{
    tenant?: string;
  }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { sessionId, projectQuestionnaireId } = await params;
  const { tenant } = await searchParams;

  const session = await getCurrentSession();

  const currentUser = session?.user?.id
    ? await controlDb.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        id: true,
        globalRole: true,
        status: true,
      },
    })
    : null;

  const isSuperAdmin =
    currentUser?.status === "active" &&
    currentUser.globalRole === "SUPER_ADMIN";

  const result = await resolveMyAssessmentSessionQuestionnaireForm({
    tenantSlug: tenant ?? "",
    sessionId,
    projectQuestionnaireId,
  });

  if (!result.ok) {
    return (
      
    <div className="mx-auto flex  flex-col justify-center px-6 py-8">
        <div className="rounded-2xl border bg-card p-8">
          <div className="text-sm font-medium text-muted-foreground">
            HUMANET VALUES
          </div>

          <h1 className="mt-4 text-3xl font-semibold">
            Kwestionariusz jest niedostępny
          </h1>

          <p className="mt-4 text-muted-foreground">{result.message}</p>

          <Link
            href="/my/assessment"
            className="mt-6 inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do moich badań
          </Link>
        </div>
      </div>
    );
  }

  const { data } = result;

  return (
    
      <div className="mx-auto w-full ">
      <div className="">


        <AssessmentResponseForm
          mode="my-assessment"
          token=""
          tenantSlug={data.tenantSlug}
          sessionId={sessionId}
          projectQuestionnaireId={projectQuestionnaireId}
          items={data.items}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </div>
  );
}