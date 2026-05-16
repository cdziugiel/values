"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";

import {
  reportAccessGrants,
  reportAccessOrderItems,
  reportAccessOrders,
  reportAccessProducts,
} from "@/drizzle/schema";

import { controlDb } from "@/server/db/control-db";

import {
  getReportAccessOfferForCompletedSession,
} from "./report-access.queries";

export type ReportAccessActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function fail(error: unknown): ReportAccessActionState {
  return {
    status: "error",
    message:
      error instanceof Error
        ? error.message
        : "Operacja nie powiodła się.",
  };
}

function toMoneyString(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "0.00";
  }

  return numberValue.toFixed(2);
}

function calculateVat({
  gross,
  net,
}: {
  gross: unknown;
  net: unknown;
}) {
  const grossNumber = Number(gross);
  const netNumber = Number(net);

  if (!Number.isFinite(grossNumber) || !Number.isFinite(netNumber)) {
    return "0.00";
  }

  return Math.max(grossNumber - netNumber, 0).toFixed(2);
}

export async function unlockReportWithPlaceholderPaymentAction(
  _previousState: ReportAccessActionState,
  formData: FormData,
): Promise<ReportAccessActionState> {
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!tenantSlug || !sessionId) {
    return {
      status: "error",
      message: "Brakuje danych sesji lub tenanta.",
    };
  }

  try {
    const offer = await getReportAccessOfferForCompletedSession({
      tenantSlug,
      sessionId,
    });

    if (!offer.ok) {
      return {
        status: "error",
        message: offer.message,
      };
    }

    if (offer.hasAccess) {
      redirect(
        `/my/assessment/sessions/${sessionId}/report/${offer.reportVersion.reportTemplateVersionId}?tenant=${tenantSlug}`,
      );
    }

    const product =
      offer.product ??
      (await controlDb.query.reportAccessProducts.findFirst({
        where: and(
          eq(
            reportAccessProducts.reportTemplateId,
            offer.reportVersion.reportTemplateId,
          ),
          eq(reportAccessProducts.status, "active"),
          isNull(reportAccessProducts.deletedAt),
        ),
      }));

    if (!product) {
      return {
        status: "error",
        message:
          "Nie znaleziono aktywnego produktu sprzedażowego dla tego typu raportu.",
      };
    }

    const now = new Date();

    const totalNet = toMoneyString(product.priceNet);
    const totalGross = toMoneyString(product.priceGross);
    const totalVat = calculateVat({
      gross: product.priceGross,
      net: product.priceNet,
    });

    const existingGrant =
      await controlDb.query.reportAccessGrants.findFirst({
        where: and(
          eq(reportAccessGrants.tenantSlug, tenantSlug),
          eq(reportAccessGrants.assessmentSessionId, sessionId),
          eq(
            reportAccessGrants.reportTemplateId,
            offer.reportVersion.reportTemplateId,
          ),
          eq(reportAccessGrants.status, "active"),
          isNull(reportAccessGrants.deletedAt),
        ),
      });

    if (existingGrant) {
      redirect(
        `/my/assessment/sessions/${sessionId}/report/${existingGrant.reportTemplateVersionId}?tenant=${tenantSlug}`,
      );
    }

    const result = await controlDb.transaction(async (tx) => {
      const [order] = await tx
        .insert(reportAccessOrders)
        .values({
          buyerType: "user",
          tenantSlug,
          buyerUserId: offer.actorUserId,

          status: "paid",

          paymentProvider: "placeholder",
          paymentProviderOrderId: `placeholder:${sessionId}:${Date.now()}`,

          currency: product.currency,
          totalNet,
          totalVat,
          totalGross,

          invoiceRequested: false,

          metadata: {
            placeholder: true,
            sessionId,
            reportTemplateId: offer.reportVersion.reportTemplateId,
            reportTemplateVersionId:
              offer.reportVersion.reportTemplateVersionId,
          },

          paidAt: now,
          createdAt: now,
          updatedAt: now,
          createdBy: offer.actorUserId,
          updatedBy: offer.actorUserId,
        })
        .returning();

      await tx.insert(reportAccessOrderItems).values({
        orderId: order.id,
        productId: product.id,
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

      const validUntil = product.validityDays
        ? new Date(now.getTime() + product.validityDays * 24 * 60 * 60 * 1000)
        : null;

      const [grant] = await tx
        .insert(reportAccessGrants)
        .values({
          source: "placeholder_payment",
          status: "active",

          productId: product.id,
          orderId: order.id,

          reportTemplateId: offer.reportVersion.reportTemplateId,
          reportTemplateVersionId:
            offer.reportVersion.reportTemplateVersionId,

          tenantSlug,
          userId: offer.actorUserId,
          email: offer.actorEmail,

          assessmentProjectId: offer.session.assessmentProjectId,
          assessmentSessionId: sessionId,
          assessmentAccessLinkId: offer.session.assessmentAccessLinkId,

          validFrom: now,
          validUntil,

          metadata: {
            placeholder: true,
            purchasedReportTemplateVersionName:
              offer.reportVersion.reportTemplateVersionName,
            purchasedReportTemplateVersion:
              offer.reportVersion.reportTemplateVersion,
          },

          createdAt: now,
          updatedAt: now,
          createdBy: offer.actorUserId,
          updatedBy: offer.actorUserId,
        })
        .returning();

      return {
        order,
        grant,
      };
    });

    redirect(
      `/my/assessment/sessions/${sessionId}/report/${result.grant.reportTemplateVersionId}?tenant=${tenantSlug}`,
    );
  } catch (error) {
    return fail(error);
  }
}