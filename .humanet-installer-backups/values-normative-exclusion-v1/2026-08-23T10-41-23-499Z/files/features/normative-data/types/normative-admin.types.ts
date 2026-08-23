import type {
  NormativeProfileRewardStatus,
} from "./normative-profile.types";

export type NormativeProfileAdminRowDto = {
  profileId: string;
  ownerUserId: string;
  ownerEmail: string;
  ownerName: string | null;
  revision: number;
  ageAtAssessment: number | null;
  sex: string;
  voivodeshipCode: string | null;
  educationLevel: string | null;
  employmentStatus: string | null;
  industryCode: string | null;
  jobLevel: string | null;
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

export type NormativeProfileAdminDetailDto = NormativeProfileAdminRowDto & {
  dateOfBirth: string;
  birthYear: number;
  countryCode: string;
  localitySize: string | null;
  educationFields: string[];
  jobFunction: string | null;
  organizationSize: string | null;
  employmentSector: string | null;
  recruitmentChannel: string;
  consentId: string | null;
  consentType: string | null;
  consentPurposeCode: string | null;
  consentTextSnapshot: string | null;
  rewardId: string | null;
  rewardType: string | null;
  rewardRedeemedAt: string | null;
  rewardRevokedAt: string | null;
};

export type NormativeProfilesAdminFilters = {
  query?: string;
  consentStatus?: "all" | "active" | "withdrawn";
  rewardStatus?: "all" | NormativeProfileRewardStatus;
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
