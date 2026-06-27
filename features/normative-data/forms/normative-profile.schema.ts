import { z } from "zod";

import {
  EDUCATION_FIELD_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_SECTOR_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  INDUSTRY_OPTIONS,
  JOB_FUNCTION_OPTIONS,
  JOB_LEVEL_OPTIONS,
  LOCALITY_SIZE_OPTIONS,
  ORGANIZATION_SIZE_OPTIONS,
  SEX_OPTIONS,
  VOIVODESHIP_OPTIONS,
} from "../lib/normative-profile-options";

function optionValues<const T extends readonly { value: string }[]>(options: T) {
  return options.map((option) => option.value) as [
    T[number]["value"],
    ...T[number]["value"][],
  ];
}

const dateOfBirthSchema = z
  .string()
  .date("Podaj prawidłową datę urodzenia.")
  .refine((value) => new Date(`${value}T00:00:00.000Z`) <= new Date(), {
    message: "Data urodzenia nie może przypadać w przyszłości.",
  });

export const normativeProfileFormSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  assessmentSessionId: z.string().uuid(),

    consentAccepted: z
      .boolean()
      .refine((value) => value === true, {
        message:
          "Zgoda jest wymagana do przekazania danych do zbioru normatywnego.",
      }),

  dateOfBirth: dateOfBirthSchema,
  sex: z.enum(optionValues(SEX_OPTIONS)),

  countryCode: z.string().trim().length(2).default("PL"),
  voivodeshipCode: z.enum(optionValues(VOIVODESHIP_OPTIONS)),
  localitySize: z.enum(optionValues(LOCALITY_SIZE_OPTIONS)),

  educationLevel: z.enum(optionValues(EDUCATION_LEVEL_OPTIONS)),
  educationFields: z
    .array(z.enum(optionValues(EDUCATION_FIELD_OPTIONS)))
    .min(1, "Wybierz co najmniej jedną dziedzinę."),

  employmentStatus: z.enum(optionValues(EMPLOYMENT_STATUS_OPTIONS)),
  industryCode: z.enum(optionValues(INDUSTRY_OPTIONS)),
  jobLevel: z.enum(optionValues(JOB_LEVEL_OPTIONS)),
  jobFunction: z.enum(optionValues(JOB_FUNCTION_OPTIONS)),
  organizationSize: z.enum(optionValues(ORGANIZATION_SIZE_OPTIONS)),
  employmentSector: z.enum(optionValues(EMPLOYMENT_SECTOR_OPTIONS)),
});

export type NormativeProfileFormInput = z.infer<
  typeof normativeProfileFormSchema
>;
