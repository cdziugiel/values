// features/discount-codes/api/discount-code.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { discountCodes } from "@/drizzle/schema/control";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";

import {
  createDiscountCode,
  validateDiscountForCheckout,
} from "./discount-code.mutations";
import { validateDiscountCodeSchema } from "../forms/discount-code.schema";

export type CreateDiscountCodeFormState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type UpdateDiscountCodeStatusState = {
  status: "idle" | "success" | "error";
  message: string;
};

const createInitialError = (message: string): CreateDiscountCodeFormState => ({
  status: "error",
  message,
});

function optionalString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) return null;

  const numberValue = Number(text);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function optionalDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();

  if (!text) return null;

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? null : date;
}

function moneyToCents(value: FormDataEntryValue | null) {
  const numberValue = optionalNumber(value);

  if (numberValue == null) return null;

  return Math.round(numberValue * 100);
}

function percentToBps(value: FormDataEntryValue | null) {
  const numberValue = optionalNumber(value);

  if (numberValue == null) return null;

  return Math.round(numberValue * 100);
}

export async function createDiscountCodeAction(
  _previousState: CreateDiscountCodeFormState,
  formData: FormData,
): Promise<CreateDiscountCodeFormState> {
  const session = await requireSuperAdmin();

  const discountType = String(formData.get("discountType") ?? "fixed_amount");

  const input = {
    code: optionalString(formData.get("code")) ?? "",
    name: optionalString(formData.get("name")) ?? "",
    description: optionalString(formData.get("description")),

    status: String(formData.get("status") ?? "active"),

    discountType,

    discountValueCents:
      discountType === "fixed_amount"
        ? moneyToCents(formData.get("discountValue"))
        : null,

    discountPercentBps:
      discountType === "percent"
        ? percentToBps(formData.get("discountPercent"))
        : null,

    allowZeroFinalPrice: formData.get("allowZeroFinalPrice") === "on",

    maximumDiscountCents: moneyToCents(formData.get("maximumDiscount")),
    minimumOrderValueCents: moneyToCents(formData.get("minimumOrderValue")),

    appliesTo: String(formData.get("appliesTo") ?? "all_report_access"),

    startsAt: optionalDate(formData.get("startsAt")),
    endsAt: optionalDate(formData.get("endsAt")),

    maxRedemptions: optionalNumber(formData.get("maxRedemptions")),
    maxRedemptionsPerUser: optionalNumber(
      formData.get("maxRedemptionsPerUser"),
    ),
    maxRedemptionsPerTenant: optionalNumber(
      formData.get("maxRedemptionsPerTenant"),
    ),
  };

  const result = await createDiscountCode(input, session.id);

  if (!result.ok) {
    return createInitialError(result.message);
  }

  revalidatePath("/dashboard/discount-codes");

  return {
    status: "success",
    message: `Utworzono kod rabatowy ${result.discountCode.codePreview}.`,
  };
}

export async function updateDiscountCodeStatusAction(
  _previousState: UpdateDiscountCodeStatusState,
  formData: FormData,
): Promise<UpdateDiscountCodeStatusState> {
  const session = await requireSuperAdmin();

  const discountCodeId = String(formData.get("discountCodeId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!discountCodeId) {
    return {
      status: "error",
      message: "Brakuje identyfikatora kodu rabatowego.",
    };
  }

  if (!["active", "paused", "archived"].includes(status)) {
    return {
      status: "error",
      message: "Nieprawidłowy status kodu rabatowego.",
    };
  }

  await controlDb
    .update(discountCodes)
    .set({
      status: status as "active" | "paused" | "archived",
      updatedBy: session.id,
      updatedAt: new Date(),
    })
    .where(eq(discountCodes.id, discountCodeId));

  revalidatePath("/dashboard/discount-codes");

  return {
    status: "success",
    message: "Zmieniono status kodu rabatowego.",
  };
}

export async function validateDiscountCodeForCheckoutAction(input: unknown) {
  const session = await requireSession();

  const parsed = validateDiscountCodeSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false as const,
      reason: "invalid_input" as const,
      message: "Nieprawidłowe dane kodu rabatowego.",
    };
  }

  return validateDiscountForCheckout({
    ...parsed.data,
    userId: session.user.id,
  });
}