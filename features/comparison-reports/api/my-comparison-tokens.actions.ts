"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  comparisonShares,
  respondentIdentities,
} from "@/drizzle/schema/tenant-schema";

import { requireSession } from "@/server/auth/require-session";
import { getMyAssessmentRuntime } from "@/features/my-assessment/api/my-assessment-runtime";

const revokeComparisonShareSchema = z.object({
  tenantSlug: z.string().min(1),
  shareId: z.string().uuid(),
});

export type RevokeComparisonShareState = {
  status: "idle" | "success" | "error";
  message: string;
};

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  return normalized || null;
}

export async function revokeMyComparisonShareAction(
  _state: RevokeComparisonShareState,
  formData: FormData,
): Promise<RevokeComparisonShareState> {
  const parsed = revokeComparisonShareSchema.safeParse({
    tenantSlug: String(formData.get("tenantSlug") ?? "").trim(),
    shareId: String(formData.get("shareId") ?? "").trim(),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Nieprawidłowe dane tokenu.",
    };
  }

  const session = await requireSession();
  const email = normalizeEmail(session.user?.email);

  if (!session.user?.id || !email) {
    return {
      status: "error",
      message: "Musisz być zalogowany, aby unieważnić token.",
    };
  }

  const runtime = await getMyAssessmentRuntime({
    userId: session.user.id,
    tenantSlug: parsed.data.tenantSlug,
  });

  if (!runtime) {
    return {
      status: "error",
      message: "Nie udało się odnaleźć środowiska badania.",
    };
  }

  /**
   * Najpierw sprawdzamy własność tokenu przez respondent_identities.email.
   * Nie możemy użyć runtime.respondent ani respondents.userId, bo ich nie ma.
   */
  const [ownedShare] = await runtime.db
    .select({
      id: comparisonShares.id,
    })
    .from(comparisonShares)
    .innerJoin(
      respondentIdentities,
      eq(respondentIdentities.respondentId, comparisonShares.respondentId),
    )
    .where(
      and(
        eq(comparisonShares.id, parsed.data.shareId),
        eq(comparisonShares.status, "active"),
        eq(respondentIdentities.email, email),
        isNull(comparisonShares.deletedAt),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .limit(1);

  if (!ownedShare) {
    return {
      status: "error",
      message:
        "Nie znaleziono aktywnego tokenu albo token został już unieważniony.",
    };
  }

  const now = new Date();

  const [updated] = await runtime.db
    .update(comparisonShares)
    .set({
      status: "revoked",
      revokedAt: now,
      updatedAt: now,
      updatedBy: session.user.id,
    })
    .where(
      and(
        eq(comparisonShares.id, ownedShare.id),
        eq(comparisonShares.status, "active"),
        isNull(comparisonShares.deletedAt),
      ),
    )
    .returning({
      id: comparisonShares.id,
    });

  if (!updated) {
    return {
      status: "error",
      message:
        "Nie znaleziono aktywnego tokenu albo token został już unieważniony.",
    };
  }

  revalidatePath("/my/assessment/compare");

  return {
    status: "success",
    message: "Token został unieważniony.",
  };
}


const renameComparisonShareSchema = z.object({
  tenantSlug: z.string().min(1),
  shareId: z.string().uuid(),
  label: z.string().trim().max(120).optional(),
});

export type RenameComparisonShareState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function renameMyComparisonShareAction(
  _state: RenameComparisonShareState,
  formData: FormData,
): Promise<RenameComparisonShareState> {
  const parsed = renameComparisonShareSchema.safeParse({
    tenantSlug: String(formData.get("tenantSlug") ?? "").trim(),
    shareId: String(formData.get("shareId") ?? "").trim(),
    label: String(formData.get("label") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Nieprawidłowe dane nazwy tokenu.",
    };
  }

  const session = await requireSession();
  const email = normalizeEmail(session.user?.email);

  if (!session.user?.id || !email) {
    return {
      status: "error",
      message: "Musisz być zalogowany, aby zmienić nazwę tokenu.",
    };
  }

  const runtime = await getMyAssessmentRuntime({
    userId: session.user.id,
    tenantSlug: parsed.data.tenantSlug,
  });

  if (!runtime) {
    return {
      status: "error",
      message: "Nie udało się odnaleźć środowiska badania.",
    };
  }

  const [ownedShare] = await runtime.db
    .select({
      id: comparisonShares.id,
    })
    .from(comparisonShares)
    .innerJoin(
      respondentIdentities,
      eq(respondentIdentities.respondentId, comparisonShares.respondentId),
    )
    .where(
      and(
        eq(comparisonShares.id, parsed.data.shareId),
        eq(respondentIdentities.email, email),
        isNull(comparisonShares.deletedAt),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .limit(1);

  if (!ownedShare) {
    return {
      status: "error",
      message: "Nie znaleziono tokenu.",
    };
  }

  const now = new Date();

  await runtime.db
    .update(comparisonShares)
    .set({
      label: parsed.data.label ?? null,
      updatedAt: now,
      updatedBy: session.user.id,
    })
    .where(eq(comparisonShares.id, ownedShare.id));

  revalidatePath("/my/assessment/compare");

  return {
    status: "success",
    message: "Nazwa tokenu została zapisana.",
  };
}