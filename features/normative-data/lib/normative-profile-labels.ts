import {
  EDUCATION_FIELD_OPTIONS,
  EDUCATION_LEVEL_OPTIONS,
  EMPLOYMENT_SECTOR_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  INDUSTRY_OPTIONS,
  JOB_FUNCTION_OPTIONS,
  JOB_LEVEL_OPTIONS,
  LOCALITY_SIZE_OPTIONS,
  ORGANIZATION_SIZE_OPTIONS,
  SEX_OPTIONS,
  VOIVODESHIP_OPTIONS,
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
  educationLevel: buildLabelMap(EDUCATION_LEVEL_OPTIONS),
  educationField: buildLabelMap(EDUCATION_FIELD_OPTIONS),
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
  if (!value) {
    return "—";
  }

  return maps[kind].get(value) ?? value;
}

export function getNormativeProfileLabels(
  kind: NormativeLabelKind,
  values: readonly string[],
): string {
  if (values.length === 0) {
    return "—";
  }

  return values
    .map((value) => getNormativeProfileLabel(kind, value))
    .join(", ");
}
