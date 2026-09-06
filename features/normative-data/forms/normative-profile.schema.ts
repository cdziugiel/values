import { z } from "zod";

import {
  ALL_EDUCATION_LEVEL_OPTIONS,
  EDUCATION_FIELD_OPTIONS,
  EMPLOYMENT_FORM_OPTIONS,
  EMPLOYMENT_SECTOR_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  INDUSTRY_OPTIONS,
  INDUSTRY_SECTION_OPTIONS,
  JOB_FUNCTION_OPTIONS,
  JOB_LEVEL_OPTIONS,
  LOCALITY_SIZE_OPTIONS,
  MANAGES_PEOPLE_OPTIONS,
  OCCUPATION_MAJOR_GROUP_OPTIONS,
  ORGANIZATION_SIZE_OPTIONS,
  ORGANIZATION_TENURE_OPTIONS,
  OWNERSHIP_SECTOR_OPTIONS,
  SEX_OPTIONS,
  TEMPORARY_ABSENCE_OPTIONS,
  VOIVODESHIP_OPTIONS,
  WORK_TIME_OPTIONS,
  YES_NO_OPTIONS,
} from "../lib/normative-profile-options";
import { resolveIsWorkingForNorms } from "../lib/normative-profile-derived";

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

const workRequiredFields = [
  "employmentForm",
  "workTime",
  "industrySection",
  "occupationMajorGroup",
  "jobLevel",
  "jobFunction",
  "organizationSize",
  "ownershipSector",
  "managesPeople",
  "organizationTenure",
] as const;

export const normativeProfileFormSchema = z.object({
  tenantSlug: z.string().trim().min(1),
  assessmentSessionId: z.string().uuid(),

  consentAccepted: z.boolean().refine((value) => value === true, {
    message: "Zgoda jest wymagana do przekazania danych do zbioru normatywnego.",
  }),

  dateOfBirth: dateOfBirthSchema,
  sex: z.enum(optionValues(SEX_OPTIONS)),

  countryCode: z.string().trim().length(2).default("PL"),
  voivodeshipCode: z.enum(optionValues(VOIVODESHIP_OPTIONS)),
  localitySize: z.enum(optionValues(LOCALITY_SIZE_OPTIONS)),

  educationLevel: z.enum(optionValues(ALL_EDUCATION_LEVEL_OPTIONS)),
  educationFields: z
    .array(z.enum(optionValues(EDUCATION_FIELD_OPTIONS)))
    .default([]),

  // v1.1 — screening pracy zgodny z logiką "pracuje / nie pracuje".
  workedLastWeek: z.enum(optionValues(YES_NO_OPTIONS)),
  hasJobTemporaryAbsence: z.enum(optionValues(TEMPORARY_ABSENCE_OPTIONS)),
  isWorkingForNorms: z.boolean(),

  employmentForm: z.enum(optionValues(EMPLOYMENT_FORM_OPTIONS)),
  workTime: z.enum(optionValues(WORK_TIME_OPTIONS)),
  industrySection: z.enum(optionValues(INDUSTRY_SECTION_OPTIONS)),
  occupationMajorGroup: z.enum(optionValues(OCCUPATION_MAJOR_GROUP_OPTIONS)),
  jobLevel: z.enum(optionValues(JOB_LEVEL_OPTIONS)),
  jobFunction: z.enum(optionValues(JOB_FUNCTION_OPTIONS)),
  organizationSize: z.enum(optionValues(ORGANIZATION_SIZE_OPTIONS)),
  ownershipSector: z.enum(optionValues(OWNERSHIP_SECTOR_OPTIONS)),
  managesPeople: z.enum(optionValues(MANAGES_PEOPLE_OPTIONS)),
  organizationTenure: z.enum(optionValues(ORGANIZATION_TENURE_OPTIONS)),

  // Legacy: zapisywane deterministycznie po stronie serwera.
  employmentStatus: z.enum(optionValues(EMPLOYMENT_STATUS_OPTIONS)),
  industryCode: z.enum(optionValues(INDUSTRY_OPTIONS)),
  employmentSector: z.enum(optionValues(EMPLOYMENT_SECTOR_OPTIONS)),
}).superRefine((data, ctx) => {
  const expectedWorking = resolveIsWorkingForNorms(
    data.workedLastWeek,
    data.hasJobTemporaryAbsence,
  );

  if (data.isWorkingForNorms !== expectedWorking) {
    ctx.addIssue({
      code: "custom",
      path: ["isWorkingForNorms"],
      message: "Niespójny status pracy.",
    });
  }

  if (data.workedLastWeek === "yes" && data.hasJobTemporaryAbsence !== "not_applicable") {
    ctx.addIssue({
      code: "custom",
      path: ["hasJobTemporaryAbsence"],
      message: "Dla osoby pracującej w ostatnich 7 dniach pole powinno mieć wartość „Nie dotyczy”.",
    });
  }

  if (data.workedLastWeek === "no" && data.hasJobTemporaryAbsence === "not_applicable") {
    ctx.addIssue({
      code: "custom",
      path: ["hasJobTemporaryAbsence"],
      message: "Określ, czy masz pracę, z której czasowo nie wykonywałeś/-aś obowiązków.",
    });
  }

  for (const field of workRequiredFields) {
    const value = data[field];
    if (expectedWorking && value === "not_applicable") {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: "Uzupełnij to pole dla aktualnej pracy.",
      });
    }
    if (!expectedWorking && value !== "not_applicable") {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: "Pole powinno mieć wartość „Nie dotyczy”, jeśli obecnie nie pracujesz.",
      });
    }
  }
});

export type NormativeProfileFormInput = z.infer<typeof normativeProfileFormSchema>;
