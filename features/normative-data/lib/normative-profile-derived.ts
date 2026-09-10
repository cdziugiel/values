// @humanet-normative-profile-v1_1
export type BaelEducationGroup =
  | "higher"
  | "postsecondary_secondary_vocational"
  | "general_secondary"
  | "basic_vocational_branch"
  | "lower_secondary_primary_lower"
  | null;

export type ResidenceType = "urban" | "rural" | null;
export type EconomicSector = "agriculture" | "industry" | "services" | null;

// @humanet-normative-work-situation-v1_2-derived
export type WorkSituation = "working" | "temporarily_not_working" | "not_working";

export function resolveIsWorkingForNormsFromSituation(value: string): boolean {
  return value === "working" || value === "temporarily_not_working";
}

export function inferWorkSituationFromLegacy(input: {
  workSituation?: string | null;
  workedLastWeek?: boolean | null;
  hasJobTemporaryAbsence?: boolean | null;
  employmentStatus?: string | null;
}): WorkSituation | "" {
  if (input.workSituation === "working" || input.workSituation === "temporarily_not_working" || input.workSituation === "not_working") return input.workSituation;
  if (input.workedLastWeek === true) return "working";
  if (input.workedLastWeek === false && input.hasJobTemporaryAbsence === true) return "temporarily_not_working";
  if (input.workedLastWeek === false && input.hasJobTemporaryAbsence === false) return "not_working";
  if (input.employmentStatus === "employed" || input.employmentStatus === "self_employed") return "working";
  if (input.employmentStatus === "unemployed" || input.employmentStatus === "retired") return "not_working";
  return "";
}

export function answerToBoolean(value: string): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

export function booleanToAnswer(value: boolean | null | undefined): "" | "yes" | "no" {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}

export function resolveIsWorkingForNorms(
  workedLastWeek: string,
  hasJobTemporaryAbsence: string,
): boolean {
  return (
    workedLastWeek === "yes" ||
    (workedLastWeek === "no" && hasJobTemporaryAbsence === "yes")
  );
}

export function mapEducationToBael(value: string): BaelEducationGroup {
  if (["bachelor", "master", "doctorate"].includes(value)) return "higher";
  if (["post_secondary", "vocational_secondary_branch"].includes(value)) {
    return "postsecondary_secondary_vocational";
  }
  if (value === "general_secondary") return "general_secondary";
  if (value === "basic_vocational_branch") return "basic_vocational_branch";
  if (["primary_or_lower", "lower_secondary", "primary"].includes(value)) {
    return "lower_secondary_primary_lower";
  }
  // Legacy vocational/secondary są celowo NIE mapowane:
  // stary zapis jest niejednoznaczny i nie wolno imputować go bez danych.
  return null;
}

export function mapLocalityToResidenceType(value: string): ResidenceType {
  if (value === "village") return "rural";
  if (value.startsWith("city_")) return "urban";
  return null;
}

export function mapPkd2025SectionToEconomicSector(value: string): EconomicSector {
  if (value === "A") return "agriculture";
  if (["B", "C", "D", "E", "F"].includes(value)) return "industry";
  if (/^[G-V]$/.test(value)) return "services";
  return null;
}

export function mapPkd2025ToLegacyIndustry(value: string): string {
  const map: Record<string, string> = {
    A: "agriculture",
    C: "manufacturing",
    D: "energy",
    F: "construction",
    G: "trade",
    H: "transport_logistics",
    I: "hospitality",
    K: "it_telecom",
    L: "finance_insurance",
    N: "professional_services",
    P: "public_administration",
    Q: "education",
    R: "healthcare",
    S: "culture_media",
  };
  if (value === "not_applicable") return "not_applicable";
  return map[value] ?? "other";
}

export function mapOwnershipToLegacySector(value: string): string {
  if (value === "private") return "private";
  if (value === "public") return "public";
  if (value === "not_applicable") return "not_applicable";
  return "prefer_not_to_say";
}

export function mapEmploymentFormToLegacyStatus(
  employmentForm: string,
  isWorkingForNorms: boolean,
): string {
  if (!isWorkingForNorms) return "other";
  if (["self_employed_no_employees", "employer"].includes(employmentForm)) {
    return "self_employed";
  }
  return "employed";
}

export function inferLegacyWorkingStatus(value: string | null | undefined): boolean | null {
  if (value === "employed" || value === "self_employed") return true;
  if (value === "unemployed" || value === "retired") return false;
  return null;
}

export function inferEmploymentFormFromLegacy(
  value: string | null | undefined,
): string {
  if (value === "self_employed") return "self_employed_no_employees";
  if (value === "employed") return "employee";
  return "not_applicable";
}

export function ageGroup(age: number): string | null {
  if (!Number.isFinite(age) || age < 18) return null;
  if (age <= 24) return "18-24";
  if (age <= 34) return "25-34";
  if (age <= 44) return "35-44";
  if (age <= 54) return "45-54";
  if (age <= 64) return "55-64";
  return "65+";
}

export function isPolishWorkerBenchmarkEligible(input: {
  countryCode: string;
  ageAtAssessment: number;
  isWorkingForNorms: boolean | null;
  excludedFromNorms?: boolean;
}): boolean {
  return (
    input.countryCode === "PL" &&
    input.ageAtAssessment >= 18 &&
    input.isWorkingForNorms === true &&
    input.excludedFromNorms !== true
  );
}
