import { redirect } from "next/navigation";

import { startOrContinuePublicAssessmentSession } from "@/features/my-assessment/api/start-or-continue-public-assessment-session";

type PageProps = {
  params: Promise<{
    questionnaireVersionId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { questionnaireVersionId } = await params;

  const result = await startOrContinuePublicAssessmentSession({
    questionnaireVersionId,
  });

  redirect(result.href);
}