import { z } from "zod";

const optionalUuid = z.string().uuid().optional().or(z.literal(""));
const optionalText = z.string().max(180).optional().or(z.literal(""));

export const createRespondentSchema = z.object({
  tenantSlug: z.string().min(2),
  externalCode: optionalText,
  clientOrganizationId: optionalUuid,
  clientUnitId: optionalUuid,
  email: z.string().email().optional().or(z.literal("")),
  firstName: optionalText,
  lastName: optionalText,
  phone: optionalText,
});

export const updateRespondentSchema = z.object({
  tenantSlug: z.string().min(2),
  respondentId: z.string().uuid(),
  externalCode: optionalText,
  clientOrganizationId: optionalUuid,
  clientUnitId: optionalUuid,
  email: z.string().email().optional().or(z.literal("")),
  firstName: optionalText,
  lastName: optionalText,
  phone: optionalText,
});

export const archiveRespondentSchema = z.object({
  tenantSlug: z.string().min(2),
  respondentId: z.string().uuid(),
});

export type CreateRespondentInput = z.infer<typeof createRespondentSchema>;
export type UpdateRespondentInput = z.infer<typeof updateRespondentSchema>;
export type ArchiveRespondentInput = z.infer<typeof archiveRespondentSchema>;