"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";

import { assessmentProjectQuestionnaires } from "@/drizzle/schema/tenant-schema";
import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";


import {
  archiveAssessmentProject,
  createAssessmentProject,
  updateAssessmentProject,
} from "./assessment-project.mutations";
import {
  archiveAssessmentProjectSchema,
  createAssessmentProjectSchema,
  updateAssessmentProjectSchema,
} from "../forms/assessment-project.schema";

export type AssessmentProjectActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type AssessmentProjectQuestionnaireActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const removeAssessmentProjectQuestionnaireSchema = z.object({
  tenantSlug: z.string().trim().min(2),
  assessmentProjectId: z.string().uuid(),
  projectQuestionnaireId: z.string().uuid(),
});


function validationMessage(
  issues: {
    path: PropertyKey[];
    message: string;
  }[],
) {
  return issues
    .map((issue) => {
      const path = issue.path
        .map((segment) =>
          typeof segment === "symbol" ? segment.toString() : String(segment),
        )
        .join(".");

      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join(" ");
}

export async function createAssessmentProjectAction(
  _previousState: AssessmentProjectActionState,
  formData: FormData,
): Promise<AssessmentProjectActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    clientOrganizationId: String(formData.get("clientOrganizationId") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
  };

  const parsed = createAssessmentProjectSchema.safeParse(rawInput);

  if (!parsed.success) {
    console.error("Invalid assessment project input", {
      rawInput,
      issues: parsed.error.issues,
    });

    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const ctx = await requireTenantContext({
      tenantSlug: parsed.data.tenantSlug,
    });

    requirePermission(ctx, "assessment_project:create");

    const db = await getTenantDb(ctx);

    await createAssessmentProject({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/assessment-projects`);

    return {
      status: "success",
      message: "Projekt badawczy został utworzony.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się utworzyć projektu badawczego.",
    };
  }
}

export async function updateAssessmentProjectAction(
  _previousState: AssessmentProjectActionState,
  formData: FormData,
): Promise<AssessmentProjectActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    assessmentProjectId: String(formData.get("assessmentProjectId") ?? ""),
    clientOrganizationId: String(formData.get("clientOrganizationId") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    status: String(formData.get("status") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
  };

  const parsed = updateAssessmentProjectSchema.safeParse(rawInput);

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

    await updateAssessmentProject({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/assessment-projects`);

    return {
      status: "success",
      message: "Projekt badawczy został zaktualizowany.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zaktualizować projektu badawczego.",
    };
  }
}

export async function archiveAssessmentProjectAction(
  _previousState: AssessmentProjectActionState,
  formData: FormData,
): Promise<AssessmentProjectActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    assessmentProjectId: String(formData.get("assessmentProjectId") ?? ""),
  };

  const parsed = archiveAssessmentProjectSchema.safeParse(rawInput);

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

    await archiveAssessmentProject({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/assessment-projects`);

    return {
      status: "success",
      message: "Projekt badawczy został zarchiwizowany.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zarchiwizować projektu badawczego.",
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