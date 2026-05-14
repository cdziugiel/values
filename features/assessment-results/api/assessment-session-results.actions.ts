"use server";

import { revalidatePath } from "next/cache";

import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";
import { calculateAssessmentSessionScores } from "@/server/assessment/calculate-assessment-session-scores";

export type RecalculateAssessmentSessionScoresState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function recalculateAssessmentSessionScoresAction(
  _previousState: RecalculateAssessmentSessionScoresState,
  formData: FormData,
): Promise<RecalculateAssessmentSessionScoresState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!tenantSlug || !sessionId) {
    return {
      status: "error",
      message: "Brak danych tenanta lub sesji.",
    };
  }

  try {
    const ctx = await requireTenantContext({ tenantSlug });

    if (!ctx.permissions.includes("assessment_project:read")) {
      return {
        status: "error",
        message: "Brak uprawnień do przeliczania wyników.",
      };
    }

    const db = await getTenantDb(ctx);

    const result = await calculateAssessmentSessionScores({
      db,
      sessionId,
    });

    revalidatePath(`/t/${tenantSlug}/assessment-sessions/${sessionId}/results`);

    return {
      status: "success",
      message: result.message,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się przeliczyć wyników sesji.",
    };
  }
}