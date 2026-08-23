"use server";

// @humanet-normative-exclusion-v1
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { normativeProfiles } from "@/drizzle/schema/control";
import { writeSystemAuditLog } from "@/server/audit/write-system-audit-log";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { controlDb } from "@/server/db/control-db";

import type { NormativeProfileExclusionActionResult } from "../types/normative-admin.types";

const inputSchema = z.object({
  profileId: z.string().uuid(),
  intent: z.enum(["exclude", "restore"]),
  reason: z.string().trim().max(500).optional(),
});

export async function setNormativeProfileExclusionAction(
  input: unknown,
): Promise<NormativeProfileExclusionActionResult> {
  const admin = await requireSuperAdmin();
  const parsed = inputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Nieprawidłowe dane operacji.",
    };
  }

  const reason = parsed.data.reason?.trim() ?? "";

  if (parsed.data.intent === "exclude" && reason.length < 5) {
    return {
      status: "error",
      message: "Podaj krótki powód wyłączenia rekordu (minimum 5 znaków).",
    };
  }

  const [current] = await controlDb
    .select({
      id: normativeProfiles.id,
      excludedFromNorms: normativeProfiles.excludedFromNorms,
      normativeExclusionReason: normativeProfiles.normativeExclusionReason,
      normativeExcludedAt: normativeProfiles.normativeExcludedAt,
      normativeExcludedByUserId: normativeProfiles.normativeExcludedByUserId,
    })
    .from(normativeProfiles)
    .where(
      and(
        eq(normativeProfiles.id, parsed.data.profileId),
        isNull(normativeProfiles.deletedAt),
      ),
    )
    .limit(1);

  if (!current) {
    return {
      status: "error",
      message: "Nie znaleziono profilu normatywnego.",
    };
  }

  const shouldExclude = parsed.data.intent === "exclude";

  if (current.excludedFromNorms === shouldExclude) {
    return {
      status: "success",
      message: shouldExclude
        ? "Rekord jest już wyłączony z analiz."
        : "Rekord jest już włączony do analiz.",
    };
  }

  const now = new Date();

  try {
    const [updated] = await controlDb
      .update(normativeProfiles)
      .set({
        excludedFromNorms: shouldExclude,
        normativeExclusionReason: shouldExclude ? reason : null,
        normativeExcludedAt: shouldExclude ? now : null,
        normativeExcludedByUserId: shouldExclude ? admin.id : null,
        updatedAt: now,
        updatedBy: admin.id,
      })
      .where(
        and(
          eq(normativeProfiles.id, parsed.data.profileId),
          isNull(normativeProfiles.deletedAt),
        ),
      )
      .returning({
        id: normativeProfiles.id,
        excludedFromNorms: normativeProfiles.excludedFromNorms,
        normativeExclusionReason: normativeProfiles.normativeExclusionReason,
        normativeExcludedAt: normativeProfiles.normativeExcludedAt,
        normativeExcludedByUserId: normativeProfiles.normativeExcludedByUserId,
      });

    if (!updated) {
      return {
        status: "error",
        message: "Nie udało się zmienić statusu profilu.",
      };
    }

    await writeSystemAuditLog({
      actorUserId: admin.id,
      actorRole: "SUPER_ADMIN",
      action: shouldExclude
        ? "normative_profile.excluded_from_norms"
        : "normative_profile.restored_to_norms",
      entityType: "normative_profile",
      entityId: updated.id,
      before: {
        excludedFromNorms: current.excludedFromNorms,
        normativeExclusionReason: current.normativeExclusionReason,
        normativeExcludedAt: current.normativeExcludedAt?.toISOString() ?? null,
        normativeExcludedByUserId: current.normativeExcludedByUserId,
      },
      after: {
        excludedFromNorms: updated.excludedFromNorms,
        normativeExclusionReason: updated.normativeExclusionReason,
        normativeExcludedAt: updated.normativeExcludedAt?.toISOString() ?? null,
        normativeExcludedByUserId: updated.normativeExcludedByUserId,
      },
    });

    revalidatePath("/dashboard/normative-data");
    revalidatePath("/dashboard/normative-data/" + updated.id);

    return {
      status: "success",
      message: shouldExclude
        ? "Rekord został wyłączony z dalszych analiz normatywnych."
        : "Rekord został przywrócony do analiz normatywnych.",
    };
  } catch {
    return {
      status: "error",
      message: "Nie udało się zmienić statusu profilu. Spróbuj ponownie.",
    };
  }
}
