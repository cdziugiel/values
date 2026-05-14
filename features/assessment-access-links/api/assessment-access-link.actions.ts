"use server";

import { revalidatePath } from "next/cache";

import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import {
  createAssessmentAccessLink,
  revokeAssessmentAccessLink,
} from "./assessment-access-link.mutations";
import {
  createAssessmentAccessLinkSchema,
  revokeAssessmentAccessLinkSchema,
} from "../forms/assessment-access-link.schema";

export type AssessmentAccessLinkActionState = {
  status: "idle" | "success" | "error";
  message: string;
  url?: string;
};

function validationMessage(issues: { message: string }[]) {
  return issues.map((issue) => issue.message).join(" ");
}

export async function createAssessmentAccessLinkAction(
  _previousState: AssessmentAccessLinkActionState,
  formData: FormData,
): Promise<AssessmentAccessLinkActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    projectRespondentId: String(formData.get("projectRespondentId") ?? ""),
    assessmentProjectId: String(formData.get("assessmentProjectId") ?? ""),
  };

  const parsed = createAssessmentAccessLinkSchema.safeParse(rawInput);

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

    const result = await createAssessmentAccessLink({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(
      `/t/${ctx.tenantSlug}/assessment-projects/${parsed.data.assessmentProjectId}/respondents`,
    );

    return {
      status: "success",
      message: "Link do badania został wygenerowany.",
      url: result.url,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się wygenerować linku do badania.",
    };
  }
}

export async function revokeAssessmentAccessLinkAction(
  _previousState: AssessmentAccessLinkActionState,
  formData: FormData,
): Promise<AssessmentAccessLinkActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    accessLinkId: String(formData.get("accessLinkId") ?? ""),
    assessmentProjectId: String(formData.get("assessmentProjectId") ?? ""),
  };

  const parsed = revokeAssessmentAccessLinkSchema.safeParse(rawInput);

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

    await revokeAssessmentAccessLink({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(
      `/t/${ctx.tenantSlug}/assessment-projects/${parsed.data.assessmentProjectId}/respondents`,
    );

    return {
      status: "success",
      message: "Link do badania został unieważniony.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się unieważnić linku.",
    };
  }
}