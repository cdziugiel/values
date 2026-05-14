import { z } from "zod";

export const clientUnitTypeSchema = z.enum([
  "organization",
  "division",
  "department",
  "team",
  "other",
]);

export const createClientUnitSchema = z.object({
  tenantSlug: z.string().min(2),
  clientOrganizationId: z.string().uuid(),
  parentId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2).max(180),
  type: clientUnitTypeSchema,
});

export const updateClientUnitSchema = z.object({
  tenantSlug: z.string().min(2),
  clientUnitId: z.string().uuid(),
  clientOrganizationId: z.string().uuid(),
  parentId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2).max(180),
  type: clientUnitTypeSchema,
});

export const archiveClientUnitSchema = z.object({
  tenantSlug: z.string().min(2),
  clientUnitId: z.string().uuid(),
});

export type ClientUnitType = z.infer<typeof clientUnitTypeSchema>;

export type CreateClientUnitInput = z.infer<typeof createClientUnitSchema>;
export type UpdateClientUnitInput = z.infer<typeof updateClientUnitSchema>;
export type ArchiveClientUnitInput = z.infer<typeof archiveClientUnitSchema>;

export const CLIENT_UNIT_TYPE_OPTIONS: {
  value: ClientUnitType;
  label: string;
}[] = [
  { value: "organization", label: "organization" },
  { value: "division", label: "division" },
  { value: "department", label: "department" },
  { value: "team", label: "team" },
  { value: "other", label: "other" },
];