// app/api/webhooks/przelewy24/route.ts
import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import {
  reportAccessOrders,
} from "@/drizzle/schema";

import {
  createPrzelewy24NotificationSign,
  Przelewy24ApiError,
  safeCompareSign,
  verifyPrzelewy24Transaction,
} from "@/features/payments";

import {
  przelewy24NotificationSchema,
} from "@/features/payments/forms/przelewy24-notification.schema";

import {
  moneyToCents,
} from "@/features/payments/lib/payment-money";

import {
  finalizePaidReportAccessOrder,
  finalizePaidTenantReportAccessOrder,
} from "@/features/report-access/api/report-access-payment.mutations";

import { controlDb } from "@/server/db/control-db";
import { env } from "@/shared/config/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function webhookError(
  message: string,
  status: number,
) {
  return NextResponse.json(
    {
      ok: false,
      message,
    },
    {
      status,
    },
  );
}

export async function POST(request: Request) {
  let rawPayload: unknown;

  try {
    rawPayload = await request.json();
  } catch {
    return webhookError(
      "Nieprawidłowy format JSON.",
      400,
    );
  }

  const parsed =
    przelewy24NotificationSchema.safeParse(
      rawPayload,
    );

  if (!parsed.success) {
    console.warn("P24_NOTIFICATION_INVALID_PAYLOAD", {
      issueCount: parsed.error.issues.length,
    });

    return webhookError(
      "Nieprawidłowa notyfikacja.",
      400,
    );
  }

  const notification = parsed.data;

  /**
   * Najpierw sprawdzamy identyfikatory naszego konta.
   */
  if (
    notification.merchantId !==
      env.P24_MERCHANT_ID ||
    notification.posId !== env.P24_POS_ID
  ) {
    console.warn(
      "P24_NOTIFICATION_ACCOUNT_MISMATCH",
      {
        sessionId: notification.sessionId,
        orderId: notification.orderId,
      },
    );

    return webhookError(
      "Nieprawidłowy identyfikator sprzedawcy.",
      401,
    );
  }

  /**
   * Następnie weryfikujemy podpis otrzymanej notyfikacji.
   */
  const expectedSign =
    createPrzelewy24NotificationSign({
      merchantId: notification.merchantId,
      posId: notification.posId,
      sessionId: notification.sessionId,
      amount: notification.amount,
      originAmount: notification.originAmount,
      currency: notification.currency,
      orderId: notification.orderId,
      methodId: notification.methodId,
      statement: notification.statement,
      crc: env.P24_CRC,
    });

  if (
    !safeCompareSign(
      notification.sign,
      expectedSign,
    )
  ) {
    console.warn(
      "P24_NOTIFICATION_INVALID_SIGN",
      {
        sessionId: notification.sessionId,
        orderId: notification.orderId,
      },
    );

    return webhookError(
      "Nieprawidłowy podpis notyfikacji.",
      401,
    );
  }

  /**
   * Szukamy zamówienia wyłącznie po naszym sessionId
   * zapisanym podczas transaction/register.
   */
  const order =
    await controlDb.query.reportAccessOrders.findFirst({
      where: and(
        eq(
          reportAccessOrders.paymentProvider,
          "przelewy24",
        ),
        eq(
          reportAccessOrders.paymentProviderSessionId,
          notification.sessionId,
        ),
        isNull(reportAccessOrders.deletedAt),
      ),
    });

  if (!order) {
    console.warn(
      "P24_NOTIFICATION_ORDER_NOT_FOUND",
      {
        sessionId: notification.sessionId,
        providerOrderId:
          notification.orderId,
      },
    );

    return webhookError(
      "Nie znaleziono zamówienia.",
      404,
    );
  }


  if (order.status !== "pending_payment") {
    console.warn(
      "P24_NOTIFICATION_INVALID_ORDER_STATUS",
      {
        orderId: order.id,
        status: order.status,
      },
    );

    return webhookError(
      "Zamówienie nie oczekuje na płatność.",
      409,
    );
  }

  const expectedAmount =
    moneyToCents(order.totalGross);

  if (
    notification.amount !== expectedAmount ||
    notification.originAmount !==
      expectedAmount
  ) {
    console.error(
      "P24_NOTIFICATION_AMOUNT_MISMATCH",
      {
        orderId: order.id,
        expectedAmount,
        receivedAmount:
          notification.amount,
        receivedOriginAmount:
          notification.originAmount,
      },
    );

    return webhookError(
      "Niezgodna kwota transakcji.",
      409,
    );
  }

  const expectedCurrency =
    order.currency.toUpperCase();

  if (
    notification.currency.toUpperCase() !==
    expectedCurrency
  ) {
    console.error(
      "P24_NOTIFICATION_CURRENCY_MISMATCH",
      {
        orderId: order.id,
        expectedCurrency,
        receivedCurrency:
          notification.currency,
      },
    );

    return webhookError(
      "Niezgodna waluta transakcji.",
      409,
    );
  }

  try {
    /**
     * P24 wymaga osobnego transaction/verify.
     * Dopiero jego sukces pozwala uznać płatność.
     */
    await verifyPrzelewy24Transaction({
      sessionId: notification.sessionId,
      orderId: notification.orderId,
      amount: notification.amount,
      currency: notification.currency,
    });

const result =
  order.buyerType === "tenant"
    ? await finalizePaidTenantReportAccessOrder({
        orderId: order.id,

        providerOrderId:
          notification.orderId,

        providerSessionId:
          notification.sessionId,
      })
    : await finalizePaidReportAccessOrder({
        orderId: order.id,

        providerOrderId:
          notification.orderId,

        providerSessionId:
          notification.sessionId,
      });

console.info(
  "P24_PAYMENT_FULFILLED",
  {
    orderId: order.id,
    buyerType: order.buyerType,

    providerOrderId:
      notification.orderId,

    fulfillmentStatus:
      result.status,
  },
);

    return NextResponse.json({
      ok: true,
      status: result.status,
    });
  } catch (error) {
    if (
      error instanceof Przelewy24ApiError
    ) {
      console.error(
        "P24_TRANSACTION_VERIFY_FAILED",
        {
          orderId: order.id,
          providerOrderId:
            notification.orderId,
          p24Status: error.status,
          errorName: error.name,
          errorMessage: error.message,
        },
      );

      return webhookError(
        "Nie udało się zweryfikować transakcji.",
        502,
      );
    }

    console.error(
      "P24_PAYMENT_FULFILMENT_FAILED",
      {
        orderId: order.id,
        providerOrderId:
          notification.orderId,
        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
    );

    return webhookError(
      "Nie udało się zrealizować zamówienia.",
      500,
    );
  }
}