import { z } from "zod";

export const tenantSlugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: "Slug może zawierać małe litery, cyfry i myślniki, bez spacji.",
  });

export const tenantStatusSchema = z.enum([
  "active",
  "inactive",
  "suspended",
  "archived",
]);

const normalizeOptionalEmail = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  return normalized || undefined;
};
export const createTenantSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug musi mieć co najmniej 2 znaki.")
    .max(48, "Slug może mieć maksymalnie 48 znaków.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug może zawierać małe litery, cyfry i pojedyncze myślniki.",
    ),
  name: z
    .string()
    .trim()
    .min(2, "Nazwa partnera musi mieć co najmniej 2 znaki.")
    .max(160, "Nazwa partnera może mieć maksymalnie 160 znaków."),
  ownerEmail: z
    .preprocess(
      normalizeOptionalEmail,
      z.string().email("Podaj poprawny adres email ownera.").optional(),
    ),
});

export const updateTenantSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  status: tenantStatusSchema,
  ownerEmail: z.preprocess(
    normalizeOptionalEmail,
    z.string().email("Podaj poprawny adres email ownera.").optional(),
  ),
});

export const archiveTenantSchema = z.object({
  tenantId: z.string().uuid(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type ArchiveTenantInput = z.infer<typeof archiveTenantSchema>;