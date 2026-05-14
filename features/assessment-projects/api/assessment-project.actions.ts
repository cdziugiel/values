"use server";

import { revalidatePath } from "next/cache";

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

function validationMessage(issues: { message: string }[]) {
  return issues.map((issue) => issue.message).join(" ");
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