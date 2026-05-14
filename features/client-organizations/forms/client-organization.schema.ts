import { z } from "zod";

export const clientOrganizationStatusSchema = z.enum([
  "active",
  "inactive",
  "archived",
]);

export const createClientOrganizationSchema = z.object({
  tenantSlug: z.string().min(2),
  name: z.string().min(2).max(180),
  industry: z.string().max(120).optional().or(z.literal("")),
  size: z.string().max(80).optional().or(z.literal("")),
});

export const updateClientOrganizationSchema = z.object({
  tenantSlug: z.string().min(2),
  clientOrganizationId: z.string().uuid(),
  name: z.string().min(2).max(180),
  industry: z.string().max(120).optional().or(z.literal("")),
  size: z.string().max(80).optional().or(z.literal("")),
  status: clientOrganizationStatusSchema,
});

export const archiveClientOrganizationSchema = z.object({
  tenantSlug: z.string().min(2),
  clientOrganizationId: z.string().uuid(),
});

export type ClientOrganizationStatus = z.infer<
  typeof clientOrganizationStatusSchema
>;

export type CreateClientOrganizationInput = z.infer<
  typeof createClientOrganizationSchema
>;

export type UpdateClientOrganizationInput = z.infer<
  typeof updateClientOrganizationSchema
>;

export type ArchiveClientOrganizationInput = z.infer<
  typeof archiveClientOrganizationSchema
>;

export const CLIENT_ORGANIZATION_STATUS_OPTIONS: {
  value: ClientOrganizationStatus;
  label: string;
}[] = [
  { value: "active", label: "active" },
  { value: "inactive", label: "inactive" },
  { value: "archived", label: "archived" },
];