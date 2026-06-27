// features/normative-data/api/normative-admin.queries.ts

import {
  and,
  countDistinct,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import {
  normativeDataConsents,
  normativeProfileRewards,
  normativeProfileSessionLinks,
  normativeProfiles,
  users,
} from "@/drizzle/schema/control";
import { writeSystemAuditLog } from "@/server/audit/write-system-audit-log";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { controlDb } from "@/server/db/control-db";

import type {
  NormativeProfileAdminDetailDto,
  NormativeProfileAdminRowDto,
  NormativeProfilesAdminFilters,
  NormativeProfilesAdminPageDto,
} from "../types/normative-admin.types";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function whereFor(
  filters: NormativeProfilesAdminFilters,
): SQL | undefined {
  const conditions: SQL[] = [
    isNull(normativeProfiles.deletedAt),
  ];

  const query = filters.query?.trim();

  if (query) {
    const searchCondition = or(
      ilike(users.email, `%${query}%`),
      ilike(users.name, `%${query}%`),
      ilike(
        sql`${normativeProfiles.id}::text`,
        `%${query}%`,
      ),
      ilike(
        sql`${normativeProfiles.ownerUserId}::text`,
        `%${query}%`,
      ),
    );

    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  if (filters.consentStatus === "active") {
    conditions.push(
      isNull(normativeDataConsents.withdrawnAt),
    );
  }

  if (filters.consentStatus === "withdrawn") {
    conditions.push(
      isNotNull(normativeDataConsents.withdrawnAt),
    );
  }

  if (
    filters.rewardStatus &&
    filters.rewardStatus !== "all"
  ) {
    conditions.push(
      eq(
        normativeProfileRewards.status,
        filters.rewardStatus,
      ),
    );
  }

  return and(...conditions);
}

function iso(
  value: Date | null | undefined,
): string | null {
  return value?.toISOString() ?? null;
}

export async function getSystemNormativeProfilesPageData({
  filters = {},
}: {
  filters?: NormativeProfilesAdminFilters;
}): Promise<NormativeProfilesAdminPageDto> {
  await requireSuperAdmin();

  const page = Math.max(
    1,
    Math.trunc(filters.page ?? 1),
  );

  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      Math.trunc(
        filters.pageSize ??
          DEFAULT_PAGE_SIZE,
      ),
    ),
  );

  const where = whereFor(filters);

  const selection = {
    profileId: normativeProfiles.id,
    ownerUserId:
      normativeProfiles.ownerUserId,
    ownerEmail: users.email,
    ownerName: users.name,

    revision: normativeProfiles.revision,

    sex: normativeProfiles.sex,
    voivodeshipCode:
      normativeProfiles.voivodeshipCode,
    educationLevel:
      normativeProfiles.educationLevel,
    employmentStatus:
      normativeProfiles.employmentStatus,
    industryCode:
      normativeProfiles.industryCode,
    jobLevel: normativeProfiles.jobLevel,

    schemaVersion:
      normativeProfiles.schemaVersion,
    dictionaryVersion:
      normativeProfiles.dictionaryVersion,
    completedAt:
      normativeProfiles.completedAt,

    consentVersion:
      normativeDataConsents.consentVersion,
    consentAcceptedAt:
      normativeDataConsents.acceptedAt,
    consentWithdrawnAt:
      normativeDataConsents.withdrawnAt,

    rewardStatus:
      normativeProfileRewards.status,
    discountCodeId:
      normativeProfileRewards.discountCodeId,
    discountCodePreview:
      normativeProfileRewards.discountCodePreview,
    rewardIssuedAt:
      normativeProfileRewards.issuedAt,
    rewardExpiresAt:
      normativeProfileRewards.expiresAt,

    sessionCount: sql<number>`
      count(
        distinct ${normativeProfileSessionLinks.id}
      )
    `,

    tenantCount: sql<number>`
      count(
        distinct ${normativeProfileSessionLinks.tenantId}
      )
    `,

    ageAtAssessment: sql<number | null>`
      max(
        (
          ${normativeProfileSessionLinks.profileSnapshot}
          ->> 'ageAtAssessment'
        )::int
      )
    `,
  } as const;

  const [rows, totals] =
    await Promise.all([
      controlDb
        .select(selection)
        .from(normativeProfiles)
        .innerJoin(
          users,
          eq(
            users.id,
            normativeProfiles.ownerUserId,
          ),
        )
        .leftJoin(
          normativeDataConsents,
          eq(
            normativeDataConsents.statisticalProfileId,
            normativeProfiles.id,
          ),
        )
        .leftJoin(
          normativeProfileRewards,
          eq(
            normativeProfileRewards.statisticalProfileId,
            normativeProfiles.id,
          ),
        )
        .leftJoin(
          normativeProfileSessionLinks,
          eq(
            normativeProfileSessionLinks.statisticalProfileId,
            normativeProfiles.id,
          ),
        )
        .where(where)
        .groupBy(
          normativeProfiles.id,
          users.id,
          normativeDataConsents.id,
          normativeProfileRewards.id,
        )
        .orderBy(
          desc(normativeProfiles.updatedAt),
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize),

      controlDb
        .select({
          value: countDistinct(
            normativeProfiles.id,
          ),
        })
        .from(normativeProfiles)
        .innerJoin(
          users,
          eq(
            users.id,
            normativeProfiles.ownerUserId,
          ),
        )
        .leftJoin(
          normativeDataConsents,
          eq(
            normativeDataConsents.statisticalProfileId,
            normativeProfiles.id,
          ),
        )
        .leftJoin(
          normativeProfileRewards,
          eq(
            normativeProfileRewards.statisticalProfileId,
            normativeProfiles.id,
          ),
        )
        .where(where),
    ]);

  const mapped: NormativeProfileAdminRowDto[] =
    rows.map((row) => ({
      ...row,

      completedAt:
        row.completedAt.toISOString(),

      consentAcceptedAt: iso(
        row.consentAcceptedAt,
      ),

      consentWithdrawnAt: iso(
        row.consentWithdrawnAt,
      ),

      rewardIssuedAt: iso(
        row.rewardIssuedAt,
      ),

      rewardExpiresAt: iso(
        row.rewardExpiresAt,
      ),

      rewardStatus:
        row.rewardStatus ?? null,

      consentVersion:
        row.consentVersion ?? null,

      discountCodeId:
        row.discountCodeId ?? null,

      discountCodePreview:
        row.discountCodePreview ?? null,

      sessionCount: Number(
        row.sessionCount ?? 0,
      ),

      tenantCount: Number(
        row.tenantCount ?? 0,
      ),

      ageAtAssessment:
        row.ageAtAssessment == null
          ? null
          : Number(
              row.ageAtAssessment,
            ),
    }));

  const total = Number(
    totals[0]?.value ?? 0,
  );

  return {
    rows: mapped,
    total,
    page,
    pageSize,
    pageCount: Math.max(
      1,
      Math.ceil(total / pageSize),
    ),
  };
}

export async function getSystemNormativeProfileDetail({
  profileId,
}: {
  profileId: string;
}): Promise<NormativeProfileAdminDetailDto | null> {
  const admin =
    await requireSuperAdmin();

  const [profile] =
    await controlDb
      .select({
        profileId: normativeProfiles.id,
        ownerUserId:
          normativeProfiles.ownerUserId,
        ownerEmail: users.email,
        ownerName: users.name,

        revision:
          normativeProfiles.revision,

        dateOfBirth:
          normativeProfiles.dateOfBirth,
        birthYear:
          normativeProfiles.birthYear,
        sex: normativeProfiles.sex,
        countryCode:
          normativeProfiles.countryCode,
        voivodeshipCode:
          normativeProfiles.voivodeshipCode,
        localitySize:
          normativeProfiles.localitySize,
        educationLevel:
          normativeProfiles.educationLevel,
        educationFields:
          normativeProfiles.educationFields,
        employmentStatus:
          normativeProfiles.employmentStatus,
        industryCode:
          normativeProfiles.industryCode,
        jobLevel:
          normativeProfiles.jobLevel,
        jobFunction:
          normativeProfiles.jobFunction,
        organizationSize:
          normativeProfiles.organizationSize,
        employmentSector:
          normativeProfiles.employmentSector,
        recruitmentChannel:
          normativeProfiles.recruitmentChannel,

        schemaVersion:
          normativeProfiles.schemaVersion,
        dictionaryVersion:
          normativeProfiles.dictionaryVersion,
        completedAt:
          normativeProfiles.completedAt,

        consentId:
          normativeDataConsents.id,
        consentType:
          normativeDataConsents.consentType,
        consentVersion:
          normativeDataConsents.consentVersion,
        consentPurposeCode:
          normativeDataConsents.purposeCode,
        consentTextSnapshot:
          normativeDataConsents.consentTextSnapshot,
        consentAcceptedAt:
          normativeDataConsents.acceptedAt,
        consentWithdrawnAt:
          normativeDataConsents.withdrawnAt,

        rewardId:
          normativeProfileRewards.id,
        rewardType:
          normativeProfileRewards.rewardType,
        rewardStatus:
          normativeProfileRewards.status,
        discountCodeId:
          normativeProfileRewards.discountCodeId,
        discountCodePreview:
          normativeProfileRewards.discountCodePreview,
        rewardIssuedAt:
          normativeProfileRewards.issuedAt,
        rewardExpiresAt:
          normativeProfileRewards.expiresAt,
        rewardRedeemedAt:
          normativeProfileRewards.redeemedAt,
        rewardRevokedAt:
          normativeProfileRewards.revokedAt,

        sessionCount: sql<number>`
          count(
            distinct ${normativeProfileSessionLinks.id}
          )
        `,

        tenantCount: sql<number>`
          count(
            distinct ${normativeProfileSessionLinks.tenantId}
          )
        `,

        ageAtAssessment: sql<number | null>`
          max(
            (
              ${normativeProfileSessionLinks.profileSnapshot}
              ->> 'ageAtAssessment'
            )::int
          )
        `,
      })
      .from(normativeProfiles)
      .innerJoin(
        users,
        eq(
          users.id,
          normativeProfiles.ownerUserId,
        ),
      )
      .leftJoin(
        normativeDataConsents,
        eq(
          normativeDataConsents.statisticalProfileId,
          normativeProfiles.id,
        ),
      )
      .leftJoin(
        normativeProfileRewards,
        eq(
          normativeProfileRewards.statisticalProfileId,
          normativeProfiles.id,
        ),
      )
      .leftJoin(
        normativeProfileSessionLinks,
        eq(
          normativeProfileSessionLinks.statisticalProfileId,
          normativeProfiles.id,
        ),
      )
      .where(
        and(
          eq(
            normativeProfiles.id,
            profileId,
          ),
          isNull(
            normativeProfiles.deletedAt,
          ),
        ),
      )
      .groupBy(
        normativeProfiles.id,
        users.id,
        normativeDataConsents.id,
        normativeProfileRewards.id,
      )
      .limit(1);

  if (!profile) {
    return null;
  }

  await writeSystemAuditLog({
    actorUserId: admin.id,
    actorRole: "SUPER_ADMIN",
    action:
      "normative_profile.viewed",
    entityType:
      "normative_profile",
    entityId: profileId,
  });

  return {
    ...profile,

    completedAt:
      profile.completedAt.toISOString(),

    consentAcceptedAt: iso(
      profile.consentAcceptedAt,
    ),

    consentWithdrawnAt: iso(
      profile.consentWithdrawnAt,
    ),

    rewardIssuedAt: iso(
      profile.rewardIssuedAt,
    ),

    rewardExpiresAt: iso(
      profile.rewardExpiresAt,
    ),

    rewardRedeemedAt: iso(
      profile.rewardRedeemedAt,
    ),

    rewardRevokedAt: iso(
      profile.rewardRevokedAt,
    ),

    rewardStatus:
      profile.rewardStatus ?? null,

    consentVersion:
      profile.consentVersion ?? null,

    consentId:
      profile.consentId ?? null,

    consentType:
      profile.consentType ?? null,

    consentPurposeCode:
      profile.consentPurposeCode ?? null,

    consentTextSnapshot:
      profile.consentTextSnapshot ?? null,

    rewardId:
      profile.rewardId ?? null,

    rewardType:
      profile.rewardType ?? null,

    discountCodeId:
      profile.discountCodeId ?? null,

    discountCodePreview:
      profile.discountCodePreview ?? null,

    sessionCount: Number(
      profile.sessionCount ?? 0,
    ),

    tenantCount: Number(
      profile.tenantCount ?? 0,
    ),

    ageAtAssessment:
      profile.ageAtAssessment == null
        ? null
        : Number(
            profile.ageAtAssessment,
          ),
  };
}

export async function listSystemNormativeProfilesForExport() {
  const admin =
    await requireSuperAdmin();

  const data =
    await getSystemNormativeProfilesPageData({
      filters: {
        page: 1,
        pageSize: MAX_PAGE_SIZE,
      },
    });

  await writeSystemAuditLog({
    actorUserId: admin.id,
    actorRole: "SUPER_ADMIN",
    action:
      "normative_profiles.exported",
    entityType:
      "normative_profile",
  });

  return data.rows;
}