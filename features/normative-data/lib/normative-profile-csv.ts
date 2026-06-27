import type { NormativeProfileAdminRowDto } from "../types/normative-admin.types";
function esc(value: unknown) { const s = value == null ? "" : String(value); return `"${s.replaceAll('"', '""')}"`; }
export function buildNormativeProfilesCsv(rows: NormativeProfileAdminRowDto[]) {
  const header = ["profile_id","owner_user_id","owner_email","owner_name","revision","age_at_assessment","sex","voivodeship_code","education_level","employment_status","industry_code","job_level","session_count","tenant_count","consent_status","reward_status","discount_code_preview","completed_at"];
  const data = rows.map(r => [r.profileId,r.ownerUserId,r.ownerEmail,r.ownerName,r.revision,r.ageAtAssessment,r.sex,r.voivodeshipCode,r.educationLevel,r.employmentStatus,r.industryCode,r.jobLevel,r.sessionCount,r.tenantCount,r.consentWithdrawnAt ? "withdrawn" : "active",r.rewardStatus,r.discountCodePreview,r.completedAt]);
  return "\uFEFF" + [header, ...data].map(row => row.map(esc).join(";")).join("\n");
}
