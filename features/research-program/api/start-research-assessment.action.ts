"use server";

import { redirect } from "next/navigation";

import { startOrContinuePublicAssessmentSession } from "@/features/my-assessment/api/start-or-continue-public-assessment-session";
import { getPurchaseFlowConfig } from "@/features/purchase-flow/config/purchase-flow.config";
import { reportTypeSchema } from "@/features/purchase-flow/forms/start-flow.schema";
import { resolvePublicQuestionnaireVersionByCode } from "@/features/purchase-flow/api/purchase-flow.queries";

function read(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function startResearchAssessmentAction(formData: FormData) {
  const reportType = reportTypeSchema.parse(read(formData, "reportType"));
  const config = getPurchaseFlowConfig();
  const report = config.reports[reportType];

  const questionnaire = await resolvePublicQuestionnaireVersionByCode(
    report.questionnaireCode,
  );

  if (!questionnaire) {
    throw new Error("Wybrany kwestionariusz nie ma aktywnej publicznej wersji.");
  }

  const started = await startOrContinuePublicAssessmentSession({
    questionnaireVersionId: questionnaire.questionnaireVersionId,
  });

  const target = new URL(started.href, "https://values.humanet.me");
  target.searchParams.set("ref", "research_program");

  redirect(`${target.pathname}${target.search}`);
}
