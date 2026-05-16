"use server";

import { revalidatePath } from "next/cache";

import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import {
  addAssessmentProjectRespondent,
  archiveAssessmentProjectRespondent,
  updateAssessmentProjectRespondent,
} from "./assessment-project-respondent.mutations";
import {
  addAssessmentProjectRespondentSchema,
  archiveAssessmentProjectRespondentSchema,
  updateAssessmentProjectRespondentSchema,
} from "../forms/assessment-project-respondent.schema";

export type AssessmentProjectRespondentActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function validationMessage(issues: { message: string }[]) {
  return issues.map((issue) => issue.message).join(" ");
}

export async function addAssessmentProjectRespondentAction(
  _previousState: AssessmentProjectRespondentActionState,
  formData: FormData,
): Promise<AssessmentProjectRespondentActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    assessmentProjectId: String(formData.get("assessmentProjectId") ?? ""),
    respondentId: String(formData.get("respondentId") ?? ""),
  };

  const parsed = addAssessmentProjectRespondentSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const ctx = await requireTenantContext({
      tenantSlug: parsed.data.tenantSlug,
    });

    requirePermission(ctx, "assessment_project_respondent:create");

    const db = await getTenantDb(ctx);

    await addAssessmentProjectRespondent({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(
      `/t/${ctx.tenantSlug}/assessment-projects/${parsed.data.assessmentProjectId}/respondents`,
    );

    return {
      status: "success",
      message: "Respondent został dodany do projektu.",
    };
  } catch (error) {
    const message =
      error instanceof Error &&
        error.message === "Respondent jest już przypisany do tego projektu."
        ? error.message
        : "Nie udało się dodać respondenta do projektu. Sprawdź, czy respondent nie jest już przypisany do tego badania.";

    return {
      status: "error",
      message,
    };
  }
}

export async function updateAssessmentProjectRespondentAction(
  _previousState: AssessmentProjectRespondentActionState,
  formData: FormData,
): Promise<AssessmentProjectRespondentActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    projectRespondentId: String(formData.get("projectRespondentId") ?? ""),
    assessmentProjectId: String(formData.get("assessmentProjectId") ?? ""),
    status: String(formData.get("status") ?? ""),
  };

  const parsed = updateAssessmentProjectRespondentSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const ctx = await requireTenantContext({
      tenantSlug: parsed.data.tenantSlug,
    });

    requirePermission(ctx, "assessment_project_respondent:update");

    const db = await getTenantDb(ctx);

    await updateAssessmentProjectRespondent({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(
      `/t/${ctx.tenantSlug}/assessment-projects/${parsed.data.assessmentProjectId}/respondents`,
    );

    return {
      status: "success",
      message: "Status uczestnika projektu został zaktualizowany.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zaktualizować uczestnika projektu.",
    };
  }
}

export async function archiveAssessmentProjectRespondentAction(
  _previousState: AssessmentProjectRespondentActionState,
  formData: FormData,
): Promise<AssessmentProjectRespondentActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    projectRespondentId: String(formData.get("projectRespondentId") ?? ""),
    assessmentProjectId: String(formData.get("assessmentProjectId") ?? ""),
  };

  const parsed = archiveAssessmentProjectRespondentSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const ctx = await requireTenantContext({
      tenantSlug: parsed.data.tenantSlug,
    });

    requirePermission(ctx, "assessment_project_respondent:update");

    const db = await getTenantDb(ctx);

    await archiveAssessmentProjectRespondent({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(
      `/t/${ctx.tenantSlug}/assessment-projects/${parsed.data.assessmentProjectId}/respondents`,
    );

    return {
      status: "success",
      message: "Uczestnik projektu został zarchiwizowany.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zarchiwizować uczestnika projektu.",
    };
  }
}