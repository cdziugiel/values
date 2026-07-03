import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import {
  reportAccessGrants,
  reportAccessOrderItems,
  reportAccessOrders,
  reportAccessProducts,
} from "@/drizzle/schema";

import { controlDb } from "@/server/db/control-db";

const paidReportOrderMetadataSchema = z.object({
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
  productName: z.string().optional(),
});

type FinalizePaidReportAccessOrderInput = {
  orderId: string;
  providerOrderId: number;
  providerSessionId: string;
};

export type FinalizePaidReportAccessOrderResult =
  | {
      status: "fulfilled";
      grantId: string;
    }
  | {
      status: "already_fulfilled";
      grantId: string | null;
    };

/**
 * Finalizuje opłacone zamówienie na pojedynczy raport.
 *
 * Operacja jest idempotentna:
 * - tylko pending_payment może zostać przejęte do realizacji,
 * - powtórna notyfikacja dla order=paid nie tworzy kolejnego grantu,
 * - order i grant są zapisywane w jednej transakcji DB.
 */
export async function finalizePaidReportAccessOrder({
  orderId,
  providerOrderId,
  providerSessionId,
}: FinalizePaidReportAccessOrderInput): Promise<FinalizePaidReportAccessOrderResult> {
  return controlDb.transaction(async (tx) => {
    const currentOrder =
      await tx.query.reportAccessOrders.findFirst({
        where: and(
          eq(reportAccessOrders.id, orderId),
          eq(
            reportAccessOrders.paymentProvider,
            "przelewy24",
          ),
          eq(
            reportAccessOrders.paymentProviderSessionId,
            providerSessionId,
          ),
          isNull(reportAccessOrders.deletedAt),
        ),
      });

    if (!currentOrder) {
      throw new Error(
        "Nie znaleziono zamówienia powiązanego z płatnością.",
      );
    }

    if (currentOrder.status === "paid") {
      const existingGrant =
        await tx.query.reportAccessGrants.findFirst({
          where: and(
            eq(reportAccessGrants.orderId, currentOrder.id),
            eq(reportAccessGrants.status, "active"),
            isNull(reportAccessGrants.deletedAt),
          ),
          columns: {
            id: true,
          },
        });

      return {
        status: "already_fulfilled",
        grantId: existingGrant?.id ?? null,
      };
    }

    if (currentOrder.status !== "pending_payment") {
      throw new Error(
        `Zamówienie ma nieprawidłowy status: ${currentOrder.status}.`,
      );
    }

    const parsedMetadata =
      paidReportOrderMetadataSchema.safeParse(
        currentOrder.metadata,
      );

    if (!parsedMetadata.success) {
      throw new Error(
        "Zamówienie nie zawiera kompletnych danych potrzebnych do przyznania raportu.",
      );
    }

    const metadata = parsedMetadata.data;

    const orderItem =
      await tx.query.reportAccessOrderItems.findFirst({
        where: and(
          eq(
            reportAccessOrderItems.orderId,
            currentOrder.id,
          ),
          isNull(reportAccessOrderItems.deletedAt),
        ),
      });

    if (!orderItem) {
      throw new Error(
        "Zamówienie nie zawiera pozycji zakupowej.",
      );
    }

    const product =
      await tx.query.reportAccessProducts.findFirst({
        where: and(
          eq(reportAccessProducts.id, orderItem.productId),
          isNull(reportAccessProducts.deletedAt),
        ),
      });

    if (!product) {
      throw new Error(
        "Nie znaleziono produktu przypisanego do zamówienia.",
      );
    }

    const now = new Date();

    /**
     * Atomowe przejęcie zamówienia.
     *
     * Przy dwóch równoległych webhookach tylko jeden update
     * może zmienić pending_payment → paid.
     */
    const [paidOrder] = await tx
      .update(reportAccessOrders)
      .set({
        status: "paid",

        paymentProviderOrderId: String(providerOrderId),

        paidAt: now,
        updatedAt: now,
        updatedBy: currentOrder.buyerUserId,
      })
      .where(
        and(
          eq(reportAccessOrders.id, currentOrder.id),
          eq(
            reportAccessOrders.status,
            "pending_payment",
          ),
          eq(
            reportAccessOrders.paymentProvider,
            "przelewy24",
          ),
          eq(
            reportAccessOrders.paymentProviderSessionId,
            providerSessionId,
          ),
          isNull(reportAccessOrders.deletedAt),
        ),
      )
      .returning({
        id: reportAccessOrders.id,
      });

    if (!paidOrder) {
      const concurrentGrant =
        await tx.query.reportAccessGrants.findFirst({
          where: and(
            eq(
              reportAccessGrants.orderId,
              currentOrder.id,
            ),
            eq(reportAccessGrants.status, "active"),
            isNull(reportAccessGrants.deletedAt),
          ),
          columns: {
            id: true,
          },
        });

      return {
        status: "already_fulfilled",
        grantId: concurrentGrant?.id ?? null,
      };
    }

    const validUntil =
      typeof product.validityDays === "number" &&
      product.validityDays > 0
        ? new Date(
            now.getTime() +
              product.validityDays *
                24 *
                60 *
                60 *
                1000,
          )
        : null;

    const [grant] = await tx
      .insert(reportAccessGrants)
      .values({
        source: "purchase",
        status: "active",

        productId: product.id,
        orderId: currentOrder.id,

        reportTemplateId:
          metadata.reportTemplateId,

        reportTemplateVersionId:
          metadata.reportTemplateVersionId,

        tenantSlug: metadata.tenantSlug,

        userId: currentOrder.buyerUserId,

        subjectType: "assessment_session",
        subjectId: metadata.assessmentSessionId,

        assessmentSessionId:
          metadata.assessmentSessionId,

        validFrom: now,
        validUntil,

        metadata: {
          paymentProvider: "przelewy24",
          paymentProviderOrderId:
            String(providerOrderId),

          mode: metadata.mode ?? null,
          reportKind:
            metadata.reportKind ?? "personal",

          projectQuestionnaireId:
            metadata.projectQuestionnaireId ?? null,

          questionnaireVersionId:
            metadata.questionnaireVersionId ?? null,

          productCode:
            metadata.productCode ?? product.code,

          productName:
            metadata.productName ?? product.name,

          orderId: currentOrder.id,
        },

        createdAt: now,
        updatedAt: now,

        createdBy: currentOrder.buyerUserId,
        updatedBy: currentOrder.buyerUserId,
      })
      .returning({
        id: reportAccessGrants.id,
      });

    return {
      status: "fulfilled",
      grantId: grant.id,
    };
  });
}