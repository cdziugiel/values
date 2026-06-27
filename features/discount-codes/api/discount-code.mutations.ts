import { and, count, eq, isNull } from "drizzle-orm";

import {
  discountCodeRedemptions,
  discountCodes,
} from "@/drizzle/schema/control";
import { controlDb } from "@/server/db/control-db";

import { createDiscountCodeSchema } from "../forms/discount-code.schema";
import { calculateDiscount } from "../lib/discount-calculator";
import { createDiscountCodePreview } from "../lib/discount-code-normalize";
import { hashDiscountCode } from "../lib/discount-code-hash";

type ValidateDiscountForCheckoutInput = {
  code: string;
  context: "report_unlock" | "report_access_purchase";
  originalAmountCents: number;
  currency?: "PLN";
  userId?: string | null;
  tenantId?: string | null;
  assessmentSessionId?: string | null;
};

export async function createDiscountCode(input: unknown, actorUserId: string) {
  const parsed = createDiscountCodeSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      message: "Nieprawidłowe dane kodu rabatowego.",
      issues: parsed.error.flatten(),
    };
  }

  const data = parsed.data;
  const codeHash = hashDiscountCode(data.code);
  const codePreview = createDiscountCodePreview(data.code);

  const [created] = await controlDb
    .insert(discountCodes)
    .values({
      codeHash,
      codePreview,
      name: data.name,
      description: data.description ?? null,
      status: data.status,
      discountType: data.discountType,
      discountValueCents: data.discountValueCents ?? null,
      discountPercentBps: data.discountPercentBps ?? null,
      allowZeroFinalPrice: data.allowZeroFinalPrice,
      maximumDiscountCents: data.maximumDiscountCents ?? null,
      minimumOrderValueCents: data.minimumOrderValueCents ?? null,
      appliesTo: data.appliesTo,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null,
      maxRedemptions: data.maxRedemptions ?? null,
      maxRedemptionsPerUser: data.maxRedemptionsPerUser ?? null,
      maxRedemptionsPerTenant: data.maxRedemptionsPerTenant ?? null,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  return {
    ok: true as const,
    discountCode: {
      id: created.id,
      name: created.name,
      codePreview: created.codePreview,
      status: created.status,
    },
  };
}

export async function validateDiscountForCheckout(
  input: ValidateDiscountForCheckoutInput,
) {
  const now = new Date();
  const codeHash = hashDiscountCode(input.code);

  const [code] = await controlDb
    .select()
    .from(discountCodes)
    .where(
      and(
        eq(discountCodes.codeHash, codeHash),
        isNull(discountCodes.deletedAt),
      ),
    )
    .limit(1);

  if (!code) {
    return {
      ok: false as const,
      reason: "not_found" as const,
      message: "Nie znaleziono aktywnego kodu rabatowego.",
    };
  }

  if (code.status !== "active") {
    return {
      ok: false as const,
      reason: "inactive" as const,
      message: "Ten kod rabatowy nie jest aktywny.",
    };
  }
  if (code.assignedUserId) {
    if (!input.userId || code.assignedUserId !== input.userId) {
      return {
        ok: false as const,
        reason: "assigned_to_another_user" as const,
        message: "Ten kod rabatowy jest przypisany do innego konta.",
      };
    }
  }

  if (code.startsAt && code.startsAt > now) {
    return {
      ok: false as const,
      reason: "not_started" as const,
      message: "Ten kod rabatowy nie jest jeszcze aktywny.",
    };
  }

  if (code.endsAt && code.endsAt < now) {
    return {
      ok: false as const,
      reason: "expired" as const,
      message: "Ten kod rabatowy wygasł.",
    };
  }

  if (
    code.appliesTo !== "all_report_access" &&
    code.appliesTo !== input.context
  ) {
    return {
      ok: false as const,
      reason: "not_applicable" as const,
      message: "Ten kod nie działa dla tego typu zakupu.",
    };
  }

  if (
    code.minimumOrderValueCents != null &&
    input.originalAmountCents < code.minimumOrderValueCents
  ) {
    return {
      ok: false as const,
      reason: "minimum_order_value_not_met" as const,
      message: "Wartość zamówienia jest zbyt niska dla tego kodu.",
    };
  }

  if (code.maxRedemptions != null) {
    const [usage] = await controlDb
      .select({ value: count() })
      .from(discountCodeRedemptions)
      .where(
        and(
          eq(discountCodeRedemptions.discountCodeId, code.id),
          eq(discountCodeRedemptions.status, "redeemed"),
        ),
      );

    if ((usage?.value ?? 0) >= code.maxRedemptions) {
      return {
        ok: false as const,
        reason: "usage_limit_reached" as const,
        message: "Limit użyć tego kodu został wyczerpany.",
      };
    }
  }

  if (code.maxRedemptionsPerUser != null && input.userId) {
    const [usage] = await controlDb
      .select({ value: count() })
      .from(discountCodeRedemptions)
      .where(
        and(
          eq(discountCodeRedemptions.discountCodeId, code.id),
          eq(discountCodeRedemptions.userId, input.userId),
          eq(discountCodeRedemptions.status, "redeemed"),
        ),
      );

    if ((usage?.value ?? 0) >= code.maxRedemptionsPerUser) {
      return {
        ok: false as const,
        reason: "user_limit_reached" as const,
        message: "Ten kod został już wykorzystany na Twoim koncie.",
      };
    }
  }

  if (code.maxRedemptionsPerTenant != null && input.tenantId) {
    const [usage] = await controlDb
      .select({ value: count() })
      .from(discountCodeRedemptions)
      .where(
        and(
          eq(discountCodeRedemptions.discountCodeId, code.id),
          eq(discountCodeRedemptions.tenantId, input.tenantId),
          eq(discountCodeRedemptions.status, "redeemed"),
        ),
      );

    if ((usage?.value ?? 0) >= code.maxRedemptionsPerTenant) {
      return {
        ok: false as const,
        reason: "tenant_limit_reached" as const,
        message: "Limit użyć tego kodu dla tej organizacji został wyczerpany.",
      };
    }
  }

  const calculation = calculateDiscount({
    discountType: code.discountType,
    originalAmountCents: input.originalAmountCents,
    discountValueCents: code.discountValueCents,
    discountPercentBps: code.discountPercentBps,
    maximumDiscountCents: code.maximumDiscountCents,
    allowZeroFinalPrice: code.allowZeroFinalPrice,
  });

  return {
    ok: true as const,
    discountCodeId: code.id,
    codePreview: code.codePreview,
    name: code.name,
    ...calculation,
  };
}

export async function redeemDiscountForCheckout(input: {
  code: string;
  context: "report_unlock" | "report_access_purchase";
  originalAmountCents: number;
  currency?: "PLN";
  userId?: string | null;
  tenantId?: string | null;
  orderId?: string | null;
  reportAccessOrderId?: string | null;
  reportAccessGrantId?: string | null;
  assessmentSessionId?: string | null;
}) {
  const validation = await validateDiscountForCheckout(input);

  if (!validation.ok) {
    return validation;
  }

  const [redemption] = await controlDb
    .insert(discountCodeRedemptions)
    .values({
      discountCodeId: validation.discountCodeId,
      status: "redeemed",
      redemptionContext: input.context,
      userId: input.userId ?? null,
      tenantId: input.tenantId ?? null,
      orderId: input.orderId ?? null,
      reportAccessOrderId: input.reportAccessOrderId ?? null,
      reportAccessGrantId: input.reportAccessGrantId ?? null,
      assessmentSessionId: input.assessmentSessionId ?? null,
      originalAmountCents: validation.originalAmountCents,
      discountAmountCents: validation.discountAmountCents,
      finalAmountCents: validation.finalAmountCents,
      currency: input.currency ?? "PLN",
    })
    .returning();

  return {
    ok: true as const,
    redemptionId: redemption.id,
    discountCodeId: validation.discountCodeId,
    originalAmountCents: validation.originalAmountCents,
    discountAmountCents: validation.discountAmountCents,
    finalAmountCents: validation.finalAmountCents,
    isFullyDiscounted: validation.finalAmountCents === 0,
  };
}