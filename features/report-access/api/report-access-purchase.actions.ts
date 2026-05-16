"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

import {
  reportAccessGrants,
  reportAccessOrderItems,
  reportAccessOrders,
} from "@/drizzle/schema";

import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";

import {
  getActiveReportAccessGrantForSession,
  getReportAccessOfferForCompletedSession,
} from "./report-access.queries";

export type UnlockReportAccessActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function fail(message: string): UnlockReportAccessActionState {
  return {
    status: "error",
    message,
  };
}

function normalizeString(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function moneyToNumber(value: unknown) {
  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function moneyString(value: unknown) {
  return moneyToNumber(value).toFixed(2);
}

function calculateVatAmount({
  priceNet,
  priceGross,
}: {
  priceNet: unknown;
  priceGross: unknown;
}) {
  const net = moneyToNumber(priceNet);
  const gross = moneyToNumber(priceGross);
  const vat = gross - net;

  return Math.max(vat, 0).toFixed(2);
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

export async function unlockReportAccessPlaceholderAction(
  _previousState: UnlockReportAccessActionState,
  formData: FormData,
): Promise<UnlockReportAccessActionState> {
  const authSession = await requireSession();

  const tenantSlug = normalizeString(formData.get("tenantSlug"));
  const sessionId = normalizeString(formData.get("sessionId"));

  if (!tenantSlug || !sessionId) {
    return fail("Brakuje danych sesji lub tenanta.");
  }

  const offer = await getReportAccessOfferForCompletedSession({
    tenantSlug,
    sessionId,
  });

  if (!offer.ok) {
    return fail(offer.message);
  }

  if (!offer.product) {
    return fail("Dla tego raportu nie ma aktywnego produktu sprzedażowego.");
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

  /**
   * Dodatkowe zabezpieczenie:
   * ponieważ unikalność grantu masz po:
   * assessmentSessionId + reportTemplateId + active,
   * sprawdzamy też po typie raportu.
   */
  const existingGrantByReportType =
    await controlDb.query.reportAccessGrants.findFirst({
      where: and(
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.assessmentSessionId, sessionId),
        eq(reportAccessGrants.reportTemplateId, offer.reportVersion.reportTemplateId),
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

  const now = new Date();

  const totalNet = moneyString(offer.product.priceNet);
  const totalGross = moneyString(offer.product.priceGross);
  const totalVat = calculateVatAmount({
    priceNet: offer.product.priceNet,
    priceGross: offer.product.priceGross,
  });

  const [order] = await controlDb
    .insert(reportAccessOrders)
    .values({
      buyerType: "user",

      tenantSlug,
      buyerUserId: authSession.user.id,

      status: "paid",

      paymentProvider: "placeholder",
      paymentProviderOrderId: `placeholder:${crypto.randomUUID()}`,

      currency: offer.product.currency ?? "PLN",

      totalNet,
      totalVat,
      totalGross,

      invoiceRequested: false,
      billingSnapshot: {},

      metadata: {
        placeholder: true,
        tenantSlug,
        assessmentSessionId: sessionId,
        reportTemplateId: offer.reportVersion.reportTemplateId,
        reportTemplateVersionId: offer.reportVersion.reportTemplateVersionId,
        productId: offer.product.id,
        productCode: offer.product.code,
        productName: offer.product.name,
      },

      paidAt: now,
      createdAt: now,
      updatedAt: now,
      createdBy: authSession.user.id,
      updatedBy: authSession.user.id,
    })
    .returning({
      id: reportAccessOrders.id,
    });

  await controlDb.insert(reportAccessOrderItems).values({
    orderId: order.id,
    productId: offer.product.id,

    quantity: 1,

    unitNet: totalNet,
    unitVat: totalVat,
    unitGross: totalGross,

    totalNet,
    totalVat,
    totalGross,

    createdAt: now,
    updatedAt: now,
  });

  const validUntil =
    typeof offer.product.validityDays === "number" &&
    offer.product.validityDays > 0
      ? new Date(now.getTime() + offer.product.validityDays * 24 * 60 * 60 * 1000)
      : null;

  const [grant] = await controlDb
    .insert(reportAccessGrants)
    .values({
      source: "placeholder_payment",
      status: "active",

      productId: offer.product.id,
      orderId: order.id,

      reportTemplateId: offer.reportVersion.reportTemplateId,
      reportTemplateVersionId: offer.reportVersion.reportTemplateVersionId,

      tenantSlug,
      userId: authSession.user.id,
      email: authSession.user.email ?? null,

      assessmentSessionId: sessionId,

      validFrom: now,
      validUntil,

      metadata: {
        placeholder: true,
        productCode: offer.product.code,
        productName: offer.product.name,
        orderId: order.id,
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

  redirect(
    buildReportHref({
      sessionId,
      tenantSlug,
      reportTemplateVersionId: grant.reportTemplateVersionId,
    }),
  );
}