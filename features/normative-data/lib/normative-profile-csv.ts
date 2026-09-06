import type { NormativeProfileAdminRowDto } from "../types/normative-admin.types";

function esc(value: unknown) {
  const s = value == null ? "" : String(value);
  return `"${s.replaceAll('"', '""')}"`;
}

export function buildNormativeProfilesCsv(rows: NormativeProfileAdminRowDto[]) {
  const header = [
    "profile_id",
    "owner_user_id",
    "owner_email",
    "owner_name",
    "revision",
    "age_at_assessment",
    "sex",
    "country_code",
    "voivodeship_code",
    "locality_size",
    "education_level",
    "worked_last_week",
    "has_job_temporary_absence",
    "is_working_for_norms",
    "employment_form",
    "work_time",
    "industry_section_pkd2025",
    "occupation_major_group",
    "manages_people",
    "ownership_sector",
    "organization_tenure",
    "job_level",
    "job_function",
    "organization_size",
    "legacy_employment_status",
    "legacy_industry_code",
    "legacy_employment_sector",
    "session_count",
    "tenant_count",
    "consent_status",
    "reward_status",
    "discount_code_preview",
    "completed_at",
  ];

  const data = rows.map((r) => [
    r.profileId,
    r.ownerUserId,
    r.ownerEmail,
    r.ownerName,
    r.revision,
    r.ageAtAssessment,
    r.sex,
    r.countryCode,
    r.voivodeshipCode,
    r.localitySize,
    r.educationLevel,
    r.workedLastWeek,
    r.hasJobTemporaryAbsence,
    r.isWorkingForNorms,
    r.employmentForm,
    r.workTime,
    r.industrySection,
    r.occupationMajorGroup,
    r.managesPeople,
    r.ownershipSector,
    r.organizationTenure,
    r.jobLevel,
    r.jobFunction,
    r.organizationSize,
    r.employmentStatus,
    r.industryCode,
    r.employmentSector,
    r.sessionCount,
    r.tenantCount,
    r.consentWithdrawnAt ? "withdrawn" : "active",
    r.rewardStatus,
    r.discountCodePreview,
    r.completedAt,
  ]);

  return "\uFEFF" + [header, ...data]
    .map((row) => row.map(esc).join(";"))
    .join("\n");
}
