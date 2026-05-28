// features/report-access/api/report-access-purchase.actions.ts
"use server";


import { createHash, randomBytes, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";

import {
  billingProfiles,
  reportAccessCodes,
  reportAccessProducts,
} from "@/drizzle/schema";

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

  const totalNetNumber = unitNetNumber * quantity;
  const totalGrossNumber = unitGrossNumber * quantity;
  const totalVatNumber = unitVatNumber * quantity;

  const unitNet = moneyString(unitNetNumber);
  const unitVat = moneyString(unitVatNumber);
  const unitGross = moneyString(unitGrossNumber);

  const totalNet = moneyString(totalNetNumber);
  const totalVat = moneyString(totalVatNumber);
  const totalGross = moneyString(totalGrossNumber);

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

  const [order] = await controlDb
    .insert(reportAccessOrders)
    .values({
      buyerType: "tenant",

      tenantSlug: ctx.tenantSlug,
      tenantId: ctx.tenantId,
      buyerUserId: ctx.userId,

      status: "paid",

      paymentProvider: "placeholder",
      paymentProviderOrderId: `tenant-placeholder:${randomUUID()}`,

      currency: product.currency ?? "PLN",

      totalNet,
      totalVat,
      totalGross,

      invoiceRequested,
      billingProfileId,
      billingSnapshot,

      metadata: {
        placeholderPayment: true,
        source: "tenant_report_access_orders_page",
        tenantSlug: ctx.tenantSlug,
        tenantId: ctx.tenantId,
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        productAccessCount: accessCountPerProduct,
        quantity,
        generatedAccessCount,
      },

      paidAt: now,
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

  const validUntil = buildValidUntil(now, product.validityDays);

  const codeRows = Array.from({ length: generatedAccessCount }, () => {
    const rawCode = generateRawReportAccessCode();

    return {
      productId: product.id,
      orderId: order.id,

      codeHash: hashReportAccessCode(rawCode),
      codePreview: buildCodePreview(rawCode),

      status: "available",

      tenantSlug: ctx.tenantSlug,
      tenantId: ctx.tenantId,

      ownerUserId: null,
      purchasedByUserId: ctx.userId,

      assignedToEmail: null,
      assignedToUserId: null,

      assessmentProjectId: null,
      assessmentSessionId: null,
      assessmentAccessLinkId: null,

      redeemedByUserId: null,
      redeemedAt: null,

      validFrom: now,
      validUntil,

      metadata: {
        placeholderPayment: true,
        source: "tenant_purchase",
        productCode: product.code,
        productName: product.name,
        orderQuantity: quantity,
        productAccessCount: accessCountPerProduct,
      },

      createdAt: now,
      updatedAt: now,
      createdBy: ctx.userId,
      updatedBy: ctx.userId,
    };
  });

  await controlDb.insert(reportAccessCodes).values(codeRows);

  revalidatePath(`/t/${ctx.tenantSlug}/report-access`);
  revalidatePath(`/t/${ctx.tenantSlug}/assessment-projects`);

  return {
    status: "success",
    message: `Zakupiono ${generatedAccessCount} dostępów. Dostępy trafiły do puli partnera.`,
  };
}