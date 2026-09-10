import type {
  NormativeProfileFormInput,
} from "../forms/normative-profile.schema";
import {
  ageGroup,
  mapEducationToBael,
  mapLocalityToResidenceType,
  mapPkd2025SectionToEconomicSector,
} from "./normative-profile-derived";

export type NormativeProfileSnapshot = {
  schemaVersion: string;
  dictionaryVersion: string;
  revision: number;

  // Celowo bez pełnej daty urodzenia — snapshot analityczny przechowuje tylko rok i wiek w chwili badania.
  birthYear: number;
  ageAtAssessment: number;
  ageGroup: string | null;

  sex: string;
  countryCode: string;
  voivodeshipCode: string;
  localitySize: string;
  residenceType: "urban" | "rural" | null;

  educationLevel: string;
  baelEducationGroup: string | null;
  educationFields: string[];

  // @humanet-normative-work-situation-v1_2-snapshot
  workSituation: string;
  isWorkingForNorms: boolean;
  employmentForm: string;
  workTime: string;

  industryClassification: "PKD2025" | null;
  industrySection: string;
  economicSector: "agriculture" | "industry" | "services" | null;

  occupationMajorGroup: string;
  jobLevel: string;
  jobFunction: string;
  managesPeople: string;
  organizationSize: string;
  ownershipSector: string;
  organizationTenure: string;
};

export function buildNormativeProfileSnapshot({
  data,
  schemaVersion,
  dictionaryVersion,
  revision,
  ageAtAssessment,
}: {
  data: Omit<
    NormativeProfileFormInput,
    "tenantSlug" | "assessmentSessionId" | "consentAccepted"
  >;
  schemaVersion: string;
  dictionaryVersion: string;
  revision: number;
  ageAtAssessment: number;
}): NormativeProfileSnapshot {
  return {
    schemaVersion,
    dictionaryVersion,
    revision,
    birthYear: Number(data.dateOfBirth.slice(0, 4)),
    ageAtAssessment,
    ageGroup: ageGroup(ageAtAssessment),

    sex: data.sex,
    countryCode: data.countryCode,
    voivodeshipCode: data.voivodeshipCode,
    localitySize: data.localitySize,
    residenceType: mapLocalityToResidenceType(data.localitySize),

    educationLevel: data.educationLevel,
    baelEducationGroup: mapEducationToBael(data.educationLevel),
    educationFields: [...data.educationFields],

    workSituation: data.workSituation,
    isWorkingForNorms: data.isWorkingForNorms,
    employmentForm: data.employmentForm,
    workTime: data.workTime,

    industryClassification:
      data.isWorkingForNorms && data.industrySection !== "not_applicable"
        ? "PKD2025"
        : null,
    industrySection: data.industrySection,
    economicSector: mapPkd2025SectionToEconomicSector(data.industrySection),

    occupationMajorGroup: data.occupationMajorGroup,
    jobLevel: data.jobLevel,
    jobFunction: data.jobFunction,
    managesPeople: data.managesPeople,
    organizationSize: data.organizationSize,
    ownershipSector: data.ownershipSector,
    organizationTenure: data.organizationTenure,
  };
}
