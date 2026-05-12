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

export const createTenantSchema = z.object({
  slug: tenantSlugSchema,
  name: z.string().min(2).max(160),
  ownerEmail: z.string().email().optional().or(z.literal("")),
});

export const updateTenantSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(2).max(160),
  status: tenantStatusSchema,
  ownerEmail: z.string().email().optional().or(z.literal("")),
});

export const archiveTenantSchema = z.object({
  tenantId: z.string().uuid(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type ArchiveTenantInput = z.infer<typeof archiveTenantSchema>;