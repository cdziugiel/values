"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { assessmentProjectQuestionnaires } from "@/drizzle/schema/tenant-schema";
import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import {
  addAssessmentProjectQuestionnaire,
  archiveAssessmentProjectQuestionnaire,
} from "./assessment-project-questionnaire.mutations";
import {
  addAssessmentProjectQuestionnaireSchema,
  archiveAssessmentProjectQuestionnaireSchema,
} from "../forms/assessment-project-questionnaire.schema";

export type AssessmentProjectQuestionnaireActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const removeAssessmentProjectQuestionnaireSchema = z.object({
  tenantSlug: z.string().trim().min(2),
  assessmentProjectId: z.string().uuid(),
  projectQuestionnaireId: z.string().uuid(),
});

function validationMessage(issues: { message: string }[]) {
  return issues.map((issue) => issue.message).join(" ");
}

export async function addAssessmentProjectQuestionnaireAction(
  _previousState: AssessmentProjectQuestionnaireActionState,
  formData: FormData,
): Promise<AssessmentProjectQuestionnaireActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    assessmentProjectId: String(formData.get("assessmentProjectId") ?? ""),
    questionnaireId: String(formData.get("questionnaireId") ?? ""),
    questionnaireVersionId: String(formData.get("questionnaireVersionId") ?? ""),
  };

  const parsed = addAssessmentProjectQuestionnaireSchema.safeParse(rawInput);

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

    requirePermission(ctx, "assessment_project:update");

    const db = await getTenantDb(ctx);

    await addAssessmentProjectQuestionnaire({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/assessment-projects`);

    return {
      status: "success",
      message: "Kwestionariusz został przypisany do projektu.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się przypisać kwestionariusza.",
    };
  }
}

export async function archiveAssessmentProjectQuestionnaireAction(
  _previousState: AssessmentProjectQuestionnaireActionState,
  formData: FormData,
): Promise<AssessmentProjectQuestionnaireActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    assessmentProjectId: String(formData.get("assessmentProjectId") ?? ""),
    projectQuestionnaireId: String(
      formData.get("projectQuestionnaireId") ?? "",
    ),
  };

  const parsed =
    archiveAssessmentProjectQuestionnaireSchema.safeParse(rawInput);

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

    requirePermission(ctx, "assessment_project:update");

    const db = await getTenantDb(ctx);

    await archiveAssessmentProjectQuestionnaire({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/assessment-projects`);

    return {
      status: "success",
      message: "Kwestionariusz został odpięty od projektu.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się odpiąć kwestionariusza.",
    };
  }
}

export async function removeAssessmentProjectQuestionnaireAction(
  _previousState: AssessmentProjectQuestionnaireActionState,
  formData: FormData,
): Promise<AssessmentProjectQuestionnaireActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    assessmentProjectId: String(formData.get("assessmentProjectId") ?? ""),
    projectQuestionnaireId: String(
      formData.get("projectQuestionnaireId") ?? "",
    ),
  };

  const parsed = removeAssessmentProjectQuestionnaireSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }

  try {
    const ctx = await requireTenantContext({
      tenantSlug: parsed.data.tenantSlug,
    });

    requirePermission(ctx, "assessment_project:update");

    const db = await getTenantDb(ctx);

    const existing =
      await db.query.assessmentProjectQuestionnaires.findFirst({
        where: and(
          eq(
            assessmentProjectQuestionnaires.id,
            parsed.data.projectQuestionnaireId,
          ),
          eq(
            assessmentProjectQuestionnaires.assessmentProjectId,
            parsed.data.assessmentProjectId,
          ),
          isNull(assessmentProjectQuestionnaires.deletedAt),
        ),
      });

    if (!existing) {
      return {
        status: "error",
        message: "Nie znaleziono przypisania kwestionariusza do projektu.",
      };
    }

    await db
      .update(assessmentProjectQuestionnaires)
      .set({
        status: "archived",
        deletedAt: new Date(),
        updatedBy: ctx.userId,
        updatedAt: new Date(),
      })
      .where(
        eq(
          assessmentProjectQuestionnaires.id,
          parsed.data.projectQuestionnaireId,
        ),
      );

    revalidatePath(`/t/${ctx.tenantSlug}/assessment-projects`);
    revalidatePath(
      `/t/${ctx.tenantSlug}/assessment-projects/${parsed.data.assessmentProjectId}/results`,
    );

    return {
      status: "success",
      message: "Kwestionariusz został usunięty z badania.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się usunąć kwestionariusza z badania.",
    };
  }
}