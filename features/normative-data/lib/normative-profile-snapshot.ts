import type {
  NormativeProfileFormInput,
} from "../forms/normative-profile.schema";

export type NormativeProfileSnapshot = {
  schemaVersion: string;
  dictionaryVersion: string;
  revision: number;
  dateOfBirth: string;
  birthYear: number;
  ageAtAssessment: number;
  sex: string;
  countryCode: string;
  voivodeshipCode: string;
  localitySize: string;
  educationLevel: string;
  educationFields: string[];
  employmentStatus: string;
  industryCode: string;
  jobLevel: string;
  jobFunction: string;
  organizationSize: string;
  employmentSector: string;
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
    dateOfBirth: data.dateOfBirth,
    birthYear: Number(
      data.dateOfBirth.slice(0, 4),
    ),
    ageAtAssessment,
    sex: data.sex,
    countryCode: data.countryCode,
    voivodeshipCode: data.voivodeshipCode,
    localitySize: data.localitySize,
    educationLevel: data.educationLevel,
    educationFields: [...data.educationFields],
    employmentStatus: data.employmentStatus,
    industryCode: data.industryCode,
    jobLevel: data.jobLevel,
    jobFunction: data.jobFunction,
    organizationSize: data.organizationSize,
    employmentSector: data.employmentSector,
  };
}
