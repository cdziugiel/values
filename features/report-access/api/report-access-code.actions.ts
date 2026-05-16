"use server";

import crypto from "crypto";
import { and, eq, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  reportAccessCodes,
  reportAccessGrants,
  reportAccessProducts,
  reportTemplateVersions,
} from "@/drizzle/schema";

import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";

import {
  getActiveReportAccessGrantForSession,
  getReportAccessOfferForCompletedSession,
} from "./report-access.queries";

export type RedeemReportAccessCodeState = {
  status: "idle" | "success" | "error";
  message: string;
};

function fail(message: string): RedeemReportAccessCodeState {
  return {
    status: "error",
    message,
  };
}

function normalizeCode(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function normalizeString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function hashAccessCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function buildReportHref({
  sessionId,
  reportTemplateVersionId,
  tenantSlug,
}: {
  sessionId: string;
  reportTemplateVersionId: string;
  tenantSlug: string;
}) {
  return `/my/assessment/sessions/${sessionId}/report/${reportTemplateVersionId}?tenant=${tenantSlug}`;
}

export async function redeemReportAccessCodeAction(
  _previousState: RedeemReportAccessCodeState,
  formData: FormData,
): Promise<RedeemReportAccessCodeState> {
  const authSession = await requireSession();

  const tenantSlug = normalizeString(formData.get("tenantSlug"));
  const sessionId = normalizeString(formData.get("sessionId"));
  const code = normalizeCode(formData.get("accessCode"));

  if (!tenantSlug || !sessionId) {
    return fail("Brakuje danych sesji lub tenanta.");
  }

  if (!code) {
    return fail("Wpisz kod dostępu.");
  }

  const offer = await getReportAccessOfferForCompletedSession({
    tenantSlug,
    sessionId,
  });

  if (!offer.ok) {
    return fail(offer.message);
  }

  const existingGrant =
    offer.existingGrant ??
    (await getActiveReportAccessGrantForSession({
      tenantSlug,
      sessionId,
      reportTemplateVersionId: offer.reportVersion.reportTemplateVersionId,
      userId: authSession.user.id,
    }));

  if (existingGrant) {
    redirect(
      buildReportHref({
        sessionId,
        tenantSlug,
        reportTemplateVersionId: existingGrant.reportTemplateVersionId,
      }),
    );
  }

  const codeHash = hashAccessCode(code);

  const accessCode = await controlDb.query.reportAccessCodes.findFirst({
    where: and(
      eq(reportAccessCodes.codeHash, codeHash),
      isNull(reportAccessCodes.deletedAt),
    ),
  });

  if (!accessCode) {
    return fail("Nie znaleziono takiego kodu dostępu.");
  }

  if (accessCode.status !== "available" && accessCode.status !== "assigned") {
    return fail("Ten kod został już wykorzystany albo nie jest aktywny.");
  }

  if (accessCode.tenantSlug && accessCode.tenantSlug !== tenantSlug) {
    return fail("Ten kod nie jest przypisany do tego tenanta.");
  }

  const now = new Date();

  if (accessCode.validFrom && accessCode.validFrom > now) {
    return fail("Ten kod nie jest jeszcze aktywny.");
  }

  if (accessCode.validUntil && accessCode.validUntil < now) {
    await controlDb
      .update(reportAccessCodes)
      .set({
        status: "expired",
        updatedAt: now,
        updatedBy: authSession.user.id,
      })
      .where(eq(reportAccessCodes.id, accessCode.id));

    return fail("Ten kod wygasł.");
  }

  if (
    accessCode.assignedToEmail &&
    authSession.user.email &&
    accessCode.assignedToEmail.trim().toLowerCase() !==
      authSession.user.email.trim().toLowerCase()
  ) {
    return fail("Ten kod jest przypisany do innego adresu e-mail.");
  }

  const product = await controlDb.query.reportAccessProducts.findFirst({
    where: and(
      eq(reportAccessProducts.id, accessCode.productId),
      eq(reportAccessProducts.status, "active"),
      isNull(reportAccessProducts.deletedAt),
    ),
  });

  if (!product) {
    return fail("Produkt powiązany z kodem nie jest aktywny.");
  }

  /**
   * Kod odblokowuje typ raportu, a nie dowolny raport.
   * Dlatego wymagamy zgodności z typem raportu wyliczonym dla sesji.
   */
  if (product.reportTemplateId !== offer.reportVersion.reportTemplateId) {
    return fail("Ten kod dotyczy innego typu raportu.");
  }

  const reportTemplateVersion = await controlDb.query.reportTemplateVersions.findFirst({
    where: and(
      eq(reportTemplateVersions.id, offer.reportVersion.reportTemplateVersionId),
      eq(reportTemplateVersions.status, "active"),
      isNull(reportTemplateVersions.deletedAt),
    ),
  });

  if (!reportTemplateVersion) {
    return fail("Aktywna wersja raportu nie jest już dostępna.");
  }

  const existingGrantByReportType =
    await controlDb.query.reportAccessGrants.findFirst({
      where: and(
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.assessmentSessionId, sessionId),
        eq(reportAccessGrants.reportTemplateId, product.reportTemplateId),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    });

  if (existingGrantByReportType) {
    redirect(
      buildReportHref({
        sessionId,
        tenantSlug,
        reportTemplateVersionId:
          existingGrantByReportType.reportTemplateVersionId,
      }),
    );
  }

  const validUntil =
    typeof product.validityDays === "number" && product.validityDays > 0
      ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
      : null;

  const [grant] = await controlDb
    .insert(reportAccessGrants)
    .values({
      source: "access_code",
      status: "active",

      productId: product.id,
      accessCodeId: accessCode.id,

      reportTemplateId: product.reportTemplateId,
      reportTemplateVersionId: reportTemplateVersion.id,

      tenantSlug,
      userId: authSession.user.id,
      email: authSession.user.email ?? null,

      assessmentSessionId: sessionId,

      validFrom: now,
      validUntil,

      metadata: {
        accessCodePreview: accessCode.codePreview,
        productCode: product.code,
        productName: product.name,
      },

      createdAt: now,
      updatedAt: now,
      createdBy: authSession.user.id,
      updatedBy: authSession.user.id,
    })
    .returning({
      id: reportAccessGrants.id,
      reportTemplateVersionId: reportAccessGrants.reportTemplateVersionId,
    });

  await controlDb
    .update(reportAccessCodes)
    .set({
      status: "redeemed",
      redeemedByUserId: authSession.user.id,
      redeemedAt: now,
      assessmentSessionId: sessionId,
      updatedAt: now,
      updatedBy: authSession.user.id,
    })
    .where(eq(reportAccessCodes.id, accessCode.id));

  revalidatePath("/my/assessment");

  redirect(
    buildReportHref({
      sessionId,
      tenantSlug,
      reportTemplateVersionId: grant.reportTemplateVersionId,
    }),
  );
}