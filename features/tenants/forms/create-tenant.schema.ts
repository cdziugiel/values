import { z } from "zod";

export const createTenantSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message:
        "Slug może zawierać małe litery, cyfry i myślniki, bez spacji.",
    }),
  name: z.string().min(2).max(160),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;