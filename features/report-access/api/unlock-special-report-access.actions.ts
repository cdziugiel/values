"use server";

import {
  createHash,
  randomUUID,
} from "crypto";

import {
  and,
  eq,
  inArray,
  isNull,
} from "drizzle-orm";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isRedirectError,
} from "next/dist/client/components/redirect-error";
import { z } from "zod";

import {
  reportAccessCodes,
  reportAccessGrants,
  reportAccessOrderItems,
  reportAccessOrders,
  reportAccessProducts,
} from "@/drizzle/schema";

import {
  redeemDiscountForCheckout,
} from "@/features/discount-codes/api/discount-code.mutations";

import {
  buildPrzelewy24PaymentUrl,
  registerPrzelewy24Transaction,
} from "@/features/payments";

import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import { env } from "@/shared/config/env";

import {
  getComparisonSpecialReportUnlockOffer,
} from "@/features/report-access/api/special-report-access.queries";

const unlockComparisonSpecialReportSchema =
  z.object({
    tenantSlug: z.string().min(1),
    productId: z.string().uuid(),
    reportTemplateVersionId:
      z.string().uuid(),
  });

export type UnlockSpecialReportAccessState = {
  status: "idle" | "error";
  message: string;
};

function fail(
  error: unknown,
): UnlockSpecialReportAccessState {
  if (isRedirectError(error)) {
    throw error;
  }

  return {
    status: "error",

    message:
      error instanceof Error
        ? error.message
        : "Nie udało się odblokować raportu.",
  };
}

function normalizeString(
  value: FormDataEntryValue | null,
) {
  return String(value ?? "").trim();
}

function normalizeOptionalString(
  value: FormDataEntryValue | null,
) {
  const normalized =
    normalizeString(value);

  return normalized || null;
}

function normalizeAccessCode(
  value: FormDataEntryValue | null,
) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function hashAccessCode(
  code: string,
) {
  return createHash("sha256")
    .update(code)
    .digest("hex");
}

function asRecord(
  value: unknown,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<
    string,
    unknown
  >;
}

function moneyToNumber(
  value: unknown,
) {
  const numberValue =
    Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

function moneyToCents(
  value: unknown,
) {
  return Math.round(
    moneyToNumber(value) * 100,
  );
}

function centsToMoneyString(
  value: number,
) {
  return (
    Math.max(value, 0) / 100
  ).toFixed(2);
}

function moneyString(
  value: unknown,
) {
  return moneyToNumber(
    value,
  ).toFixed(2);
}

function calculateVatAmount({
  priceNet,
  priceGross,
}: {
  priceNet: unknown;
  priceGross: unknown;
}) {
  const net =
    moneyToNumber(priceNet);

  const gross =
    moneyToNumber(priceGross);

  return Math.max(
    gross - net,
    0,
  ).toFixed(2);
}

function calculateDiscountedTotals({
  originalNet,
  originalGross,
  finalGrossCents,
}: {
  originalNet: unknown;
  originalGross: unknown;
  finalGrossCents: number;
}) {
  const originalNetCents =
    moneyToCents(originalNet);

  const originalGrossCents =
    moneyToCents(originalGross);

  if (
    originalGrossCents <= 0 ||
    finalGrossCents <= 0
  ) {
    return {
      totalNet: "0.00",
      totalVat: "0.00",
      totalGross: "0.00",
    };
  }

  const finalNetCents =
    Math.min(
      finalGrossCents,

      Math.round(
        originalNetCents *
          finalGrossCents /
          originalGrossCents,
      ),
    );

  const finalVatCents =
    Math.max(
      finalGrossCents -
        finalNetCents,
      0,
    );

  return {
    totalNet:
      centsToMoneyString(
        finalNetCents,
      ),

    totalVat:
      centsToMoneyString(
        finalVatCents,
      ),

    totalGross:
      centsToMoneyString(
        finalGrossCents,
      ),
  };
}

function withoutTrailingSlash(
  value: string,
) {
  return value.replace(
    /\/+$/,
    "",
  );
}

function buildPaymentReturnUrl({
  orderId,
}: {
  orderId: string;
}) {
  return (
    `${withoutTrailingSlash(
      env.APP_URL,
    )}` +
    `/my/payments/${encodeURIComponent(
      orderId,
    )}/return`
  );
}

function buildPaymentStatusUrl() {
  return (
    `${withoutTrailingSlash(
      env.APP_URL,
    )}` +
    "/api/webhooks/przelewy24"
  );
}

function buildCompareHref({
  productId,
  reportTemplateVersionId,
}: {
  productId: string;
  reportTemplateVersionId: string;
}) {
  const params =
    new URLSearchParams({
      product:
        productId,

      reportTemplateVersionId,
    });

  return (
    "/my/assessment/compare?" +
    params.toString()
  );
}

async function resolveComparisonUnlockContext(
  formData: FormData,
) {
  const parsed =
    unlockComparisonSpecialReportSchema
      .safeParse({
        tenantSlug:
          normalizeString(
            formData.get(
              "tenantSlug",
            ),
          ),

        productId:
          normalizeString(
            formData.get(
              "productId",
            ),
          ),

        reportTemplateVersionId:
          normalizeString(
            formData.get(
              "reportTemplateVersionId",
            ),
          ),
      });

  if (!parsed.success) {
    throw new Error(
      "Nieprawidłowe dane odblokowania raportu.",
    );
  }

  const session =
    await requireSession();

  const actorUserId =
    session.user.id;

  const actorEmail =
    session.user.email
      ?.trim()
      .toLowerCase() ??
    null;

  if (
    !actorUserId ||
    !actorEmail
  ) {
    throw new Error(
      "Musisz być zalogowany, aby odblokować raport.",
    );
  }

  /**
   * Dopiero po sprawdzeniu actorEmail TypeScript wie,
   * że actorEmail jest stringiem.
   */
  const actorName: string =
    session.user.name?.trim() ||
    actorEmail;

  const offer =
    await getComparisonSpecialReportUnlockOffer({
      tenantSlug:
        parsed.data.tenantSlug,

      productId:
        parsed.data.productId,

      reportTemplateVersionId:
        parsed.data
          .reportTemplateVersionId,
    });

  if (!offer.ok) {
    throw new Error(
      offer.message,
    );
  }

  const href =
    buildCompareHref({
      productId:
        offer.product.id,

      reportTemplateVersionId:
        offer
          .reportTemplateVersion
          .id,
    });

  if (offer.hasAccess) {
    redirect(href);
  }

  return {
    actorUserId,
    actorEmail,
    actorName,

    offer,
    href,
  };
}

/**
 * Zakup raportu porównawczego:
 * - kod rabatowy 100% -> natychmiastowy grant,
 * - pozostałe przypadki -> Przelewy24,
 * - grant po płatności tworzy webhook.
 */
export async function unlockComparisonSpecialReportAccessAction(
  _previousState:
    UnlockSpecialReportAccessState,

  formData: FormData,
): Promise<UnlockSpecialReportAccessState> {
  try {
    const {
      actorUserId,
      actorEmail,
      actorName,
      offer,
      href,
    } =
      await resolveComparisonUnlockContext(
        formData,
      );

    const product =
      offer.product;

    const currency =
      String(
        product.currency ??
          "PLN",
      ).toUpperCase();

    if (currency !== "PLN") {
      throw new Error(
        "Płatność online jest obecnie dostępna wyłącznie w PLN.",
      );
    }

    const originalGrossCents =
      moneyToCents(
        product.priceGross,
      );

    const discountCode =
      normalizeOptionalString(
        formData.get(
          "discountCode",
        ),
      );

    let discountRedemptionId:
      | string
      | null = null;

    let discountAmountCents = 0;

    let finalGrossCents =
      originalGrossCents;

    let isFullyDiscounted =
      false;

    if (discountCode) {
      const discount =
        await redeemDiscountForCheckout({
          code: discountCode,

          context:
            "report_unlock",

          originalAmountCents:
            originalGrossCents,

          currency: "PLN",

          userId:
            actorUserId,

          tenantId: null,

          assessmentSessionId:
            null,
        });

      if (!discount.ok) {
        throw new Error(
          discount.message,
        );
      }

      discountRedemptionId =
        discount.redemptionId;

      discountAmountCents =
        discount
          .discountAmountCents;

      finalGrossCents =
        discount
          .finalAmountCents;

      isFullyDiscounted =
        discount
          .isFullyDiscounted;
    }

    const {
      totalNet,
      totalVat,
      totalGross,
    } =
      calculateDiscountedTotals({
        originalNet:
          product.priceNet,

        originalGross:
          product.priceGross,

        finalGrossCents,
      });

    const originalNet =
      moneyString(
        product.priceNet,
      );

    const originalGross =
      moneyString(
        product.priceGross,
      );

    const originalVat =
      calculateVatAmount({
        priceNet:
          product.priceNet,

        priceGross:
          product.priceGross,
      });

    const now =
      new Date();

    const validUntil =
      typeof product.validityDays ===
        "number" &&
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

    const orderMetadata = {
      purchaseFlow:
        "special_comparison",

      reportKind:
        "comparison",

      mode:
        "comparison",

      tenantSlug:
        offer.tenantSlug,

      reportTemplateId:
        offer.reportTemplate.id,

      reportTemplateVersionId:
        offer
          .reportTemplateVersion
          .id,

      productId:
        product.id,

      productCode:
        product.code,

      productName:
        product.name,

      discount:
        discountRedemptionId
          ? {
              redemptionId:
                discountRedemptionId,

              originalGrossCents,

              discountAmountCents,

              finalGrossCents,
            }
          : null,
    };

    /**
     * Rabat 100%.
     */
    if (isFullyDiscounted) {
      await controlDb.transaction(
        async (tx) => {
          const [order] =
            await tx
              .insert(
                reportAccessOrders,
              )
              .values({
                buyerType:
                  "user",

                tenantSlug:
                  offer.tenantSlug,

                buyerUserId:
                  actorUserId,

                status:
                  "paid",

                paymentProvider:
                  "discount",

                paymentProviderOrderId:
                  `discount:${randomUUID()}`,

                paymentProviderSessionId:
                  null,

                currency,

                totalNet,
                totalVat,
                totalGross,

                invoiceRequested:
                  false,

                billingSnapshot:
                  {},

                metadata:
                  orderMetadata,

                paidAt: now,

                createdAt: now,
                updatedAt: now,

                createdBy:
                  actorUserId,

                updatedBy:
                  actorUserId,
              })
              .returning({
                id:
                  reportAccessOrders.id,
              });

          if (!order) {
            throw new Error(
              "Nie udało się utworzyć zamówienia.",
            );
          }

          await tx
            .insert(
              reportAccessOrderItems,
            )
            .values({
              orderId:
                order.id,

              productId:
                product.id,

              quantity: 1,

              unitNet:
                originalNet,

              unitVat:
                originalVat,

              unitGross:
                originalGross,

              totalNet,
              totalVat,
              totalGross,

              createdAt: now,
              updatedAt: now,
            });

          await tx
            .insert(
              reportAccessGrants,
            )
            .values({
              tenantSlug:
                offer.tenantSlug,

              productId:
                product.id,

              orderId:
                order.id,

              reportTemplateId:
                offer
                  .reportTemplate
                  .id,

              reportTemplateVersionId:
                offer
                  .reportTemplateVersion
                  .id,

              userId:
                actorUserId,

              email:
                actorEmail,

              source:
                "discount",

              status:
                "active",

              validFrom:
                now,

              validUntil,

              metadata: {
                ...orderMetadata,

                creditStatus:
                  "available",

                orderId:
                  order.id,

                unlockedFrom:
                  "my_special_reports",

                unlockedAt:
                  now.toISOString(),
              },

              createdAt: now,
              updatedAt: now,

              createdBy:
                actorUserId,

              updatedBy:
                actorUserId,
            });
        },
      );

      revalidatePath(
        "/my/assessment",
      );

      redirect(href);
    }

    /**
     * Płatność Przelewy24.
     */
    const paymentSessionId =
      `humanet:comparison:${randomUUID()}`;

    const [order] =
      await controlDb.transaction(
        async (tx) => {
          const [createdOrder] =
            await tx
              .insert(
                reportAccessOrders,
              )
              .values({
                buyerType:
                  "user",

                tenantSlug:
                  offer.tenantSlug,

                buyerUserId:
                  actorUserId,

                status:
                  "pending_payment",

                paymentProvider:
                  "przelewy24",

                paymentProviderOrderId:
                  null,

                paymentProviderSessionId:
                  paymentSessionId,

                currency,

                totalNet,
                totalVat,
                totalGross,

                invoiceRequested:
                  false,

                billingSnapshot:
                  {},

                metadata:
                  orderMetadata,

                paidAt:
                  null,

                createdAt:
                  now,

                updatedAt:
                  now,

                createdBy:
                  actorUserId,

                updatedBy:
                  actorUserId,
              })
              .returning({
                id:
                  reportAccessOrders.id,
              });

          if (!createdOrder) {
            throw new Error(
              "Nie udało się utworzyć zamówienia.",
            );
          }

          await tx
            .insert(
              reportAccessOrderItems,
            )
            .values({
              orderId:
                createdOrder.id,

              productId:
                product.id,

              quantity: 1,

              unitNet:
                originalNet,

              unitVat:
                originalVat,

              unitGross:
                originalGross,

              totalNet,
              totalVat,
              totalGross,

              createdAt:
                now,

              updatedAt:
                now,
            });

          return [
            createdOrder,
          ] as const;
        },
      );

    try {
      const registration =
        await registerPrzelewy24Transaction({
          sessionId:
            paymentSessionId,

          amount:
            finalGrossCents,

          currency,

          description:
            `HUMANET — ${product.name}`,

          email:
            actorEmail,

          client:
            actorName,

          country:
            "PL",

          language:
            "pl",

          urlReturn:
            buildPaymentReturnUrl({
              orderId:
                order.id,
            }),

          urlStatus:
            buildPaymentStatusUrl(),
        });

      await controlDb
        .update(
          reportAccessOrders,
        )
        .set({
          updatedAt:
            new Date(),

          updatedBy:
            actorUserId,

          metadata: {
            ...orderMetadata,

            payment: {
              status:
                "registered",

              provider:
                "przelewy24",

              token:
                registration.token,

              registeredAt:
                new Date()
                  .toISOString(),
            },
          },
        })
        .where(
          eq(
            reportAccessOrders.id,
            order.id,
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

      await controlDb
        .update(
          reportAccessOrders,
        )
        .set({
          status:
            "failed",

          updatedAt:
            new Date(),

          updatedBy:
            actorUserId,

          metadata: {
            ...orderMetadata,

            payment: {
              status:
                "registration_failed",

              failedAt:
                new Date()
                  .toISOString(),

              message:
                error instanceof Error
                  ? error.message
                  : null,
            },
          },
        })
        .where(
          eq(
            reportAccessOrders.id,
            order.id,
          ),
        );

      throw new Error(
        "Nie udało się rozpocząć płatności. Spróbuj ponownie.",
      );
    }
  } catch (error) {
    return fail(error);
  }
}

/**
 * Kod dostępu, nie kod rabatowy.
 */
export async function redeemComparisonSpecialReportAccessCodeAction(
  _previousState:
    UnlockSpecialReportAccessState,

  formData: FormData,
): Promise<UnlockSpecialReportAccessState> {
  try {
    const {
      actorUserId,
      actorEmail,
      offer,
      href,
    } =
      await resolveComparisonUnlockContext(
        formData,
      );

    const accessCodeValue =
      normalizeAccessCode(
        formData.get(
          "accessCode",
        ),
      );

    if (!accessCodeValue) {
      throw new Error(
        "Wpisz kod dostępu.",
      );
    }

    const codeHash =
      hashAccessCode(
        accessCodeValue,
      );

    const accessCode =
      await controlDb.query
        .reportAccessCodes
        .findFirst({
          where: and(
            eq(
              reportAccessCodes.codeHash,
              codeHash,
            ),

            isNull(
              reportAccessCodes.deletedAt,
            ),
          ),
        });

    if (!accessCode) {
      throw new Error(
        "Nie znaleziono takiego kodu dostępu.",
      );
    }

    if (
      accessCode.status !==
        "available" &&
      accessCode.status !==
        "assigned"
    ) {
      throw new Error(
        "Ten kod został już wykorzystany albo nie jest aktywny.",
      );
    }

    if (
      accessCode.tenantSlug &&
      accessCode.tenantSlug !==
        offer.tenantSlug
    ) {
      throw new Error(
        "Ten kod nie jest przypisany do tej organizacji.",
      );
    }

    const now =
      new Date();

    if (
      accessCode.validFrom &&
      accessCode.validFrom > now
    ) {
      throw new Error(
        "Ten kod nie jest jeszcze aktywny.",
      );
    }

    if (
      accessCode.validUntil &&
      accessCode.validUntil < now
    ) {
      throw new Error(
        "Ten kod wygasł.",
      );
    }

    if (
      accessCode.assignedToUserId &&
      accessCode.assignedToUserId !==
        actorUserId
    ) {
      throw new Error(
        "Ten kod jest przypisany do innego konta.",
      );
    }

    if (
      accessCode.assignedToEmail &&
      accessCode.assignedToEmail
        .trim()
        .toLowerCase() !==
        actorEmail
    ) {
      throw new Error(
        "Ten kod jest przypisany do innego adresu e-mail.",
      );
    }

    const codeProduct =
      await controlDb.query
        .reportAccessProducts
        .findFirst({
          where: and(
            eq(
              reportAccessProducts.id,
              accessCode.productId,
            ),

            eq(
              reportAccessProducts.status,
              "active",
            ),

            isNull(
              reportAccessProducts.deletedAt,
            ),
          ),
        });

    if (!codeProduct) {
      throw new Error(
        "Produkt przypisany do kodu nie jest aktywny.",
      );
    }

    if (
      codeProduct.reportTemplateId !==
      offer.reportTemplate.id
    ) {
      throw new Error(
        "Ten kod dotyczy innego raportu.",
      );
    }

    const validUntil =
      typeof codeProduct.validityDays ===
        "number" &&
      codeProduct.validityDays > 0
        ? new Date(
            now.getTime() +
              codeProduct.validityDays *
                24 *
                60 *
                60 *
                1000,
          )
        : null;

    await controlDb.transaction(
      async (tx) => {
        const [claimedCode] =
          await tx
            .update(
              reportAccessCodes,
            )
            .set({
              status:
                "redeemed",

              redeemedByUserId:
                actorUserId,

              redeemedAt:
                now,

              updatedAt:
                now,

              updatedBy:
                actorUserId,
            })
            .where(
              and(
                eq(
                  reportAccessCodes.id,
                  accessCode.id,
                ),

                inArray(
                  reportAccessCodes.status,
                  [
                    "available",
                    "assigned",
                  ],
                ),

                isNull(
                  reportAccessCodes.deletedAt,
                ),
              ),
            )
            .returning({
              id:
                reportAccessCodes.id,
            });

        if (!claimedCode) {
          throw new Error(
            "Kod został wykorzystany przez inną operację.",
          );
        }

        const [grant] =
          await tx
            .insert(
              reportAccessGrants,
            )
            .values({
              tenantSlug:
                offer.tenantSlug,

              productId:
                codeProduct.id,

              accessCodeId:
                accessCode.id,

              reportTemplateId:
                offer.reportTemplate.id,

              reportTemplateVersionId:
                offer
                  .reportTemplateVersion
                  .id,

              userId:
                actorUserId,

              email:
                actorEmail,

              source:
                "access_code",

              status:
                "active",

              validFrom:
                now,

              validUntil,

              metadata: {
                purchaseFlow:
                  "special_comparison",

                reportKind:
                  "comparison",

                mode:
                  "comparison",

                creditStatus:
                  "available",

                accessCodePreview:
                  accessCode.codePreview,

                productCode:
                  codeProduct.code,

                productName:
                  codeProduct.name,

                unlockedFrom:
                  "my_special_reports",

                unlockedAt:
                  now.toISOString(),
              },

              createdAt:
                now,

              updatedAt:
                now,

              createdBy:
                actorUserId,

              updatedBy:
                actorUserId,
            })
            .returning({
              id:
                reportAccessGrants.id,
            });

        if (!grant) {
          throw new Error(
            "Nie udało się utworzyć dostępu do raportu.",
          );
        }

        await tx
          .update(
            reportAccessCodes,
          )
          .set({
            metadata: {
              ...asRecord(
                accessCode.metadata,
              ),

              grantId:
                grant.id,

              purchaseFlow:
                "special_comparison",

              reportKind:
                "comparison",

              reportTemplateVersionId:
                offer
                  .reportTemplateVersion
                  .id,

              redeemedFrom:
                "my_special_reports",

              redeemedAt:
                now.toISOString(),
            },

            updatedAt:
              now,

            updatedBy:
              actorUserId,
          })
          .where(
            eq(
              reportAccessCodes.id,
              accessCode.id,
            ),
          );
      },
    );

    revalidatePath(
      "/my/assessment",
    );

    redirect(href);
  } catch (error) {
    return fail(error);
  }
}