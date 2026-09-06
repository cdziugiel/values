import {
  ALL_EDUCATION_LEVEL_OPTIONS,
  EDUCATION_FIELD_OPTIONS,
  EMPLOYMENT_FORM_OPTIONS,
  EMPLOYMENT_SECTOR_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  INDUSTRY_OPTIONS,
  INDUSTRY_SECTION_OPTIONS,
  JOB_FUNCTION_OPTIONS,
  JOB_LEVEL_OPTIONS,
  LOCALITY_SIZE_OPTIONS,
  MANAGES_PEOPLE_OPTIONS,
  OCCUPATION_MAJOR_GROUP_OPTIONS,
  ORGANIZATION_SIZE_OPTIONS,
  ORGANIZATION_TENURE_OPTIONS,
  OWNERSHIP_SECTOR_OPTIONS,
  SEX_OPTIONS,
  VOIVODESHIP_OPTIONS,
  WORK_TIME_OPTIONS,
  YES_NO_OPTIONS,
} from "./normative-profile-options";

type Option = Readonly<{
  value: string;
  label: string;
}>;

function buildLabelMap(options: readonly Option[]) {
  return new Map(options.map((option) => [option.value, option.label]));
}

const maps = {
  sex: buildLabelMap(SEX_OPTIONS),
  voivodeship: buildLabelMap(VOIVODESHIP_OPTIONS),
  localitySize: buildLabelMap(LOCALITY_SIZE_OPTIONS),
  educationLevel: buildLabelMap(ALL_EDUCATION_LEVEL_OPTIONS),
  educationField: buildLabelMap(EDUCATION_FIELD_OPTIONS),

  workedLastWeek: buildLabelMap(YES_NO_OPTIONS),
  employmentForm: buildLabelMap(EMPLOYMENT_FORM_OPTIONS),
  workTime: buildLabelMap(WORK_TIME_OPTIONS),
  industrySection: buildLabelMap(INDUSTRY_SECTION_OPTIONS),
  occupationMajorGroup: buildLabelMap(OCCUPATION_MAJOR_GROUP_OPTIONS),
  managesPeople: buildLabelMap(MANAGES_PEOPLE_OPTIONS),
  ownershipSector: buildLabelMap(OWNERSHIP_SECTOR_OPTIONS),
  organizationTenure: buildLabelMap(ORGANIZATION_TENURE_OPTIONS),

  // legacy
  employmentStatus: buildLabelMap(EMPLOYMENT_STATUS_OPTIONS),
  industry: buildLabelMap(INDUSTRY_OPTIONS),
  jobLevel: buildLabelMap(JOB_LEVEL_OPTIONS),
  jobFunction: buildLabelMap(JOB_FUNCTION_OPTIONS),
  organizationSize: buildLabelMap(ORGANIZATION_SIZE_OPTIONS),
  employmentSector: buildLabelMap(EMPLOYMENT_SECTOR_OPTIONS),
} as const;

export type NormativeLabelKind = keyof typeof maps;

export function getNormativeProfileLabel(
  kind: NormativeLabelKind,
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return maps[kind].get(value) ?? value;
}

export function getNormativeProfileLabels(
  kind: NormativeLabelKind,
  values: readonly string[],
): string {
  if (values.length === 0) return "—";
  return values.map((value) => getNormativeProfileLabel(kind, value)).join(", ");
}
