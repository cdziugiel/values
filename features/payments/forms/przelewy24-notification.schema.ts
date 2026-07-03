import { z } from "zod";

export const przelewy24NotificationSchema = z.object({
  merchantId: z.number().int().positive(),
  posId: z.number().int().positive(),

  sessionId: z.string().min(1).max(100),

  amount: z.number().int().nonnegative(),
  originAmount: z.number().int().nonnegative(),

  currency: z.string().length(3),

  orderId: z.number().int().positive(),
  methodId: z.number().int().nonnegative(),

  statement: z.string(),
  sign: z.string().min(1),
});

export type Przelewy24NotificationInput = z.infer<
  typeof przelewy24NotificationSchema
>;