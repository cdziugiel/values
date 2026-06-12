"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { reportAccessGrants } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";
import { requireSession } from "@/server/auth/require-session";
import { getComparisonSpecialReportUnlockOffer } from "./special-report-access.queries";

const unlockComparisonSpecialReportSchema = z.object({
  tenantSlug: z.string().min(1),
  productId: z.string().uuid(),
  reportTemplateVersionId: z.string().uuid(),
});

export type UnlockSpecialReportAccessState = {
  status: "idle" | "error";
  message: string;
};

function normalizeString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function buildCompareHref({
  productId,
  reportTemplateVersionId,
}: {
  productId: string;
  reportTemplateVersionId: string;
}) {
  return `/my/assessment/compare?product=${encodeURIComponent(
    productId,
  )}&reportTemplateVersionId=${encodeURIComponent(reportTemplateVersionId)}`;
}

export async function unlockComparisonSpecialReportAccessAction(
  _state: UnlockSpecialReportAccessState,
  formData: FormData,
): Promise<UnlockSpecialReportAccessState> {
  const parsed = unlockComparisonSpecialReportSchema.safeParse({
    tenantSlug: normalizeString(formData.get("tenantSlug")),
    productId: normalizeString(formData.get("productId")),
    reportTemplateVersionId: normalizeString(
      formData.get("reportTemplateVersionId"),
    ),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Nieprawidłowe dane odblokowania raportu.",
    };
  }

  const session = await requireSession();

  if (!session.user?.id || !session.user?.email) {
    return {
      status: "error",
      message: "Musisz być zalogowany, aby odblokować raport.",
    };
  }

  const offer = await getComparisonSpecialReportUnlockOffer({
    tenantSlug: parsed.data.tenantSlug,
    productId: parsed.data.productId,
    reportTemplateVersionId: parsed.data.reportTemplateVersionId,
  });

  if (!offer.ok) {
    return {
      status: "error",
      message: offer.message,
    };
  }

  const href = buildCompareHref({
    productId: offer.product.id,
    reportTemplateVersionId: offer.reportTemplateVersion.id,
  });


  const now = new Date();

  const validUntil = offer.product.validityDays
    ? new Date(now.getTime() + Number(offer.product.validityDays) * 24 * 60 * 60 * 1000)
    : null;

await controlDb.insert(reportAccessGrants).values({
  tenantSlug: offer.tenantSlug,

  productId: offer.product.id,
  reportTemplateId: offer.reportTemplate.id,
  reportTemplateVersionId: offer.reportTemplateVersion.id,

  userId: session.user.id,
  email: session.user.email,

  source: "purchase",

  status: "active",
  validFrom: now,
  validUntil,

  metadata: {
    placeholder: true,
    reportKind: "comparison",
    mode: "comparison",
    productCode: offer.product.code,
    productName: offer.product.name,
    unlockedFrom: "my_special_reports",
    unlockedAt: now.toISOString(),
  },

  createdBy: session.user.id,
  updatedBy: session.user.id,
});

  redirect(href);
}