import { z } from "zod";

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();

  return normalized || undefined;
};

const normalizeOptionalEmail = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  return normalized || undefined;
};

const optionalUuid = z.preprocess(
  normalizeOptionalString,
  z.string().uuid().optional(),
);

const optionalText = z.preprocess(
  normalizeOptionalString,
  z.string().max(180).optional(),
);

const optionalEmail = z.preprocess(
  normalizeOptionalEmail,
  z.string().email().optional(),
);
export const createRespondentSchema = z.object({
  tenantSlug: z.string().min(2),
  externalCode: optionalText,
  clientOrganizationId: optionalUuid,
  clientUnitId: optionalUuid,
  email: optionalEmail,
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
  email: optionalEmail,
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