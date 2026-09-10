import { and, desc, eq, isNull } from "drizzle-orm";

import {
  normativeDataConsents,
  normativeProfileRewards,
  normativeProfileSessionLinks,
  normativeProfiles,
} from "@/drizzle/schema/control";
import { controlDb } from "@/server/db/control-db";

import {
  booleanToAnswer,
  inferEmploymentFormFromLegacy,
  inferLegacyWorkingStatus,
  inferWorkSituationFromLegacy,
} from "../lib/normative-profile-derived";
import { NORMATIVE_DICTIONARY_VERSION, NORMATIVE_PROFILE_SCHEMA_VERSION } from "../lib/normative-profile-options";
import type { NormativeProfileStatusDto } from "../types/normative-profile.types";
// @humanet-normative-profile-v1_1-queries
// @humanet-normative-work-situation-v1_2-queries

export async function getNormativeProfileStatus({
  ownerUserId,
  tenantId,
  assessmentSessionId,
}: {
  ownerUserId: string;
  tenantId: string;
  assessmentSessionId: string;
}): Promise<NormativeProfileStatusDto> {
  const [profile] = await controlDb
    .select()
    .from(normativeProfiles)
    .where(and(eq(normativeProfiles.ownerUserId, ownerUserId), isNull(normativeProfiles.deletedAt)))
    .limit(1);

  if (!profile) {
    return {
      completed: false,
      linkedToCurrentSession: false,
      needsProfileUpgrade: false,
      profileId: null,
      revision: null,
      consentAcceptedAt: null,
      consentWithdrawnAt: null,
      profile: null,
      reward: null,
      canClaimNewReward: false,
      eligibleAgainAt: null,
    };
  }

  const [consents, links, rewards] = await Promise.all([
    controlDb
      .select({ acceptedAt: normativeDataConsents.acceptedAt, withdrawnAt: normativeDataConsents.withdrawnAt })
      .from(normativeDataConsents)
      .where(eq(normativeDataConsents.statisticalProfileId, profile.id))
      .orderBy(desc(normativeDataConsents.acceptedAt))
      .limit(1),
    controlDb
      .select({ id: normativeProfileSessionLinks.id })
      .from(normativeProfileSessionLinks)
      .where(and(
        eq(normativeProfileSessionLinks.tenantId, tenantId),
        eq(normativeProfileSessionLinks.assessmentSessionId, assessmentSessionId),
      ))
      .limit(1),
    controlDb
      .select()
      .from(normativeProfileRewards)
      .where(and(
        eq(normativeProfileRewards.ownerUserId, ownerUserId),
        eq(normativeProfileRewards.rewardType, "discount_code"),
      ))
      .orderBy(desc(normativeProfileRewards.createdAt))
      .limit(1),
  ]);

  const consent = consents[0] ?? null;
  const reward = rewards[0] ?? null;
  const canClaimNewReward = !reward?.eligibleAgainAt || reward.eligibleAgainAt <= new Date();

  return {
    completed: true,
    linkedToCurrentSession: Boolean(links[0]),
    needsProfileUpgrade: profile.schemaVersion !== NORMATIVE_PROFILE_SCHEMA_VERSION || profile.dictionaryVersion !== NORMATIVE_DICTIONARY_VERSION,
    profileId: profile.id,
    revision: profile.revision,
    consentAcceptedAt: consent?.acceptedAt?.toISOString() ?? null,
    consentWithdrawnAt: consent?.withdrawnAt?.toISOString() ?? null,
    profile: (() => {
      const legacyWorking = inferLegacyWorkingStatus(profile.employmentStatus);
      const isWorkingForNorms = profile.isWorkingForNorms ?? legacyWorking;
      return {
        dateOfBirth: profile.dateOfBirth,
        sex: profile.sex,
        countryCode: profile.countryCode,
        voivodeshipCode: profile.voivodeshipCode ?? "",
        localitySize: profile.localitySize ?? "",
        educationLevel: profile.educationLevel ?? "",
        educationFields: profile.educationFields,

        workSituation: inferWorkSituationFromLegacy({
          workSituation: profile.workSituation,
          workedLastWeek: profile.workedLastWeek,
          hasJobTemporaryAbsence: profile.hasJobTemporaryAbsence,
          employmentStatus: profile.employmentStatus,
        }),
        isWorkingForNorms,
        employmentForm:
          profile.employmentForm ?? inferEmploymentFormFromLegacy(profile.employmentStatus),
        workTime: profile.workTime ?? (isWorkingForNorms ? "" : "not_applicable"),
        industrySection: profile.industrySection ?? (isWorkingForNorms ? "" : "not_applicable"),
        occupationMajorGroup: profile.occupationMajorGroup ?? (isWorkingForNorms ? "" : "not_applicable"),
        managesPeople:
          profile.managesPeople == null
            ? (isWorkingForNorms ? "" : "not_applicable")
            : booleanToAnswer(profile.managesPeople),
        ownershipSector:
          profile.ownershipSector ??
          (profile.employmentSector === "private" || profile.employmentSector === "public"
            ? profile.employmentSector
            : isWorkingForNorms ? "" : "not_applicable"),
        organizationTenure: profile.organizationTenure ?? (isWorkingForNorms ? "" : "not_applicable"),

        employmentStatus: profile.employmentStatus ?? "",
        industryCode: profile.industryCode ?? "",
        jobLevel: profile.jobLevel ?? (isWorkingForNorms ? "" : "not_applicable"),
        jobFunction: profile.jobFunction ?? (isWorkingForNorms ? "" : "not_applicable"),
        organizationSize: profile.organizationSize ?? (isWorkingForNorms ? "" : "not_applicable"),
        employmentSector: profile.employmentSector ?? "",
      };
    })(),
    reward: reward ? {
      rewardId: reward.id,
      status: reward.status,
      discountCodeId: reward.discountCodeId,
      discountCodePreview: reward.discountCodePreview,
      issuedAt: reward.issuedAt?.toISOString() ?? null,
      expiresAt: reward.expiresAt?.toISOString() ?? null,
      eligibleAgainAt: reward.eligibleAgainAt?.toISOString() ?? null,
      usageLimit: reward.usageLimit,
    } : null,
    canClaimNewReward,
    eligibleAgainAt: reward?.eligibleAgainAt?.toISOString() ?? null,
  };
}
