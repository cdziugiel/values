export type NormativeProfileRewardStatus =
  | "pending"
  | "issued"
  | "redeemed"
  | "expired"
  | "revoked";

export type NormativeProfileRewardDto = {
  rewardId: string;
  status: NormativeProfileRewardStatus;
  discountCodeId: string | null;
  discountCode: string | null;
  discountCodePreview: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  eligibleAgainAt: string | null;
  usageLimit: number;
};

export type NormativeProfileValuesDto = {
  dateOfBirth: string;
  sex: string;
  countryCode: string;
  voivodeshipCode: string;
  localitySize: string;
  educationLevel: string;
  educationFields: string[];

  // @humanet-normative-work-situation-v1_2-types
  workSituation: string;
  isWorkingForNorms: boolean | null;
  workedLastWeek?: string;
  hasJobTemporaryAbsence?: string;
  employmentForm: string;
  workTime: string;
  industrySection: string;
  occupationMajorGroup: string;
  managesPeople: string;
  ownershipSector: string;
  organizationTenure: string;

  jobLevel: string;
  jobFunction: string;
  organizationSize: string;

  // legacy compatibility
  employmentStatus: string;
  industryCode: string;
  employmentSector: string;
};

export type NormativeProfileCompletionDto = {
  profileId: string;
  assessmentSessionId: string;
  respondentId: string;
  consentId: string;
  completedAt: string;
  revision: number;
  alreadyCompleted: boolean;
  profile: NormativeProfileValuesDto;
  reward: NormativeProfileRewardDto | null;
};

export type NormativeProfileStatusDto = {
  completed: boolean;
  linkedToCurrentSession: boolean;
  needsProfileUpgrade: boolean;
  profileId: string | null;
  revision: number | null;
  consentAcceptedAt: string | null;
  consentWithdrawnAt: string | null;
  profile: NormativeProfileValuesDto | null;
  reward: Omit<NormativeProfileRewardDto, "discountCode"> | null;
  canClaimNewReward: boolean;
  eligibleAgainAt: string | null;
};
