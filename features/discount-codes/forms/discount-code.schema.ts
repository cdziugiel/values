import { z } from "zod";

export const createDiscountCodeSchema = z
  .object({
    code: z.string().min(3).max(64),
    name: z.string().min(2).max(160),
    description: z.string().max(1000).optional().nullable(),

    status: z.enum(["active", "paused", "archived"]).default("active"),

    discountType: z.enum(["fixed_amount", "percent"]),

    discountValueCents: z.number().int().min(1).optional().nullable(),

    /**
     * 2000 = 20,00%.
     */
    discountPercentBps: z.number().int().min(1).max(10_000).optional().nullable(),

    allowZeroFinalPrice: z.boolean().default(true),

    maximumDiscountCents: z.number().int().min(1).optional().nullable(),
    minimumOrderValueCents: z.number().int().min(1).optional().nullable(),

    appliesTo: z
      .enum(["report_unlock", "report_access_purchase", "all_report_access"])
      .default("all_report_access"),

    startsAt: z.coerce.date().optional().nullable(),
    endsAt: z.coerce.date().optional().nullable(),

    maxRedemptions: z.number().int().min(1).optional().nullable(),
    maxRedemptionsPerUser: z.number().int().min(1).optional().nullable(),
    maxRedemptionsPerTenant: z.number().int().min(1).optional().nullable(),
  })
  .superRefine((input, ctx) => {
    if (input.discountType === "fixed_amount" && !input.discountValueCents) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountValueCents"],
        message: "Podaj kwotę rabatu.",
      });
    }

    if (input.discountType === "percent" && !input.discountPercentBps) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discountPercentBps"],
        message: "Podaj procent rabatu.",
      });
    }

    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "Data końca musi być późniejsza niż data początku.",
      });
    }
  });

export const validateDiscountCodeSchema = z.object({
  code: z.string().min(3).max(64),
  context: z.enum(["report_unlock", "report_access_purchase"]),
  originalAmountCents: z.number().int().min(0),
  currency: z.literal("PLN").default("PLN"),
  tenantId: z.string().uuid().optional().nullable(),
  assessmentSessionId: z.string().uuid().optional().nullable(),
});

export type CreateDiscountCodeInput = z.infer<typeof createDiscountCodeSchema>;
export type ValidateDiscountCodeInput = z.infer<
  typeof validateDiscountCodeSchema
>;