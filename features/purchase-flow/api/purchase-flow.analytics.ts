// @humanet-ga4-mp-v1
import "server-only";

import { and, eq, isNull, lt } from "drizzle-orm";

import {
  consultationEntitlements,
  reportAccessOrders,
} from "@/drizzle/schema";
import {
  hasActiveAnalyticsConsent,
  readAnalyticsIdentityFromMetadata,
  sendGa4ServerEvent,
} from "@/features/analytics/server";
import { controlDb } from "@/server/db/control-db";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function logDispatchFailure(
  eventName: string,
  sourceId: string,
  error: unknown,
): void {
  console.error("GA4_MP_DISPATCH_FAILED", {
    eventName,
    sourceType: "order",
    sourceId,
    errorName: error instanceof Error ? error.name : "UnknownError",
  });
}

export async function dispatchBeginCheckoutAnalytics({
  orderId,
  userId,
}: {
  orderId: string;
  userId: string;
}): Promise<boolean> {
  try {
    const order = await controlDb.query.reportAccessOrders.findFirst({
      where: and(
        eq(reportAccessOrders.id, orderId),
        eq(reportAccessOrders.buyerUserId, userId),
        isNull(reportAccessOrders.deletedAt),
      ),
    });

    if (!order) return false;

    const metadata = asRecord(order.metadata);
    const identity = readAnalyticsIdentityFromMetadata(metadata);

    if (!identity || !(await hasActiveAnalyticsConsent(userId))) {
      return false;
    }

    const productCode = text(metadata.productCode) ?? "report";
    const productName = text(metadata.productName) ?? "Raport HUMANET";
    const offerCode = text(metadata.offerCode);
    const reportType = text(metadata.reportType);
    const value = number(order.totalGross);

    const result = await sendGa4ServerEvent({
      identity,
      name: "begin_checkout",
      params: {
        currency: order.currency,
        value,
        ...(offerCode ? { offer_code: offerCode } : {}),
        ...(reportType ? { report_type: reportType } : {}),
        items: [
          {
            item_id: productCode,
            item_name: productName,
            item_category: "report",
            price: value,
            quantity: 1,
          },
        ],
      },
    });

    if (result.sent) {
      console.info("GA4_MP_SENT", {
        eventName: "begin_checkout",
        sourceType: "order",
        sourceId: orderId,
        status: result.status,
      });
    }

    return result.sent;
  } catch (error) {
    logDispatchFailure("begin_checkout", orderId, error);
    return false;
  }
}

export async function dispatchPurchaseAnalytics({
  orderId,
}: {
  orderId: string;
}): Promise<boolean> {
  try {
    const order = await controlDb.query.reportAccessOrders.findFirst({
      where: and(
        eq(reportAccessOrders.id, orderId),
        isNull(reportAccessOrders.deletedAt),
      ),
    });

    if (!order || order.status !== "paid" || !order.buyerUserId) return false;

    const metadata = asRecord(order.metadata);
    const analyticsDispatch = asRecord(metadata.analyticsDispatch);

    if (text(analyticsDispatch.purchaseSentAt)) return true;

    const identity = readAnalyticsIdentityFromMetadata(metadata);
    if (
      !identity ||
      !(await hasActiveAnalyticsConsent(order.buyerUserId))
    ) {
      return false;
    }

    const previousPaidOrders = await controlDb
      .select({ id: reportAccessOrders.id })
      .from(reportAccessOrders)
      .where(
        and(
          eq(reportAccessOrders.buyerUserId, order.buyerUserId),
          eq(reportAccessOrders.status, "paid"),
          lt(reportAccessOrders.createdAt, order.createdAt),
          isNull(reportAccessOrders.deletedAt),
        ),
      )
      .limit(1);

    const value = number(order.totalGross);
    const productCode = text(metadata.productCode) ?? "report";
    const productName = text(metadata.productName) ?? "Raport HUMANET";
    const offerCode = text(metadata.offerCode);
    const reportType = text(metadata.reportType);

    const result = await sendGa4ServerEvent({
      identity,
      name: "purchase",
      params: {
        transaction_id: order.id,
        currency: order.currency,
        value,
        tax: number(order.totalVat),
        customer_type: previousPaidOrders.length ? "returning" : "new",
        ...(offerCode ? { offer_code: offerCode } : {}),
        ...(reportType ? { report_type: reportType } : {}),
        items: [
          {
            item_id: productCode,
            item_name: productName,
            item_category: "report",
            price: value,
            quantity: 1,
          },
        ],
      },
      occurredAt: order.paidAt ?? new Date(),
    });

    if (!result.sent) return false;

    const latest = await controlDb.query.reportAccessOrders.findFirst({
      where: eq(reportAccessOrders.id, order.id),
      columns: { metadata: true },
    });
    const latestMetadata = asRecord(latest?.metadata);
    const latestDispatch = asRecord(latestMetadata.analyticsDispatch);

    await controlDb
      .update(reportAccessOrders)
      .set({
        metadata: {
          ...latestMetadata,
          analyticsDispatch: {
            ...latestDispatch,
            purchaseSentAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(reportAccessOrders.id, order.id));

    console.info("GA4_MP_SENT", {
      eventName: "purchase",
      sourceType: "order",
      sourceId: order.id,
      status: result.status,
    });

    return true;
  } catch (error) {
    logDispatchFailure("purchase", orderId, error);
    return false;
  }
}

export async function dispatchPackageConsultationBookedAnalytics({
  entitlementId,
}: {
  entitlementId: string;
}): Promise<boolean> {
  try {
    const entitlement =
      await controlDb.query.consultationEntitlements.findFirst({
        where: eq(consultationEntitlements.id, entitlementId),
      });

    if (
      !entitlement ||
      entitlement.source !== "package" ||
      entitlement.status !== "booked" ||
      !entitlement.orderId
    ) {
      return false;
    }

    const bookingMetadata = asRecord(entitlement.bookingMetadata);
    const dispatch = asRecord(bookingMetadata.analyticsDispatch);
    if (text(dispatch.bookConsultationSentAt)) return true;

    const order = await controlDb.query.reportAccessOrders.findFirst({
      where: and(
        eq(reportAccessOrders.id, entitlement.orderId),
        isNull(reportAccessOrders.deletedAt),
      ),
    });

    if (!order?.buyerUserId) return false;

    const identity = readAnalyticsIdentityFromMetadata(order.metadata);
    if (
      !identity ||
      !(await hasActiveAnalyticsConsent(order.buyerUserId))
    ) {
      return false;
    }

    const result = await sendGa4ServerEvent({
      identity,
      name: "book_consultation",
      params: {
        consultation_kind: entitlement.kind,
        consultation_source: "package",
        duration_minutes: entitlement.durationMinutes,
      },
      occurredAt: entitlement.bookedAt ?? new Date(),
    });

    if (!result.sent) return false;

    const latest =
      await controlDb.query.consultationEntitlements.findFirst({
        where: eq(consultationEntitlements.id, entitlement.id),
        columns: { bookingMetadata: true },
      });
    const latestBookingMetadata = asRecord(latest?.bookingMetadata);
    const latestDispatch = asRecord(latestBookingMetadata.analyticsDispatch);

    await controlDb
      .update(consultationEntitlements)
      .set({
        bookingMetadata: {
          ...latestBookingMetadata,
          analyticsDispatch: {
            ...latestDispatch,
            bookConsultationSentAt: new Date().toISOString(),
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(consultationEntitlements.id, entitlement.id));

    console.info("GA4_MP_SENT", {
      eventName: "book_consultation",
      sourceType: "consultation_entitlement",
      sourceId: entitlement.id,
      status: result.status,
    });

    return true;
  } catch (error) {
    console.error("GA4_MP_DISPATCH_FAILED", {
      eventName: "book_consultation",
      sourceType: "consultation_entitlement",
      sourceId: entitlementId,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return false;
  }
}
