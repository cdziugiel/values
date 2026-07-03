import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import {
  reportAccessCodes,
  reportAccessGrants,
  reportAccessOrderItems,
  reportAccessOrders,
  reportAccessProducts,
} from "@/drizzle/schema";
import { createHash, randomBytes } from "node:crypto";

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
    /**
     * Blokada obejmuje wyłącznie bieżącą transakcję.
     *
     * Dwa webhooki dotyczące tego samego zamówienia nie mogą równolegle
     * przejść przez proces finalizacji. Drugi request poczeka, aż pierwszy
     * zakończy commit albo rollback.
     */
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${orderId}))`,
    );

    /**
     * Zamówienie odczytujemy dopiero po uzyskaniu blokady.
     * Dzięki temu widzimy stan po zakończeniu wcześniejszej transakcji.
     */
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

    if (
      currentOrder.paymentProviderOrderId &&
      currentOrder.paymentProviderOrderId !==
        String(providerOrderId)
    ) {
      throw new Error(
        "Zamówienie jest powiązane z inną transakcją operatora płatności.",
      );
    }

    if (currentOrder.status === "paid") {
      const existingGrant =
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

      /**
       * paid bez grantu oznacza niespójność.
       * Nie zwracamy sukcesu, bo P24 przestałoby ponawiać notyfikację.
       */
      if (!existingGrant) {
        throw new Error(
          "Zamówienie jest oznaczone jako opłacone, ale nie ma aktywnego grantu.",
        );
      }

      return {
        status: "already_fulfilled",
        grantId: existingGrant.id,
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
          eq(
            reportAccessProducts.id,
            orderItem.productId,
          ),
          isNull(reportAccessProducts.deletedAt),
        ),
      });

    if (!product) {
      throw new Error(
        "Nie znaleziono produktu przypisanego do zamówienia.",
      );
    }

    if (product.id !== metadata.productId) {
      throw new Error(
        "Produkt z pozycji zamówienia nie odpowiada produktowi zapisanym w metadanych.",
      );
    }

    const now = new Date();

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

    /**
     * Najpierw tworzymy grant.
     * Oznaczenie order=paid nastąpi dopiero później, nadal w tej samej
     * transakcji. Jeśli insert grantu się nie powiedzie, całość zostanie
     * wycofana i order pozostanie pending_payment.
     */
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

    if (!grant) {
      throw new Error(
        "Nie udało się utworzyć grantu dostępu do raportu.",
      );
    }

    const [paidOrder] = await tx
      .update(reportAccessOrders)
      .set({
        status: "paid",

        paymentProviderOrderId:
          String(providerOrderId),

        paidAt: now,
        updatedAt: now,
        updatedBy: currentOrder.buyerUserId,
      })
      .where(
        and(
          eq(
            reportAccessOrders.id,
            currentOrder.id,
          ),
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
      throw new Error(
        "Nie udało się oznaczyć zamówienia jako opłaconego.",
      );
    }

    return {
      status: "fulfilled",
      grantId: grant.id,
    };
  });
}


const paidTenantOrderMetadataSchema = z.object({
  source: z.string().optional(),

  tenantSlug: z.string().min(1),
  tenantId: z.string().uuid(),

  productId: z.string().uuid(),
  productCode: z.string().min(1),
  productName: z.string().min(1),

  productAccessCount: z.number().int().positive(),
  quantity: z.number().int().positive(),
  generatedAccessCount: z.number().int().positive(),

  discount: z
    .object({
      redemptionId: z.string().uuid(),
      originalGrossCents: z.number().int().nonnegative(),
      discountAmountCents: z.number().int().nonnegative(),
      finalGrossCents: z.number().int().nonnegative(),
    })
    .nullable()
    .optional(),
});

export type FinalizePaidTenantReportAccessOrderResult =
  | {
      status: "fulfilled";
      generatedAccessCount: number;
    }
  | {
      status: "already_fulfilled";
      generatedAccessCount: number;
    };

function generateRawReportAccessCode(): string {
  const part = randomBytes(12)
    .toString("base64url")
    .toUpperCase();

  return `HUM-${part}`;
}

function hashReportAccessCode(
  rawCode: string,
): string {
  return createHash("sha256")
    .update(rawCode, "utf8")
    .digest("hex");
}

function buildCodePreview(
  rawCode: string,
): string {
  return `${rawCode.slice(0, 8)}…${rawCode.slice(-4)}`;
}

function buildValidUntil(
  now: Date,
  validityDays: number | null,
): Date | null {
  if (
    typeof validityDays !== "number" ||
    validityDays <= 0
  ) {
    return null;
  }

  return new Date(
    now.getTime() +
      validityDays * 24 * 60 * 60 * 1000,
  );
}

export async function finalizePaidTenantReportAccessOrder({
  orderId,
  providerOrderId,
  providerSessionId,
}: {
  orderId: string;
  providerOrderId: number;
  providerSessionId: string;
}): Promise<FinalizePaidTenantReportAccessOrderResult> {
  return controlDb.transaction(async (tx) => {
    await tx.execute(
      sql`
        select pg_advisory_xact_lock(
          hashtext(${orderId})
        )
      `,
    );

    const currentOrder =
      await tx.query.reportAccessOrders.findFirst({
        where: and(
          eq(reportAccessOrders.id, orderId),

          eq(
            reportAccessOrders.buyerType,
            "tenant",
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
      });

    if (!currentOrder) {
      throw new Error(
        "Nie znaleziono tenantowego zamówienia powiązanego z płatnością.",
      );
    }

    if (
      currentOrder.paymentProviderOrderId &&
      currentOrder.paymentProviderOrderId !==
        String(providerOrderId)
    ) {
      throw new Error(
        "Zamówienie jest powiązane z inną transakcją operatora płatności.",
      );
    }

    const existingCodes =
      await tx.query.reportAccessCodes.findMany({
        where: and(
          eq(
            reportAccessCodes.orderId,
            currentOrder.id,
          ),
          isNull(reportAccessCodes.deletedAt),
        ),

        columns: {
          id: true,
        },
      });

    if (currentOrder.status === "paid") {
      if (existingCodes.length === 0) {
        throw new Error(
          "Zamówienie tenantowe jest opłacone, ale nie zawiera kodów dostępu.",
        );
      }

      return {
        status: "already_fulfilled",
        generatedAccessCount:
          existingCodes.length,
      };
    }

    if (
      currentOrder.status !==
      "pending_payment"
    ) {
      throw new Error(
        `Zamówienie ma nieprawidłowy status: ${currentOrder.status}.`,
      );
    }

    if (existingCodes.length > 0) {
      throw new Error(
        "Dla nieopłaconego zamówienia istnieją już kody dostępu.",
      );
    }

    const parsedMetadata =
      paidTenantOrderMetadataSchema.safeParse(
        currentOrder.metadata,
      );

    if (!parsedMetadata.success) {
      throw new Error(
        "Zamówienie nie zawiera kompletnych danych do wygenerowania puli dostępów.",
      );
    }

    const metadata = parsedMetadata.data;

    if (
      currentOrder.tenantSlug !==
        metadata.tenantSlug ||
      currentOrder.tenantId !== metadata.tenantId
    ) {
      throw new Error(
        "Dane tenanta w zamówieniu są niespójne.",
      );
    }

    const orderItem =
      await tx.query.reportAccessOrderItems.findFirst({
        where: and(
          eq(
            reportAccessOrderItems.orderId,
            currentOrder.id,
          ),
          isNull(
            reportAccessOrderItems.deletedAt,
          ),
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
          eq(
            reportAccessProducts.id,
            orderItem.productId,
          ),
          isNull(
            reportAccessProducts.deletedAt,
          ),
        ),
      });

    if (!product) {
      throw new Error(
        "Nie znaleziono produktu przypisanego do zamówienia.",
      );
    }

    if (
      product.id !== metadata.productId ||
      orderItem.quantity !== metadata.quantity
    ) {
      throw new Error(
        "Produkt albo ilość w zamówieniu są niespójne.",
      );
    }

    const expectedGeneratedAccessCount =
      Math.max(
        Number(product.accessCount ?? 1),
        1,
      ) * orderItem.quantity;

    if (
      expectedGeneratedAccessCount !==
      metadata.generatedAccessCount
    ) {
      throw new Error(
        "Liczba generowanych dostępów jest niespójna z produktem.",
      );
    }

    const now = new Date();

    const validUntil = buildValidUntil(
      now,
      product.validityDays,
    );

    const codeRows = Array.from(
      {
        length:
          expectedGeneratedAccessCount,
      },
      () => {
        const rawCode =
          generateRawReportAccessCode();

        return {
          productId: product.id,
          orderId: currentOrder.id,

          codeHash:
            hashReportAccessCode(rawCode),

          codePreview:
            buildCodePreview(rawCode),

          status: "available",

          tenantSlug:
            currentOrder.tenantSlug,

          tenantId:
            currentOrder.tenantId,

          ownerUserId: null,

          purchasedByUserId:
            currentOrder.buyerUserId,

          assignedToEmail: null,
          assignedToUserId: null,

          subjectType: null,
          subjectId: null,

          assessmentProjectId: null,
          assessmentSessionId: null,
          assessmentAccessLinkId: null,

          redeemedByUserId: null,
          redeemedAt: null,

          validFrom: now,
          validUntil,

          metadata: {
            paymentProvider:
              "przelewy24",

            paymentProviderOrderId:
              String(providerOrderId),

            source:
              "tenant_purchase",

            productCode: product.code,
            productName: product.name,

            orderQuantity:
              orderItem.quantity,

            productAccessCount:
              Math.max(
                Number(
                  product.accessCount ?? 1,
                ),
                1,
              ),

            discountRedemptionId:
              metadata.discount
                ?.redemptionId ?? null,
          },

          createdAt: now,
          updatedAt: now,

          createdBy:
            currentOrder.buyerUserId,

          updatedBy:
            currentOrder.buyerUserId,
        };
      },
    );

    await tx
      .insert(reportAccessCodes)
      .values(codeRows);

    const [paidOrder] = await tx
      .update(reportAccessOrders)
      .set({
        status: "paid",

        paymentProviderOrderId:
          String(providerOrderId),

        paidAt: now,
        updatedAt: now,

        updatedBy:
          currentOrder.buyerUserId,
      })
      .where(
        and(
          eq(
            reportAccessOrders.id,
            currentOrder.id,
          ),

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

          isNull(
            reportAccessOrders.deletedAt,
          ),
        ),
      )
      .returning({
        id: reportAccessOrders.id,
      });

    if (!paidOrder) {
      throw new Error(
        "Nie udało się oznaczyć zamówienia tenantowego jako opłaconego.",
      );
    }

    return {
      status: "fulfilled",
      generatedAccessCount:
        expectedGeneratedAccessCount,
    };
  });
}