"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/server/auth/require-super-admin";

import {
  assignReportTemplateToQuestionnaireVersionAsSuperAdmin,
  removeReportTemplateFromQuestionnaireVersionAsSuperAdmin,
} from "./questionnaire-report-template.mutations";

export type QuestionnaireReportTemplateActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const ok = (message: string): QuestionnaireReportTemplateActionState => ({
  status: "success",
  message,
});

const fail = (error: unknown): QuestionnaireReportTemplateActionState => ({
  status: "error",
  message:
    error instanceof Error
      ? error.message
      : "Operacja nie powiodła się.",
});

export async function assignReportTemplateToQuestionnaireVersionAction(
  _previousState: QuestionnaireReportTemplateActionState,
  formData: FormData,
): Promise<QuestionnaireReportTemplateActionState> {
  const actor = await requireSuperAdmin();

  const questionnaireVersionId = String(
    formData.get("questionnaireVersionId") ?? "",
  );

  const reportTemplateVersionId = String(
    formData.get("reportTemplateVersionId") ?? "",
  );

  if (!questionnaireVersionId) {
    return {
      status: "error",
      message: "Brakuje identyfikatora wersji kwestionariusza.",
    };
  }

  if (!reportTemplateVersionId) {
    return {
      status: "error",
      message: "Wybierz wersję template’u raportu.",
    };
  }

  try {
    await assignReportTemplateToQuestionnaireVersionAsSuperAdmin({
      actorUserId: actor.id,
      questionnaireVersionId,
      reportTemplateVersionId,
    });

    revalidatePath(`/dashboard/questionnaires/editor/${questionnaireVersionId}`);

    return ok("Template raportu został przypisany do wersji kwestionariusza.");
  } catch (error) {
    return fail(error);
  }
}

export async function removeReportTemplateFromQuestionnaireVersionAction(
  _previousState: QuestionnaireReportTemplateActionState,
  formData: FormData,
): Promise<QuestionnaireReportTemplateActionState> {
  const actor = await requireSuperAdmin();

  const questionnaireVersionId = String(
    formData.get("questionnaireVersionId") ?? "",
  );

  if (!questionnaireVersionId) {
    return {
      status: "error",
      message: "Brakuje identyfikatora wersji kwestionariusza.",
    };
  }

  try {
    await removeReportTemplateFromQuestionnaireVersionAsSuperAdmin({
      actorUserId: actor.id,
      questionnaireVersionId,
    });

    revalidatePath(`/dashboard/questionnaires/editor/${questionnaireVersionId}`);

    return ok("Template raportu został odpięty od wersji kwestionariusza.");
  } catch (error) {
    return fail(error);
  }
}