"use server";

import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  reportAccessOrderItems,
  reportAccessOrders,
} from "@/drizzle/schema";

import {
  buildPrzelewy24PaymentUrl,
  registerPrzelewy24Transaction,
} from "@/features/payments";

import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import { env } from "@/shared/config/env";

export type RetryReportPaymentActionState = {
  status: "idle" | "error";
  message: string;
};

const retryableOrderMetadataSchema = z
  .object({
    tenantSlug: z.string().min(1),
    mode: z.string().optional(),

    reportKind: z.string().optional(),

    assessmentSessionId: z.string().uuid(),

    projectQuestionnaireId: z
      .string()
      .uuid()
      .nullable()
      .optional(),

    questionnaireVersionId: z
      .string()
      .uuid()
      .nullable()
      .optional(),

    reportTemplateId: z.string().uuid(),
    reportTemplateVersionId: z.string().uuid(),

    productId: z.string().uuid(),
    productCode: z.string().optional(),
    productName: z.string().min(1),

    payment: z
      .object({
        token: z.string().min(1).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

function fail(
  message: string,
): RetryReportPaymentActionState {
  return {
    status: "error",
    message,
  };
}

function normalizeString(
  value: FormDataEntryValue | null,
): string {
  return String(value ?? "").trim();
}

function withoutTrailingSlash(
  value: string,
): string {
  return value.replace(/\/+$/, "");
}

function buildPaymentReturnUrl(
  orderId: string,
): string {
  return `${withoutTrailingSlash(
    env.APP_URL,
  )}/my/payments/${encodeURIComponent(
    orderId,
  )}/return`;
}

function buildPaymentStatusUrl(): string {
  return `${withoutTrailingSlash(
    env.APP_URL,
  )}/api/webhooks/przelewy24`;
}

function moneyToCents(value: unknown): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      "Nieprawidłowa wartość zamówienia.",
    );
  }

  return Math.round(parsed * 100);
}

export async function retryReportAccessPaymentAction(
  _previousState: RetryReportPaymentActionState,
  formData: FormData,
): Promise<RetryReportPaymentActionState> {
  const session = await requireSession();

  const orderId = normalizeString(
    formData.get("orderId"),
  );

  if (!orderId) {
    return fail(
      "Brakuje identyfikatora zamówienia.",
    );
  }

  const order =
    await controlDb.query.reportAccessOrders.findFirst({
      where: and(
        eq(reportAccessOrders.id, orderId),
        eq(
          reportAccessOrders.buyerUserId,
          session.user.id,
        ),
        eq(
          reportAccessOrders.buyerType,
          "user",
        ),
        isNull(reportAccessOrders.deletedAt),
      ),
    });

  if (!order) {
    return fail(
      "Nie znaleziono zamówienia albo nie masz do niego dostępu.",
    );
  }

  if (
    order.paymentProvider !== "przelewy24"
  ) {
    return fail(
      "To zamówienie nie było obsługiwane przez Przelewy24.",
    );
  }

  if (order.status === "paid") {
    return fail(
      "Ta płatność została już potwierdzona.",
    );
  }

  const parsedMetadata =
    retryableOrderMetadataSchema.safeParse(
      order.metadata,
    );

  if (!parsedMetadata.success) {
    return fail(
      "Zamówienie nie zawiera kompletnych danych potrzebnych do ponowienia płatności.",
    );
  }

  const metadata = parsedMetadata.data;

  /**
   * Dla nadal aktywnego pending_payment nie tworzymy duplikatu.
   * Użytkownik wraca do wcześniej zarejestrowanej transakcji.
   */
  if (order.status === "pending_payment") {
    const existingToken =
      metadata.payment?.token;

    if (!existingToken) {
      return fail(
        "Nie znaleziono aktywnego tokenu płatności. Spróbuj rozpocząć zakup ponownie z widoku raportu.",
      );
    }

    redirect(
      buildPrzelewy24PaymentUrl(
        existingToken,
      ),
    );
  }

  if (
    order.status !== "failed" &&
    order.status !== "cancelled"
  ) {
    return fail(
      "Tego zamówienia nie można ponowić.",
    );
  }

  if (!session.user.email) {
    return fail(
      "Do rozpoczęcia płatności wymagany jest adres e-mail użytkownika.",
    );
  }

  const originalItem =
    await controlDb.query.reportAccessOrderItems.findFirst({
      where: and(
        eq(
          reportAccessOrderItems.orderId,
          order.id,
        ),
        isNull(
          reportAccessOrderItems.deletedAt,
        ),
      ),
    });

  if (!originalItem) {
    return fail(
      "Zamówienie nie zawiera pozycji zakupowej.",
    );
  }

  const paymentSessionId =
    `humanet:${randomUUID()}`;

  const now = new Date();

  const retryMetadata = {
    ...metadata,

    payment: {
      status: "created",
      provider: "przelewy24",
      retryOfOrderId: order.id,
      createdAt: now.toISOString(),
    },
  };

  const newOrder = await controlDb.transaction(
    async (tx) => {
      const [createdOrder] = await tx
        .insert(reportAccessOrders)
        .values({
          buyerType: order.buyerType,

          tenantSlug: order.tenantSlug,
          tenantId: order.tenantId,

          buyerUserId: session.user.id,

          status: "pending_payment",

          paymentProvider: "przelewy24",
          paymentProviderOrderId: null,
          paymentProviderSessionId:
            paymentSessionId,

          currency: order.currency,

          totalNet: order.totalNet,
          totalVat: order.totalVat,
          totalGross: order.totalGross,

          invoiceRequested:
            order.invoiceRequested,

          billingProfileId:
            order.billingProfileId,

          billingSnapshot:
            order.billingSnapshot,

          metadata: retryMetadata,

          createdAt: now,
          updatedAt: now,

          createdBy: session.user.id,
          updatedBy: session.user.id,
        })
        .returning({
          id: reportAccessOrders.id,
        });

      if (!createdOrder) {
        throw new Error(
          "Nie udało się utworzyć nowego zamówienia.",
        );
      }

      await tx
        .insert(reportAccessOrderItems)
        .values({
          orderId: createdOrder.id,

          productId:
            originalItem.productId,

          quantity:
            originalItem.quantity,

          unitNet:
            originalItem.unitNet,

          unitVat:
            originalItem.unitVat,

          unitGross:
            originalItem.unitGross,

          totalNet:
            originalItem.totalNet,

          totalVat:
            originalItem.totalVat,

          totalGross:
            originalItem.totalGross,


          createdAt: now,
          updatedAt: now,
        });

      await tx
        .update(reportAccessOrders)
        .set({
          updatedAt: now,
          updatedBy: session.user.id,

          metadata: {
            ...metadata,

            payment: {
              ...(metadata.payment ?? {}),

              status: "superseded",
              supersededByOrderId:
                createdOrder.id,
              supersededAt:
                now.toISOString(),
            },
          },
        })
        .where(
          and(
            eq(
              reportAccessOrders.id,
              order.id,
            ),
            eq(
              reportAccessOrders.buyerUserId,
              session.user.id,
            ),
            isNull(
              reportAccessOrders.deletedAt,
            ),
          ),
        );

      return createdOrder;
    },
  );

  try {
    const registration =
      await registerPrzelewy24Transaction({
        sessionId: paymentSessionId,

        amount: moneyToCents(
          order.totalGross,
        ),

        currency:
          order.currency.toUpperCase(),

        description: `HUMANET — ${metadata.productName}`,

        email: session.user.email,

        client:
          session.user.name ??
          session.user.email,

        country: "PL",
        language: "pl",

        urlReturn:
          buildPaymentReturnUrl(
            newOrder.id,
          ),

        urlStatus:
          buildPaymentStatusUrl(),
      });

    const registeredAt = new Date();

    await controlDb
      .update(reportAccessOrders)
      .set({
        updatedAt: registeredAt,
        updatedBy: session.user.id,

        metadata: {
          ...retryMetadata,

          payment: {
            ...retryMetadata.payment,

            status: "registered",
            token: registration.token,

            registeredAt:
              registeredAt.toISOString(),
          },
        },
      })
      .where(
        and(
          eq(
            reportAccessOrders.id,
            newOrder.id,
          ),
          eq(
            reportAccessOrders.status,
            "pending_payment",
          ),
          eq(
            reportAccessOrders.buyerUserId,
            session.user.id,
          ),
          isNull(
            reportAccessOrders.deletedAt,
          ),
        ),
      );

    redirect(
      buildPrzelewy24PaymentUrl(
        registration.token,
      ),
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    const failedAt = new Date();

    await controlDb
      .update(reportAccessOrders)
      .set({
        status: "failed",

        updatedAt: failedAt,
        updatedBy: session.user.id,

        metadata: {
          ...retryMetadata,

          payment: {
            ...retryMetadata.payment,

            status:
              "registration_failed",

            errorCode:
              error instanceof Error
                ? error.name
                : "UnknownError",

            failedAt:
              failedAt.toISOString(),
          },
        },
      })
      .where(
        and(
          eq(
            reportAccessOrders.id,
            newOrder.id,
          ),
          eq(
            reportAccessOrders.status,
            "pending_payment",
          ),
          isNull(
            reportAccessOrders.deletedAt,
          ),
        ),
      );

    console.error(
      "P24_PAYMENT_RETRY_REGISTRATION_FAILED",
      {
        orderId: newOrder.id,

        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );

    return fail(
      "Nie udało się ponownie rozpocząć płatności. Spróbuj ponownie.",
    );
  }
}