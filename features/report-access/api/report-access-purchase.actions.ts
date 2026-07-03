// features/report-access/api/report-access-purchase.actions.ts
"use server";


import { createHash, randomBytes, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import {
  billingProfiles,
  reportAccessCodes,
  reportAccessProducts,
} from "@/drizzle/schema";
import {
  buildPrzelewy24PaymentUrl,
  registerPrzelewy24Transaction,
} from "@/features/payments";

import { env } from "@/shared/config/env";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";
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
  getReportAccessOfferForCompletedSessionAndReportVersion,
} from "./report-access.queries";

import { redeemDiscountForCheckout } from "@/features/discount-codes/api/discount-code.mutations";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export type UnlockReportAccessActionState = {
  status: "idle" | "success" | "error";
  message: string;
};


function moneyToCents(value: unknown) {
  return Math.round(moneyToNumber(value) * 100);
}

function centsToMoneyString(value: number) {
  return (Math.max(value, 0) / 100).toFixed(2);
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
  const originalNetCents = moneyToCents(originalNet);
  const originalGrossCents = moneyToCents(originalGross);

  if (originalGrossCents <= 0 || finalGrossCents <= 0) {
    return {
      totalNet: "0.00",
      totalVat: "0.00",
      totalGross: "0.00",
    };
  }

  const finalNetCents = Math.min(
    finalGrossCents,
    Math.round((originalNetCents * finalGrossCents) / originalGrossCents),
  );

  const finalVatCents = Math.max(finalGrossCents - finalNetCents, 0);

  return {
    totalNet: centsToMoneyString(finalNetCents),
    totalVat: centsToMoneyString(finalVatCents),
    totalGross: centsToMoneyString(finalGrossCents),
  };
}

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
  mode,
  productId,
  projectQuestionnaireId,
  questionnaireVersionId,
}: {
  sessionId: string;
  reportTemplateVersionId: string;
  tenantSlug: string;
  mode?: string | null;
  productId?: string | null;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  if (mode === "comparison") {
    return `/my/assessment/compare?product=${encodeURIComponent(
      productId ?? "",
    )}&reportTemplateVersionId=${encodeURIComponent(
      reportTemplateVersionId,
    )}&ownSessionId=${encodeURIComponent(sessionId)}`;
  }

  const params = new URLSearchParams({
    tenant: tenantSlug,
  });

  if (projectQuestionnaireId) {
    params.set("projectQuestionnaireId", projectQuestionnaireId);
  }

  if (questionnaireVersionId) {
    params.set("questionnaireVersionId", questionnaireVersionId);
  }

  return `/my/assessment/sessions/${sessionId}/report/${reportTemplateVersionId}?${params.toString()}`;
}

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function buildPaymentReturnUrl({
  orderId,
}: {
  orderId: string;
}): string {
  return `${withoutTrailingSlash(
    env.APP_URL,
  )}/my/payments/${encodeURIComponent(orderId)}/return`;
}

function buildPaymentStatusUrl(): string {
  return `${withoutTrailingSlash(
    env.APP_URL,
  )}/api/webhooks/przelewy24`;
}

export async function unlockReportAccessPlaceholderAction(
  _previousState: UnlockReportAccessActionState,
  formData: FormData,
): Promise<UnlockReportAccessActionState> {


  const authSession = await requireSession();

  const tenantSlug = normalizeString(formData.get("tenantSlug"));
  const sessionId = normalizeString(formData.get("sessionId"));

  const mode = normalizeString(formData.get("mode")) || "standard";

  const projectQuestionnaireIdFromInput =
    normalizeOptionalString(formData.get("projectQuestionnaireId"));

  const questionnaireVersionIdFromInput =
    normalizeOptionalString(formData.get("questionnaireVersionId"));

  const productIdFromInput = normalizeOptionalString(formData.get("productId"));

  const reportTemplateVersionIdFromInput = normalizeOptionalString(
    formData.get("reportTemplateVersionId"),
  );


  if (!tenantSlug || !sessionId) {
    return fail("Brakuje danych sesji lub tenanta.");
  }

  const offer =
    mode === "comparison" && reportTemplateVersionIdFromInput
      ? await getReportAccessOfferForCompletedSessionAndReportVersion({
        tenantSlug,
        sessionId,
        reportTemplateVersionId: reportTemplateVersionIdFromInput,
        expectedKind: "comparison",
      })
      : await getReportAccessOfferForCompletedSession({
        tenantSlug,
        sessionId,
        expectedKind: "personal",
        projectQuestionnaireId: projectQuestionnaireIdFromInput,
        questionnaireVersionId: questionnaireVersionIdFromInput,
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
      projectQuestionnaireId: projectQuestionnaireIdFromInput,
      questionnaireVersionId: questionnaireVersionIdFromInput,
    }));

  if (existingGrant) {
    const href = buildReportHref({
      sessionId,
      tenantSlug,
      reportTemplateVersionId: existingGrant.reportTemplateVersionId,
      mode,
      productId: productIdFromInput ?? offer.product?.id ?? null,
      projectQuestionnaireId: projectQuestionnaireIdFromInput,
      questionnaireVersionId: questionnaireVersionIdFromInput,
    });



    redirect(href);
  }

  /**
   * Dodatkowe zabezpieczenie:
   * ponieważ unikalność grantu masz po:
   * assessmentSessionId + reportTemplateId + active,
   * sprawdzamy też po typie raportu.
   */
  /* const existingGrantByReportType =
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
      mode,
      productId: productIdFromInput ?? offer.product?.id ?? null,
    }),
  );
} */

  const now = new Date();
  const discountCode = normalizeOptionalString(formData.get("discountCode"));

  const originalGrossCents = moneyToCents(offer.product.priceGross);

  let discountRedemptionId: string | null = null;
  let discountAmountCents = 0;
  let finalGrossCents = originalGrossCents;
  let isFullyDiscounted = false;

  if (discountCode) {
    const discount = await redeemDiscountForCheckout({
      code: discountCode,
      context: "report_unlock",
      originalAmountCents: originalGrossCents,
      currency: "PLN",
      userId: authSession.user.id,
      tenantId: null,
      assessmentSessionId: sessionId,
    });

    if (!discount.ok) {


      return fail(discount.message);
    }

    discountRedemptionId = discount.redemptionId;
    discountAmountCents = discount.discountAmountCents;
    finalGrossCents = discount.finalAmountCents;
    isFullyDiscounted = discount.isFullyDiscounted;
  }

  const { totalNet, totalVat, totalGross } = calculateDiscountedTotals({
    originalNet: offer.product.priceNet,
    originalGross: offer.product.priceGross,
    finalGrossCents,
  });

  const originalNet = moneyString(offer.product.priceNet);
  const originalGross = moneyString(offer.product.priceGross);
  const originalVat = calculateVatAmount({
    priceNet: offer.product.priceNet,
    priceGross: offer.product.priceGross,
  });

  const currency = (
    offer.product.currency ?? "PLN"
  ).toUpperCase();

  const paymentSessionId = `humanet:${randomUUID()}`;

  const orderMetadata = {
    paidByDiscount: isFullyDiscounted,
    tenantSlug,
    mode,

    reportKind:
      mode === "comparison"
        ? "comparison"
        : "personal",

    assessmentSessionId: sessionId,

    projectQuestionnaireId:
      projectQuestionnaireIdFromInput,

    questionnaireVersionId:
      questionnaireVersionIdFromInput,

    reportScope: {
      type: "project_questionnaire",
      projectQuestionnaireId:
        projectQuestionnaireIdFromInput,
      questionnaireVersionId:
        questionnaireVersionIdFromInput,
    },

    reportTemplateId:
      offer.reportVersion.reportTemplateId,

    reportTemplateVersionId:
      offer.reportVersion.reportTemplateVersionId,

    productId: offer.product.id,
    productCode: offer.product.code,
    productName: offer.product.name,

    discount: discountRedemptionId
      ? {
        redemptionId: discountRedemptionId,
        originalGrossCents,
        discountAmountCents,
        finalGrossCents,
      }
      : null,
  };

  const [order] = await controlDb
    .insert(reportAccessOrders)
    .values({
      buyerType: "user",

      tenantSlug,
      buyerUserId: authSession.user.id,

      status: isFullyDiscounted
        ? "paid"
        : "pending_payment",

      paymentProvider: isFullyDiscounted
        ? "discount"
        : "przelewy24",

      paymentProviderOrderId: isFullyDiscounted
        ? `discount:${randomUUID()}`
        : null,

      paymentProviderSessionId: isFullyDiscounted
        ? null
        : paymentSessionId,

      currency,

      totalNet,
      totalVat,
      totalGross,

      invoiceRequested: false,
      billingSnapshot: {},

      metadata: orderMetadata,

      paidAt: isFullyDiscounted ? now : null,

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

    unitNet: originalNet,
    unitVat: originalVat,
    unitGross: originalGross,

    totalNet,
    totalVat,
    totalGross,

    createdAt: now,
    updatedAt: now,
  });

  /**
   * Zamówienie pokryte w 100% rabatem nie trafia do P24.
   * Możemy od razu przyznać dostęp.
   */



  if (isFullyDiscounted) {
    const validUntil =
      typeof offer.product.validityDays === "number" &&
        offer.product.validityDays > 0
        ? new Date(
          now.getTime() +
          offer.product.validityDays *
          24 *
          60 *
          60 *
          1000,
        )
        : null;




    const [grant] = await controlDb
      .insert(reportAccessGrants)
      .values({
        source: "discount",
        status: "active",

        productId: offer.product.id,
        orderId: order.id,

        reportTemplateId:
          offer.reportVersion.reportTemplateId,

        reportTemplateVersionId:
          offer.reportVersion.reportTemplateVersionId,

        tenantSlug,
        userId: authSession.user.id,
        email: authSession.user.email ?? null,

        assessmentSessionId: sessionId,

        validFrom: now,
        validUntil,

        metadata: orderMetadata,

        createdAt: now,
        updatedAt: now,
        createdBy: authSession.user.id,
        updatedBy: authSession.user.id,
      })
      .returning({
        id: reportAccessGrants.id,
        reportTemplateVersionId:
          reportAccessGrants.reportTemplateVersionId,
      });

    const href = buildReportHref({
      sessionId,
      tenantSlug,
      reportTemplateVersionId:
        grant.reportTemplateVersionId,
      mode,
      productId:
        productIdFromInput ?? offer.product.id,
      projectQuestionnaireId:
        projectQuestionnaireIdFromInput,
      questionnaireVersionId:
        questionnaireVersionIdFromInput,
    });

    redirect(href);
  }

  /**
   * Płatność większa niż 0 zł:
   * rejestrujemy transakcję w P24.
   */

  if (!authSession.user.email) {
    await controlDb
      .update(reportAccessOrders)
      .set({
        status: "failed",
        updatedAt: new Date(),
        updatedBy: authSession.user.id,
        metadata: {
          ...orderMetadata,

          payment: {
            status: "registration_failed",
            errorCode: "missing_user_email",
            failedAt: new Date().toISOString(),
          },
        },
      })
      .where(eq(reportAccessOrders.id, order.id));

    return fail(
      "Do rozpoczęcia płatności wymagany jest adres e-mail użytkownika.",
    );
  }

  try {
    const registration =
      await registerPrzelewy24Transaction({
        sessionId: paymentSessionId,
        amount: finalGrossCents,
        currency,

        description: `HUMANET — ${offer.product.name}`,

        email: authSession.user.email,
        client:
          authSession.user.name ??
          authSession.user.email,

        country: "PL",
        language: "pl",

        urlReturn: buildPaymentReturnUrl({
          orderId: order.id,
        }),

        urlStatus: buildPaymentStatusUrl(),
      });

    await controlDb
      .update(reportAccessOrders)
      .set({
        updatedAt: new Date(),
        updatedBy: authSession.user.id,

        metadata: {
          ...orderMetadata,

          payment: {
            status: "registered",
            provider: "przelewy24",
            token: registration.token,
            registeredAt: new Date().toISOString(),
          },
        },
      })
      .where(eq(reportAccessOrders.id, order.id));

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
        updatedBy: authSession.user.id,

        metadata: {
          ...orderMetadata,

          payment: {
            status: "registration_failed",
            errorCode:
              error instanceof Error
                ? error.name
                : "UnknownError",
            failedAt: failedAt.toISOString(),
          },
        },
      })
      .where(eq(reportAccessOrders.id, order.id));

    console.error(
      "P24_TRANSACTION_REGISTRATION_FAILED",
      {
        orderId: order.id,
        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );

    return fail(
      "Nie udało się rozpocząć płatności. Spróbuj ponownie.",
    );
  }
}


export type ReportAccessPurchaseState = {
  status: "idle" | "success" | "error";
  message: string;
};

function purchaseFail(message: string): ReportAccessPurchaseState {
  return {
    status: "error",
    message,
  };
}

function normalizeOptionalString(value: FormDataEntryValue | null) {
  const normalized = normalizeString(value);

  return normalized || null;
}

function checkboxValue(value: FormDataEntryValue | null) {
  return value === "on" || value === "true" || value === "1";
}

function generateRawReportAccessCode() {
  const partA = randomBytes(3).toString("hex").toUpperCase();
  const partB = randomBytes(3).toString("hex").toUpperCase();
  const partC = randomBytes(3).toString("hex").toUpperCase();

  return `HV-${partA}-${partB}-${partC}`;
}

function hashReportAccessCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function buildCodePreview(code: string) {
  return `${code.slice(0, 6)}…${code.slice(-4)}`;
}

function buildValidUntil(now: Date, validityDays: number | null) {
  if (!validityDays || validityDays <= 0) {
    return null;
  }

  return new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
}

export async function purchaseTenantReportAccessAction(
  _previousState: ReportAccessPurchaseState,
  formData: FormData,
): Promise<ReportAccessPurchaseState> {
  const tenantSlug = normalizeString(formData.get("tenantSlug"));
  const productId = normalizeString(formData.get("productId"));
  const quantity = Number(formData.get("quantity") ?? 0);
  const authSession =
    await requireSession();

  if (!tenantSlug || !productId) {
    return purchaseFail("Brakuje produktu lub tenanta.");
  }

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) {
    return purchaseFail("Podaj liczbę od 1 do 500.");
  }

  const ctx = await requireTenantContext({ tenantSlug });

  requirePermission(ctx, "assessment_project:read");

  const product = await controlDb.query.reportAccessProducts.findFirst({
    where: and(
      eq(reportAccessProducts.id, productId),
      eq(reportAccessProducts.status, "active"),
      isNull(reportAccessProducts.deletedAt),
    ),
  });

  if (!product) {
    return purchaseFail("Wybrany produkt nie jest już dostępny.");
  }

  const now = new Date();

  const accessCountPerProduct = Math.max(Number(product.accessCount ?? 1), 1);
  const generatedAccessCount = quantity * accessCountPerProduct;

  const unitNetNumber = moneyToNumber(product.priceNet);
  const unitGrossNumber = moneyToNumber(product.priceGross);
  const unitVatNumber = Math.max(unitGrossNumber - unitNetNumber, 0);



  const originalTotalNetNumber = unitNetNumber * quantity;
  const originalTotalGrossNumber = unitGrossNumber * quantity;
  const originalTotalVatNumber = unitVatNumber * quantity;

  const unitNet = moneyString(unitNetNumber);
  const unitVat = moneyString(unitVatNumber);
  const unitGross = moneyString(unitGrossNumber);

  const originalTotalNet = moneyString(originalTotalNetNumber);
  const originalTotalVat = moneyString(originalTotalVatNumber);
  const originalTotalGross = moneyString(originalTotalGrossNumber);

  const discountCode = normalizeOptionalString(formData.get("discountCode"));

  const originalGrossCents = moneyToCents(originalTotalGrossNumber);

  let discountRedemptionId: string | null = null;
  let discountAmountCents = 0;
  let finalGrossCents = originalGrossCents;
  let isFullyDiscounted = false;

  if (discountCode) {
    const discount = await redeemDiscountForCheckout({
      code: discountCode,
      context: "report_access_purchase",
      originalAmountCents: originalGrossCents,
      currency: "PLN",
      userId: ctx.userId,
      tenantId: ctx.tenantId,
    });

    if (!discount.ok) {
      return purchaseFail(discount.message);
    }

    discountRedemptionId = discount.redemptionId;
    discountAmountCents = discount.discountAmountCents;
    finalGrossCents = discount.finalAmountCents;
    isFullyDiscounted = discount.isFullyDiscounted;
  }

  const { totalNet, totalVat, totalGross } = calculateDiscountedTotals({
    originalNet: originalTotalNetNumber,
    originalGross: originalTotalGrossNumber,
    finalGrossCents,
  });

  const invoiceRequested = checkboxValue(formData.get("invoiceRequested"));
  const saveBillingProfile = checkboxValue(formData.get("saveBillingProfile"));

  const billingType =
    normalizeString(formData.get("billingType")) === "individual"
      ? "individual"
      : "company";

  const billingSnapshot = invoiceRequested
    ? {
      type: billingType,
      companyName: normalizeOptionalString(formData.get("companyName")),
      taxId: normalizeOptionalString(formData.get("taxId")),
      firstName: normalizeOptionalString(formData.get("firstName")),
      lastName: normalizeOptionalString(formData.get("lastName")),
      email: normalizeOptionalString(formData.get("billingEmail")),
      phone: normalizeOptionalString(formData.get("phone")),
      country: normalizeOptionalString(formData.get("country")) ?? "PL",
      postalCode: normalizeOptionalString(formData.get("postalCode")),
      city: normalizeOptionalString(formData.get("city")),
      street: normalizeOptionalString(formData.get("street")),
      buildingNumber: normalizeOptionalString(formData.get("buildingNumber")),
      apartmentNumber: normalizeOptionalString(
        formData.get("apartmentNumber"),
      ),
      invoiceEmail: normalizeOptionalString(formData.get("invoiceEmail")),
    }
    : {};

  let billingProfileId: string | null = null;

  if (invoiceRequested && saveBillingProfile) {
    const [billingProfile] = await controlDb
      .insert(billingProfiles)
      .values({
        ownerType: "tenant",

        tenantSlug: ctx.tenantSlug,
        tenantId: ctx.tenantId,

        type: billingType,

        companyName: normalizeOptionalString(formData.get("companyName")),
        taxId: normalizeOptionalString(formData.get("taxId")),

        firstName: normalizeOptionalString(formData.get("firstName")),
        lastName: normalizeOptionalString(formData.get("lastName")),

        email: normalizeOptionalString(formData.get("billingEmail")),
        phone: normalizeOptionalString(formData.get("phone")),

        country: normalizeOptionalString(formData.get("country")) ?? "PL",
        postalCode: normalizeOptionalString(formData.get("postalCode")),
        city: normalizeOptionalString(formData.get("city")),
        street: normalizeOptionalString(formData.get("street")),
        buildingNumber: normalizeOptionalString(
          formData.get("buildingNumber"),
        ),
        apartmentNumber: normalizeOptionalString(
          formData.get("apartmentNumber"),
        ),

        invoiceEmail: normalizeOptionalString(formData.get("invoiceEmail")),

        createdAt: now,
        updatedAt: now,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      })
      .returning({
        id: billingProfiles.id,
      });

    billingProfileId = billingProfile.id;
  }

  const currency = (
    product.currency ?? "PLN"
  ).toUpperCase();

  const paymentSessionId =
    `humanet-tenant:${randomUUID()}`;

  const orderMetadata = {
    paidByDiscount: isFullyDiscounted,

    source:
      "tenant_report_access_orders_page",

    tenantSlug: ctx.tenantSlug,
    tenantId: ctx.tenantId,

    productId: product.id,
    productCode: product.code,
    productName: product.name,

    productAccessCount:
      accessCountPerProduct,

    quantity,
    generatedAccessCount,

    pricing: {
      originalTotalNet,
      originalTotalVat,
      originalTotalGross,

      totalNet,
      totalVat,
      totalGross,
    },

    discount: discountRedemptionId
      ? {
        redemptionId:
          discountRedemptionId,

        originalGrossCents,
        discountAmountCents,
        finalGrossCents,
      }
      : null,
  };

  const [order] = await controlDb
    .insert(reportAccessOrders)
    .values({
      buyerType: "tenant",

      tenantSlug: ctx.tenantSlug,
      tenantId: ctx.tenantId,

      buyerUserId: ctx.userId,

      status: isFullyDiscounted
        ? "paid"
        : "pending_payment",

      paymentProvider:
        isFullyDiscounted
          ? "discount"
          : "przelewy24",

      paymentProviderOrderId:
        isFullyDiscounted
          ? `tenant-discount:${randomUUID()}`
          : null,

      paymentProviderSessionId:
        isFullyDiscounted
          ? null
          : paymentSessionId,

      currency,

      totalNet,
      totalVat,
      totalGross,

      invoiceRequested,
      billingProfileId,
      billingSnapshot,

      metadata: orderMetadata,

      paidAt: isFullyDiscounted
        ? now
        : null,

      createdAt: now,
      updatedAt: now,

      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    })
    .returning({
      id: reportAccessOrders.id,
    });



  await controlDb.insert(reportAccessOrderItems).values({
    orderId: order.id,
    productId: product.id,

    quantity,

    unitNet,
    unitVat,
    unitGross,

    totalNet,
    totalVat,
    totalGross,

    createdAt: now,
    updatedAt: now,
  });

  if (isFullyDiscounted) {
    const validUntil = buildValidUntil(
      now,
      product.validityDays,
    );


    const codeRows = Array.from(
      { length: generatedAccessCount },
      () => {
        const rawCode =
          generateRawReportAccessCode();

        return {
          productId: product.id,
          orderId: order.id,

          codeHash:
            hashReportAccessCode(rawCode),

          codePreview:
            buildCodePreview(rawCode),

          status: "available",

          tenantSlug: ctx.tenantSlug,
          tenantId: ctx.tenantId,

          ownerUserId: null,
          purchasedByUserId:
            ctx.userId,

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
            paidByDiscount: true,
            source: "tenant_purchase",

            productCode: product.code,
            productName: product.name,

            orderQuantity: quantity,

            productAccessCount:
              accessCountPerProduct,

            discountRedemptionId,
          },

          createdAt: now,
          updatedAt: now,

          createdBy: ctx.userId,
          updatedBy: ctx.userId,
        };
      },
    );

    await controlDb
      .insert(reportAccessCodes)
      .values(codeRows);

    revalidatePath(
      `/t/${ctx.tenantSlug}/report-access`,
    );

    revalidatePath(
      `/t/${ctx.tenantSlug}/assessment-projects`,
    );

    return {
      status: "success",
      message:
        `Kod rabatowy pokrył całą kwotę. Dodano ${generatedAccessCount} dostępów do puli partnera.`,
    };
  }

  const paymentEmail =
    normalizeOptionalString(
      formData.get("billingEmail"),
    ) ??
    normalizeOptionalString(
      formData.get("invoiceEmail"),
    ) ??
    authSession.user.email;


  if (!paymentEmail) {
    const failedAt = new Date();

    await controlDb
      .update(reportAccessOrders)
      .set({
        status: "failed",

        updatedAt: failedAt,
        updatedBy: ctx.userId,

        metadata: {
          ...orderMetadata,

          payment: {
            status:
              "registration_failed",

            errorCode:
              "missing_payment_email",

            failedAt:
              failedAt.toISOString(),
          },
        },
      })
      .where(
        eq(
          reportAccessOrders.id,
          order.id,
        ),
      );

    return purchaseFail(
      "Do rozpoczęcia płatności wymagany jest adres e-mail.",
    );
  }

  try {
    const registration =
      await registerPrzelewy24Transaction({
        sessionId: paymentSessionId,

        amount: finalGrossCents,
        currency,

        description:
          `HUMANET — ${product.name} × ${quantity}`,

        email: paymentEmail,

        client:
          normalizeOptionalString(
            formData.get("companyName"),
          ) ??
          normalizeOptionalString(
            formData.get("firstName"),
          ) ??
          paymentEmail,

        country:
          normalizeOptionalString(
            formData.get("country"),
          ) ?? "PL",

        language: "pl",

urlReturn:
  `${withoutTrailingSlash(
    env.APP_URL,
  )}/t/${encodeURIComponent(
    ctx.tenantSlug,
  )}/report-access/payment/${encodeURIComponent(
    order.id,
  )}/return`,

        urlStatus:
          `${env.APP_URL.replace(
            /\/+$/,
            "",
          )}/api/webhooks/przelewy24`,
      });

    const registeredAt = new Date();

    await controlDb
      .update(reportAccessOrders)
      .set({
        updatedAt: registeredAt,
        updatedBy: ctx.userId,

        metadata: {
          ...orderMetadata,

          payment: {
            status: "registered",
            provider: "przelewy24",

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
            order.id,
          ),
          eq(
            reportAccessOrders.status,
            "pending_payment",
          ),
          eq(
            reportAccessOrders.paymentProvider,
            "przelewy24",
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
        updatedBy: ctx.userId,

        metadata: {
          ...orderMetadata,

          payment: {
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
            order.id,
          ),
          eq(
            reportAccessOrders.status,
            "pending_payment",
          ),
          eq(
            reportAccessOrders.paymentProvider,
            "przelewy24",
          ),
          isNull(
            reportAccessOrders.deletedAt,
          ),
        ),
      );

    console.error(
      "P24_TENANT_TRANSACTION_REGISTRATION_FAILED",
      {
        orderId: order.id,

        errorName:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );

    return purchaseFail(
      "Nie udało się rozpocząć płatności. Spróbuj ponownie.",
    );
  }

}