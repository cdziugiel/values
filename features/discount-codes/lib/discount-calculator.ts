export type DiscountCalculationInput = {
  discountType: "fixed_amount" | "percent";
  originalAmountCents: number;
  discountValueCents?: number | null;
  discountPercentBps?: number | null;
  maximumDiscountCents?: number | null;
  allowZeroFinalPrice: boolean;
};

export type DiscountCalculationResult = {
  originalAmountCents: number;
  discountAmountCents: number;
  finalAmountCents: number;
};

export function calculateDiscount({
  discountType,
  originalAmountCents,
  discountValueCents,
  discountPercentBps,
  maximumDiscountCents,
  allowZeroFinalPrice,
}: DiscountCalculationInput): DiscountCalculationResult {
  if (!Number.isInteger(originalAmountCents) || originalAmountCents < 0) {
    throw new Error("Invalid original amount.");
  }

  let discountAmountCents = 0;

  if (discountType === "fixed_amount") {
    discountAmountCents = discountValueCents ?? 0;
  }

  if (discountType === "percent") {
    discountAmountCents = Math.floor(
      (originalAmountCents * (discountPercentBps ?? 0)) / 10_000,
    );
  }

  if (maximumDiscountCents != null) {
    discountAmountCents = Math.min(discountAmountCents, maximumDiscountCents);
  }

  discountAmountCents = Math.max(0, discountAmountCents);

  const minimumFinalAmount = allowZeroFinalPrice ? 0 : 1;
  const finalAmountCents = Math.max(
    minimumFinalAmount,
    originalAmountCents - discountAmountCents,
  );

  return {
    originalAmountCents,
    discountAmountCents: originalAmountCents - finalAmountCents,
    finalAmountCents,
  };
}