import type {
  NormativeProfileRewardStatus,
} from "./normative-profile.types";

// @humanet-normative-admin-v1_1_2-r2-types

export type NormativeProfileAdminRowDto = {
  profileId: string;
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string | null;

  revision: number;
  excludedFromNorms: boolean;

  birthYear: number;
  ageAtAssessment: number | null;

  sex: string;
  countryCode: string;
  voivodeshipCode: string | null;
  localitySize: string | null;

  educationLevel: string | null;
  educationFields: string[];

  workedLastWeek: boolean | null;
  hasJobTemporaryAbsence: boolean | null;
  isWorkingForNorms: boolean | null;

  employmentForm: string | null;
  workTime: string | null;

  industryClassification: string | null;
  industrySection: string | null;

  occupationMajorGroup: string | null;
  managesPeople: boolean | null;
  ownershipSector: string | null;
  organizationTenure: string | null;

  employmentStatus: string | null;
  industryCode: string | null;
  jobLevel: string | null;
  jobFunction: string | null;
  organizationSize: string | null;
  employmentSector: string | null;

  recruitmentChannel: string;

  schemaVersion: string;
  dictionaryVersion: string;
  completedAt: string;

  consentVersion: string | null;
  consentAcceptedAt: string | null;
  consentWithdrawnAt: string | null;

  rewardStatus: NormativeProfileRewardStatus | null;
  discountCodeId: string | null;
  discountCodePreview: string | null;
  rewardIssuedAt: string | null;
  rewardExpiresAt: string | null;

  sessionCount: number;
  tenantCount: number;
};

export type NormativeProfileAdminDetailDto =
  NormativeProfileAdminRowDto & {
    dateOfBirth: string;

    consentId: string | null;
    consentType: string | null;
    consentPurposeCode: string | null;
    consentTextSnapshot: string | null;

    rewardId: string | null;
    rewardType: string | null;
    rewardRedeemedAt: string | null;
    rewardRevokedAt: string | null;

    normativeExclusionReason: string | null;
    normativeExcludedAt: string | null;
    normativeExcludedByUserId: string | null;
  };

export type NormativeProfilesAdminFilters = {
  query?: string;
  consentStatus?: "all" | "active" | "withdrawn";
  rewardStatus?: "all" | NormativeProfileRewardStatus;
  inclusionStatus?: "all" | "included" | "excluded";
  page?: number;
  pageSize?: number;
};

export type NormativeProfilesAdminPageDto = {
  rows: NormativeProfileAdminRowDto[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type NormativeProfileExclusionActionResult = {
  status: "success" | "error";
  message: string;
};
