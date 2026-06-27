import { and, desc, eq, isNull } from "drizzle-orm";

import {
  assessmentSessions,
} from "@/drizzle/schema/tenant";
import {
  normativeDataConsents,
  normativeProfileRewards,
  normativeProfileSessionLinks,
  normativeProfiles,
} from "@/drizzle/schema/control";
import { issueNormativeDiscountCode } from "@/features/discount-codes/api/issue-normative-discount-code";
import { assertMyAssessmentSessionAccess } from "@/features/my-assessment/api/assert-my-assessment-session-access";
import { writeSystemAuditLog } from "@/server/audit/write-system-audit-log";
import { controlDb } from "@/server/db/control-db";
import type { TenantDb } from "@/server/db/tenant-db";

import { normativeProfileFormSchema, type NormativeProfileFormInput } from "../forms/normative-profile.schema";
import { calculateAgeAtAssessment } from "../lib/calculate-age-at-assessment";
import {
  NORMATIVE_CONSENT_VERSION,
  NORMATIVE_DICTIONARY_VERSION,
  NORMATIVE_PROFILE_SCHEMA_VERSION,
} from "../lib/normative-profile-options";
import { buildNormativeProfileSnapshot } from "../lib/normative-profile-snapshot";
import type {
  NormativeProfileCompletionDto,
  NormativeProfileRewardDto,
  NormativeProfileValuesDto,
} from "../types/normative-profile.types";

const CONSENT_TYPE = "normative_data_processing";
const PURPOSE_CODE = "psychometric_norm_development";
const REWARD_TYPE = "discount_code";
const REWARD_USAGE_LIMIT = 4;

export const NORMATIVE_CONSENT_TEXT =
  "Wyrażam dobrowolną zgodę na wykorzystanie przekazanych danych statystycznych oraz wyników wskazanej sesji badania do prowadzenia analiz naukowych, walidacji narzędzi i tworzenia norm psychometrycznych HUMANET. Przyjmuję do wiadomości, że dane źródłowe pozostają powiązane z moją sesją i profilem respondenta w celu zapewnienia poprawności, audytowalności i możliwości wycofania zgody, natomiast analizy i prezentacja wyników będą prowadzone w formie ograniczającej bezpośrednią identyfikację osób.";

function addUtcYears(value: Date, years: number) {
  const result = new Date(value);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

async function getCompletedOwnedSession({
  db,
  assessmentSessionId,
  userEmail,
}: {
  db: TenantDb;
  assessmentSessionId: string;
  userEmail: string;
}) {
  const access = await assertMyAssessmentSessionAccess({ db, userEmail, assessmentSessionId });
  const [session] = await db
    .select({
      id: assessmentSessions.id,
      respondentId: assessmentSessions.respondentId,
      assessmentProjectId: assessmentSessions.assessmentProjectId,
      projectRespondentId: assessmentSessions.projectRespondentId,
      completedAt: assessmentSessions.completedAt,
      status: assessmentSessions.status,
    })
    .from(assessmentSessions)
    .where(and(eq(assessmentSessions.id, access.assessmentSessionId), isNull(assessmentSessions.deletedAt)))
    .limit(1);

  if (!session || session.status !== "completed" || !session.completedAt) {
    throw new Error("Profil statystyczny można przekazać dopiero po ukończeniu badania.");
  }

  return {
    id: session.id,
    respondentId: session.respondentId,
    assessmentProjectId: session.assessmentProjectId,
    projectRespondentId: session.projectRespondentId,
    completedAt: session.completedAt,
  };
}

function toValues(profile: typeof normativeProfiles.$inferSelect): NormativeProfileValuesDto {
  return {
    dateOfBirth: profile.dateOfBirth,
    sex: profile.sex,
    countryCode: profile.countryCode,
    voivodeshipCode: profile.voivodeshipCode ?? "",
    localitySize: profile.localitySize ?? "",
    educationLevel: profile.educationLevel ?? "",
    educationFields: profile.educationFields,
    employmentStatus: profile.employmentStatus ?? "",
    industryCode: profile.industryCode ?? "",
    jobLevel: profile.jobLevel ?? "",
    jobFunction: profile.jobFunction ?? "",
    organizationSize: profile.organizationSize ?? "",
    employmentSector: profile.employmentSector ?? "",
  };
}

async function issueReward({
  profileId,
  ownerUserId,
  tenantId,
  assessmentSessionId,
}: {
  profileId: string;
  ownerUserId: string;
  tenantId: string;
  assessmentSessionId: string;
}): Promise<NormativeProfileRewardDto | null> {
  const now = new Date();
  const [latest] = await controlDb
    .select()
    .from(normativeProfileRewards)
    .where(and(
      eq(normativeProfileRewards.ownerUserId, ownerUserId),
      eq(normativeProfileRewards.rewardType, REWARD_TYPE),
    ))
    .orderBy(desc(normativeProfileRewards.createdAt))
    .limit(1);

  if (latest?.eligibleAgainAt && latest.eligibleAgainAt > now) {
    return {
      rewardId: latest.id,
      status: latest.status,
      discountCodeId: latest.discountCodeId,
      discountCode: null,
      discountCodePreview: latest.discountCodePreview,
      issuedAt: latest.issuedAt?.toISOString() ?? null,
      expiresAt: latest.expiresAt?.toISOString() ?? null,
      eligibleAgainAt: latest.eligibleAgainAt.toISOString(),
      usageLimit: latest.usageLimit,
    };
  }

  const [reward] = await controlDb
    .insert(normativeProfileRewards)
    .values({
      statisticalProfileId: profileId,
      ownerUserId,
      sourceTenantId: tenantId,
      sourceAssessmentSessionId: assessmentSessionId,
      rewardType: REWARD_TYPE,
      status: "pending",
      usageLimit: REWARD_USAGE_LIMIT,
      eligibleAgainAt: addUtcYears(now, 1),
      createdBy: ownerUserId,
      updatedBy: ownerUserId,
    })
    .returning();

  const issued = await issueNormativeDiscountCode({
    rewardId: reward.id,
    assignedUserId: ownerUserId,
    actorUserId: ownerUserId,
    assessmentSessionId,
    usageLimit: REWARD_USAGE_LIMIT,
  });

  const [updated] = await controlDb
    .update(normativeProfileRewards)
    .set({
      status: "issued",
      discountCodeId: issued.discountCodeId,
      discountCodePreview: issued.codePreview,
      issuedAt: now,
      expiresAt: issued.expiresAt,
      updatedAt: now,
      updatedBy: ownerUserId,
    })
    .where(eq(normativeProfileRewards.id, reward.id))
    .returning();

  return {
    rewardId: updated.id,
    status: updated.status,
    discountCodeId: updated.discountCodeId,
    discountCode: issued.code,
    discountCodePreview: updated.discountCodePreview,
    issuedAt: updated.issuedAt?.toISOString() ?? null,
    expiresAt: updated.expiresAt?.toISOString() ?? null,
    eligibleAgainAt: updated.eligibleAgainAt?.toISOString() ?? null,
    usageLimit: updated.usageLimit,
  };
}

export async function ensureNormativeProfileLinkedToSession({
  db,
  tenantId,
  userId,
  userEmail,
  assessmentSessionId,
}: {
  db: TenantDb;
  tenantId: string;
  userId: string;
  userEmail: string;
  assessmentSessionId: string;
}) {
  const [profile] = await controlDb
    .select()
    .from(normativeProfiles)
    .where(and(eq(normativeProfiles.ownerUserId, userId), isNull(normativeProfiles.deletedAt)))
    .limit(1);

  if (!profile) return null;

  const session = await getCompletedOwnedSession({ db, assessmentSessionId, userEmail });
  const ageAtAssessment = calculateAgeAtAssessment(profile.dateOfBirth, session.completedAt);
  const snapshot = buildNormativeProfileSnapshot({
    data: toValues(profile) as Omit<NormativeProfileFormInput, "tenantSlug" | "assessmentSessionId" | "consentAccepted">,
    schemaVersion: profile.schemaVersion,
    dictionaryVersion: profile.dictionaryVersion,
    revision: profile.revision,
    ageAtAssessment,
  });

  await controlDb
    .insert(normativeProfileSessionLinks)
    .values({
      statisticalProfileId: profile.id,
      tenantId,
      assessmentSessionId: session.id,
      respondentId: session.respondentId,
      assessmentProjectId: session.assessmentProjectId,
      projectRespondentId: session.projectRespondentId,
      profileRevision: profile.revision,
      profileSnapshot: snapshot,
      assessmentCompletedAt: session.completedAt,
    })
    .onConflictDoNothing({
      target: [normativeProfileSessionLinks.tenantId, normativeProfileSessionLinks.assessmentSessionId],
    });

  return profile.id;
}

export async function completeNormativeProfile({
  db,
  tenantId,
  userId,
  userEmail,
  mode,
  ipAddress,
  userAgent,
  input,
}: {
  db: TenantDb;
  tenantId: string;
  userId: string;
  userEmail: string;
  mode: "create" | "update";
  ipAddress?: string | null;
  userAgent?: string | null;
  input: NormativeProfileFormInput;
}): Promise<NormativeProfileCompletionDto> {
  const parsed = normativeProfileFormSchema.parse(input);
  const session = await getCompletedOwnedSession({ db, assessmentSessionId: parsed.assessmentSessionId, userEmail });
  const ageAtAssessment = calculateAgeAtAssessment(parsed.dateOfBirth, session.completedAt);
  const now = new Date();

  const [existing] = await controlDb
    .select()
    .from(normativeProfiles)
    .where(and(eq(normativeProfiles.ownerUserId, userId), isNull(normativeProfiles.deletedAt)))
    .limit(1);

  const profileValues = {
    ownerUserId: userId,
    schemaVersion: NORMATIVE_PROFILE_SCHEMA_VERSION,
    dictionaryVersion: NORMATIVE_DICTIONARY_VERSION,
    dateOfBirth: parsed.dateOfBirth,
    birthYear: Number(parsed.dateOfBirth.slice(0, 4)),
    sex: parsed.sex,
    countryCode: parsed.countryCode,
    voivodeshipCode: parsed.voivodeshipCode,
    localitySize: parsed.localitySize,
    educationLevel: parsed.educationLevel,
    educationFields: parsed.educationFields,
    employmentStatus: parsed.employmentStatus,
    industryCode: parsed.industryCode,
    jobLevel: parsed.jobLevel,
    jobFunction: parsed.jobFunction,
    organizationSize: parsed.organizationSize,
    employmentSector: parsed.employmentSector,
    updatedAt: now,
    updatedBy: userId,
  } as const;

  let profile: typeof normativeProfiles.$inferSelect;

  if (existing) {
    const [updated] = await controlDb
      .update(normativeProfiles)
      .set({ ...profileValues, revision: existing.revision + 1 })
      .where(eq(normativeProfiles.id, existing.id))
      .returning();
    profile = updated;
  } else {
    if (mode === "update") throw new Error("Nie znaleziono profilu do aktualizacji.");
    const [created] = await controlDb
      .insert(normativeProfiles)
      .values({ ...profileValues, revision: 1, createdBy: userId, completedAt: now })
      .returning();
    profile = created;
  }

let consentId: string;

if (!existing) {
  const [consent] =
    await controlDb
      .insert(normativeDataConsents)
      .values({
        statisticalProfileId:
          profile.id,
        ownerUserId: userId,
        sourceTenantId: tenantId,
        sourceAssessmentSessionId:
          session.id,
        consentType: CONSENT_TYPE,
        consentVersion:
          NORMATIVE_CONSENT_VERSION,
        purposeCode: PURPOSE_CODE,
        consentTextSnapshot:
          NORMATIVE_CONSENT_TEXT,
        acceptedAt: now,
        ipAddress:
          ipAddress ?? null,
        userAgent:
          userAgent ?? null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning({
        id: normativeDataConsents.id,
      });

  if (!consent) {
    throw new Error(
      "Nie udało się zapisać zgody normatywnej.",
    );
  }

  consentId = consent.id;
} else {
  const [consent] =
    await controlDb
      .select({
        id: normativeDataConsents.id,
      })
      .from(normativeDataConsents)
      .where(
        eq(
          normativeDataConsents.statisticalProfileId,
          profile.id,
        ),
      )
      .orderBy(
        desc(
          normativeDataConsents.acceptedAt,
        ),
      )
      .limit(1);

  if (!consent) {
    throw new Error(
      "Nie znaleziono zgody przypisanej do profilu normatywnego.",
    );
  }

  consentId = consent.id;
}

  const snapshot = buildNormativeProfileSnapshot({
    data: toValues(profile) as Omit<NormativeProfileFormInput, "tenantSlug" | "assessmentSessionId" | "consentAccepted">,
    schemaVersion: profile.schemaVersion,
    dictionaryVersion: profile.dictionaryVersion,
    revision: profile.revision,
    ageAtAssessment,
  });

  await controlDb
    .insert(normativeProfileSessionLinks)
    .values({
      statisticalProfileId: profile.id,
      tenantId,
      assessmentSessionId: session.id,
      respondentId: session.respondentId,
      assessmentProjectId: session.assessmentProjectId,
      projectRespondentId: session.projectRespondentId,
      profileRevision: profile.revision,
      profileSnapshot: snapshot,
      assessmentCompletedAt: session.completedAt,
    })
    .onConflictDoUpdate({
      target: [normativeProfileSessionLinks.tenantId, normativeProfileSessionLinks.assessmentSessionId],
      set: {
        statisticalProfileId: profile.id,
        profileRevision: profile.revision,
        profileSnapshot: snapshot,
        assessmentCompletedAt: session.completedAt,
        updatedAt: now,
      },
    });

  const reward = existing
    ? null
    : await issueReward({ profileId: profile.id, ownerUserId: userId, tenantId, assessmentSessionId: session.id });

  await writeSystemAuditLog({
    actorUserId: userId,
    tenantId,
    actorRole: "USER",
    action: existing ? "normative_profile.updated" : "normative_profile.created",
    entityType: "normative_profile",
    entityId: profile.id,
    after: { revision: profile.revision, sourceAssessmentSessionId: session.id },
    ipAddress: ipAddress ?? null,
    userAgent: userAgent ?? null,
  });

  return {
    profileId: profile.id,
    assessmentSessionId:
      session.id,
    respondentId:
      session.respondentId,
    consentId,
    completedAt:
      profile.completedAt.toISOString(),
    revision:
      profile.revision,
    alreadyCompleted:
      Boolean(existing),
    profile:
      toValues(profile),
    reward,
  };
}

export async function claimAnnualNormativeReward({
  db,
  tenantId,
  userId,
  userEmail,
  assessmentSessionId,
}: {
  db: TenantDb;
  tenantId: string;
  userId: string;
  userEmail: string;
  assessmentSessionId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<NormativeProfileRewardDto> {
  const session = await getCompletedOwnedSession({ db, assessmentSessionId, userEmail });
  const [profile] = await controlDb
    .select()
    .from(normativeProfiles)
    .where(and(eq(normativeProfiles.ownerUserId, userId), isNull(normativeProfiles.deletedAt)))
    .limit(1);
  if (!profile) throw new Error("Najpierw uzupełnij profil statystyczny.");
  const reward = await issueReward({ profileId: profile.id, ownerUserId: userId, tenantId, assessmentSessionId: session.id });
  if (!reward) throw new Error("Nie udało się rozwiązać nagrody.");
  return reward;
}
