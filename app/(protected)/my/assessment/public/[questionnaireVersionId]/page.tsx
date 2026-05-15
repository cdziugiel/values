export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";

import { startOrContinuePublicAssessmentSession } from "@/features/my-assessment/api/start-or-continue-public-assessment-session";

type PageProps = {
  params: Promise<{
    questionnaireVersionId: string;
  }>;
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { questionnaireVersionId } = await params;
  const { mode } = await searchParams;

  const result = await startOrContinuePublicAssessmentSession({
    questionnaireVersionId,
    forceNew: mode === "new",
  });

  redirect(result.href);
}