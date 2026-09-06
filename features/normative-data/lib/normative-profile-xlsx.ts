import ExcelJS from "exceljs";

import type { NormativeProfileAdminRowDto } from "../types/normative-admin.types";
import {
  ageGroup,
  isPolishWorkerBenchmarkEligible,
  mapEducationToBael,
  mapLocalityToResidenceType,
  mapPkd2025SectionToEconomicSector,
} from "./normative-profile-derived";
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
  OCCUPATION_MAJOR_GROUP_OPTIONS,
  ORGANIZATION_SIZE_OPTIONS,
  ORGANIZATION_TENURE_OPTIONS,
  OWNERSHIP_SECTOR_OPTIONS,
  SEX_OPTIONS,
  VOIVODESHIP_OPTIONS,
  WORK_TIME_OPTIONS,
} from "./normative-profile-options";
import {
  getNormativeProfileLabel,
  getNormativeProfileLabels,
} from "./normative-profile-labels";

// @humanet-normative-admin-v1_1_2-r2-xlsx

type Option = Readonly<{
  value: string;
  label: string;
}>;

const HEADER_FILL = "2A2438";
const HEADER_FONT = "FFFFFF";
const SECTION_FILL = "EAE7F0";

function label(
  kind: Parameters<
    typeof getNormativeProfileLabel
  >[0],
  value: string | null | undefined,
) {
  return getNormativeProfileLabel(
    kind,
    value,
  );
}

function booleanCode(
  value: boolean | null,
) {
  if (value === true) {
    return "true";
  }

  if (value === false) {
    return "false";
  }

  return "";
}

function consentStatus(
  row: NormativeProfileAdminRowDto,
) {
  return row.consentWithdrawnAt
    ? "withdrawn"
    : "active";
}

function styleHeader(
  row: ExcelJS.Row,
) {
  row.font = {
    bold: true,
    color: {
      argb: HEADER_FONT,
    },
  };

  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: HEADER_FILL,
    },
  };

  row.alignment = {
    vertical: "middle",
    wrapText: true,
  };
}

function styleSection(
  row: ExcelJS.Row,
) {
  row.font = {
    bold: true,
  };

  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: SECTION_FILL,
    },
  };
}

function addLegendOptions(
  sheet: ExcelJS.Worksheet,
  field: string,
  fieldLabel: string,
  options: readonly Option[],
  note = "",
) {
  options.forEach((option) => {
    sheet.addRow([
      field,
      fieldLabel,
      option.value,
      option.label,
      note,
    ]);
  });
}

export async function buildNormativeProfilesXlsx(
  rows: NormativeProfileAdminRowDto[],
): Promise<Buffer> {
  const workbook =
    new ExcelJS.Workbook();

  workbook.creator = "HUMANET";
  workbook.created = new Date();
  workbook.modified = new Date();

  const data =
    workbook.addWorksheet(
      "Dane",
      {
        views: [
          {
            state: "frozen",
            xSplit: 4,
            ySplit: 1,
          },
        ],
      },
    );

  data.columns = [
    { header: "profile_id", key: "profileId", width: 38 },
    { header: "owner_user_id", key: "ownerUserId", width: 38 },
    { header: "owner_email", key: "ownerEmail", width: 30 },
    { header: "owner_name", key: "ownerName", width: 24 },

    { header: "revision", key: "revision", width: 10 },
    { header: "schema_version", key: "schemaVersion", width: 14 },
    { header: "dictionary_version", key: "dictionaryVersion", width: 18 },

    { header: "birth_year", key: "birthYear", width: 12 },
    { header: "age_at_assessment", key: "ageAtAssessment", width: 18 },
    { header: "age_group", key: "ageGroup", width: 12 },

    { header: "sex_code", key: "sexCode", width: 18 },
    { header: "sex_label", key: "sexLabel", width: 22 },
    { header: "country_code", key: "countryCode", width: 14 },
    { header: "voivodeship_code", key: "voivodeshipCode", width: 18 },
    { header: "voivodeship_label", key: "voivodeshipLabel", width: 26 },
    { header: "locality_size_code", key: "localitySizeCode", width: 24 },
    { header: "locality_size_label", key: "localitySizeLabel", width: 36 },
    { header: "residence_type", key: "residenceType", width: 18 },

    { header: "education_level_code", key: "educationLevelCode", width: 32 },
    { header: "education_level_label", key: "educationLevelLabel", width: 44 },
    { header: "education_fields_codes", key: "educationFieldsCodes", width: 44 },
    { header: "education_fields_labels", key: "educationFieldsLabels", width: 54 },
    { header: "bael_education_group", key: "baelEducationGroup", width: 40 },

    { header: "worked_last_week", key: "workedLastWeek", width: 20 },
    {
      header: "has_job_temporary_absence",
      key: "hasJobTemporaryAbsence",
      width: 30,
    },
    { header: "is_working_for_norms", key: "isWorkingForNorms", width: 24 },

    { header: "employment_form_code", key: "employmentFormCode", width: 32 },
    { header: "employment_form_label", key: "employmentFormLabel", width: 54 },
    { header: "work_time_code", key: "workTimeCode", width: 22 },
    { header: "work_time_label", key: "workTimeLabel", width: 30 },

    {
      header: "industry_classification",
      key: "industryClassification",
      width: 24,
    },
    {
      header: "industry_section_pkd2025_code",
      key: "industrySectionCode",
      width: 30,
    },
    {
      header: "industry_section_pkd2025_label",
      key: "industrySectionLabel",
      width: 52,
    },
    { header: "economic_sector", key: "economicSector", width: 20 },

    {
      header: "occupation_major_group_code",
      key: "occupationMajorGroupCode",
      width: 30,
    },
    {
      header: "occupation_major_group_label",
      key: "occupationMajorGroupLabel",
      width: 54,
    },

    { header: "job_level_code", key: "jobLevelCode", width: 24 },
    { header: "job_level_label", key: "jobLevelLabel", width: 32 },
    { header: "job_function_code", key: "jobFunctionCode", width: 30 },
    { header: "job_function_label", key: "jobFunctionLabel", width: 34 },
    { header: "manages_people", key: "managesPeople", width: 18 },

    {
      header: "organization_size_code",
      key: "organizationSizeCode",
      width: 26,
    },
    {
      header: "organization_size_label",
      key: "organizationSizeLabel",
      width: 28,
    },
    {
      header: "ownership_sector_code",
      key: "ownershipSectorCode",
      width: 26,
    },
    {
      header: "ownership_sector_label",
      key: "ownershipSectorLabel",
      width: 28,
    },
    {
      header: "organization_tenure_code",
      key: "organizationTenureCode",
      width: 28,
    },
    {
      header: "organization_tenure_label",
      key: "organizationTenureLabel",
      width: 30,
    },

    {
      header: "recruitment_channel",
      key: "recruitmentChannel",
      width: 24,
    },

    {
      header: "legacy_employment_status_code",
      key: "legacyEmploymentStatusCode",
      width: 32,
    },
    {
      header: "legacy_employment_status_label",
      key: "legacyEmploymentStatusLabel",
      width: 34,
    },
    {
      header: "legacy_industry_code",
      key: "legacyIndustryCode",
      width: 30,
    },
    {
      header: "legacy_industry_label",
      key: "legacyIndustryLabel",
      width: 36,
    },
    {
      header: "legacy_employment_sector_code",
      key: "legacyEmploymentSectorCode",
      width: 32,
    },
    {
      header: "legacy_employment_sector_label",
      key: "legacyEmploymentSectorLabel",
      width: 32,
    },

    {
      header: "benchmark_eligible_pl_workers_18plus",
      key: "benchmarkEligible",
      width: 36,
    },
    { header: "included_in_norms", key: "includedInNorms", width: 22 },

    { header: "session_count", key: "sessionCount", width: 16 },
    { header: "tenant_count", key: "tenantCount", width: 16 },

    { header: "consent_status", key: "consentStatus", width: 18 },
    { header: "consent_version", key: "consentVersion", width: 20 },

    { header: "reward_status", key: "rewardStatus", width: 18 },
    {
      header: "discount_code_preview",
      key: "discountCodePreview",
      width: 26,
    },

    { header: "completed_at", key: "completedAt", width: 28 },
  ];

  rows.forEach((row) => {
    const derivedAgeGroup =
      row.ageAtAssessment == null
        ? null
        : ageGroup(
            row.ageAtAssessment,
          );

    const residenceType =
      mapLocalityToResidenceType(
        row.localitySize ?? "",
      );

    const baelEducationGroup =
      mapEducationToBael(
        row.educationLevel ?? "",
      );

    const economicSector =
      mapPkd2025SectionToEconomicSector(
        row.industrySection ?? "",
      );

    const benchmarkEligible =
      row.ageAtAssessment == null
        ? false
        : isPolishWorkerBenchmarkEligible({
            countryCode:
              row.countryCode,
            ageAtAssessment:
              row.ageAtAssessment,
            isWorkingForNorms:
              row.isWorkingForNorms,
            excludedFromNorms:
              row.excludedFromNorms,
          });

    data.addRow({
      profileId: row.profileId,
      ownerUserId: row.ownerUserId,
      ownerEmail: row.ownerEmail,
      ownerName: row.ownerName ?? "",

      revision: row.revision,
      schemaVersion: row.schemaVersion,
      dictionaryVersion: row.dictionaryVersion,

      birthYear: row.birthYear,
      ageAtAssessment:
        row.ageAtAssessment ?? "",
      ageGroup:
        derivedAgeGroup ?? "",

      sexCode: row.sex,
      sexLabel: label(
        "sex",
        row.sex,
      ),
      countryCode: row.countryCode,
      voivodeshipCode:
        row.voivodeshipCode ?? "",
      voivodeshipLabel: label(
        "voivodeship",
        row.voivodeshipCode,
      ),
      localitySizeCode:
        row.localitySize ?? "",
      localitySizeLabel: label(
        "localitySize",
        row.localitySize,
      ),
      residenceType:
        residenceType ?? "",

      educationLevelCode:
        row.educationLevel ?? "",
      educationLevelLabel: label(
        "educationLevel",
        row.educationLevel,
      ),
      educationFieldsCodes:
        row.educationFields.join("|"),
      educationFieldsLabels:
        getNormativeProfileLabels(
          "educationField",
          row.educationFields,
        ),
      baelEducationGroup:
        baelEducationGroup ?? "",

      workedLastWeek: booleanCode(
        row.workedLastWeek,
      ),
      hasJobTemporaryAbsence:
        booleanCode(
          row.hasJobTemporaryAbsence,
        ),
      isWorkingForNorms:
        booleanCode(
          row.isWorkingForNorms,
        ),

      employmentFormCode:
        row.employmentForm ?? "",
      employmentFormLabel: label(
        "employmentForm",
        row.employmentForm,
      ),
      workTimeCode:
        row.workTime ?? "",
      workTimeLabel: label(
        "workTime",
        row.workTime,
      ),

      industryClassification:
        row.industryClassification ?? "",
      industrySectionCode:
        row.industrySection ?? "",
      industrySectionLabel: label(
        "industrySection",
        row.industrySection,
      ),
      economicSector:
        economicSector ?? "",

      occupationMajorGroupCode:
        row.occupationMajorGroup ?? "",
      occupationMajorGroupLabel:
        label(
          "occupationMajorGroup",
          row.occupationMajorGroup,
        ),

      jobLevelCode:
        row.jobLevel ?? "",
      jobLevelLabel: label(
        "jobLevel",
        row.jobLevel,
      ),
      jobFunctionCode:
        row.jobFunction ?? "",
      jobFunctionLabel: label(
        "jobFunction",
        row.jobFunction,
      ),
      managesPeople: booleanCode(
        row.managesPeople,
      ),

      organizationSizeCode:
        row.organizationSize ?? "",
      organizationSizeLabel: label(
        "organizationSize",
        row.organizationSize,
      ),
      ownershipSectorCode:
        row.ownershipSector ?? "",
      ownershipSectorLabel: label(
        "ownershipSector",
        row.ownershipSector,
      ),
      organizationTenureCode:
        row.organizationTenure ?? "",
      organizationTenureLabel:
        label(
          "organizationTenure",
          row.organizationTenure,
        ),

      recruitmentChannel:
        row.recruitmentChannel,

      legacyEmploymentStatusCode:
        row.employmentStatus ?? "",
      legacyEmploymentStatusLabel:
        label(
          "employmentStatus",
          row.employmentStatus,
        ),
      legacyIndustryCode:
        row.industryCode ?? "",
      legacyIndustryLabel:
        label(
          "industry",
          row.industryCode,
        ),
      legacyEmploymentSectorCode:
        row.employmentSector ?? "",
      legacyEmploymentSectorLabel:
        label(
          "employmentSector",
          row.employmentSector,
        ),

      benchmarkEligible:
        benchmarkEligible
          ? "true"
          : "false",
      includedInNorms:
        row.excludedFromNorms
          ? "false"
          : "true",

      sessionCount: row.sessionCount,
      tenantCount: row.tenantCount,

      consentStatus:
        consentStatus(row),
      consentVersion:
        row.consentVersion ?? "",

      rewardStatus:
        row.rewardStatus ?? "",
      discountCodePreview:
        row.discountCodePreview ?? "",

      completedAt:
        row.completedAt,
    });
  });

  styleHeader(
    data.getRow(1),
  );

  data.autoFilter = {
    from: {
      row: 1,
      column: 1,
    },
    to: {
      row: 1,
      column: data.columnCount,
    },
  };

  data.eachRow(
    {
      includeEmpty: false,
    },
    (row, rowNumber) => {
      row.alignment = {
        vertical: "top",
        wrapText:
          rowNumber === 1,
      };
    },
  );

  const legend =
    workbook.addWorksheet(
      "Legenda",
      {
        views: [
          {
            state: "frozen",
            ySplit: 5,
          },
        ],
      },
    );

  legend.columns = [
    {
      key: "field",
      width: 40,
    },
    {
      key: "fieldLabel",
      width: 52,
    },
    {
      key: "code",
      width: 36,
    },
    {
      key: "meaning",
      width: 58,
    },
    {
      key: "notes",
      width: 74,
    },
  ];

  const title =
    legend.addRow([
      "HUMANET — dane normatywne",
    ]);

  legend.mergeCells(
    `A${title.number}:E${title.number}`,
  );

  title.font = {
    bold: true,
    size: 16,
    color: {
      argb: HEADER_FONT,
    },
  };

  title.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: HEADER_FILL,
    },
  };

  legend.addRow([
    "Eksport",
    "",
    "",
    "Arkusz „Dane” zawiera stabilne kody oraz odpowiadające im etykiety.",
    "Eksport tej ścieżki obejmuje rekordy aktualnie włączone do analiz.",
  ]);

  legend.addRow([
    "Benchmark „Pracujący w Polsce 18+”",
    "",
    "",
    "PL + wiek ≥18 + is_working_for_norms=true + rekord niewyłączony.",
    "Pole benchmark_eligible_pl_workers_18plus jest wyliczane automatycznie.",
  ]);

  legend.addRow([
    "Profile v1.0",
    "",
    "",
    "Starsze profile nie zawierają wszystkich pól v1.1.",
    "Niejednoznacznych danych legacy nie imputujemy automatycznie.",
  ]);

  const header =
    legend.addRow([
      "Pole",
      "Nazwa / znaczenie pola",
      "Kod / wartość",
      "Znaczenie",
      "Uwagi",
    ]);

  styleHeader(header);

  const fieldRows: Array<
    [string, string, string, string, string]
  > = [
    [
      "birth_year",
      "Rok urodzenia",
      "",
      "Rok urodzenia respondenta.",
      "Pełna data urodzenia nie jest eksportowana do analitycznego XLSX.",
    ],
    [
      "age_at_assessment",
      "Wiek w chwili badania",
      "",
      "Wiek liczony dla sesji.",
      "Podstawowa zmienna do budowy grup wieku.",
    ],
    [
      "age_group",
      "Grupa wieku",
      "18-24 / 25-34 / 35-44 / 45-54 / 55-64 / 65+",
      "Domyślne grupy bieżącego benchmarku.",
      "Surowy wiek pozostaje dostępny, więc grupy można redefiniować.",
    ],
    [
      "residence_type",
      "Typ miejsca zamieszkania",
      "urban / rural",
      "Agregacja locality_size.",
      "",
    ],
    [
      "bael_education_group",
      "Grupa wykształcenia BAEL/GUS",
      "",
      "Deterministyczna agregacja education_level.",
      "Niejednoznaczne stare kody v1.0 nie są imputowane.",
    ],
    [
      "economic_sector",
      "Sektor ekonomiczny",
      "agriculture / industry / services",
      "Agregacja sekcji PKD 2025.",
      "",
    ],
    [
      "worked_last_week",
      "Praca w ostatnich 7 dniach",
      "true / false",
      "Pierwszy etap screenera pracy.",
      "",
    ],
    [
      "has_job_temporary_absence",
      "Praca/działalność mimo czasowej nieobecności",
      "true / false / puste",
      "Drugi etap screenera pracy.",
      "Puste zwykle oznacza „nie dotyczy” lub brak pola w profilu v1.0.",
    ],
    [
      "is_working_for_norms",
      "Kwalifikacja do populacji pracujących",
      "true / false / puste",
      "Status używany do norm „Pracujący”.",
      "Puste może wystąpić w profilach v1.0.",
    ],
    [
      "industry_classification",
      "Klasyfikacja branży",
      "PKD2025 / puste",
      "Wersja klasyfikacji użyta dla industry_section.",
      "",
    ],
    [
      "manages_people",
      "Formalne zarządzanie ludźmi",
      "true / false / puste",
      "Czy respondent formalnie odpowiada za pracę co najmniej jednej osoby.",
      "",
    ],
    [
      "recruitment_channel",
      "Kanał rekrutacji",
      "",
      "Kanał, z którego pochodzi profil.",
      "Metadane konkretnej fali/panelu mogą być przechowywane przy linku sesji.",
    ],
    [
      "benchmark_eligible_pl_workers_18plus",
      "Kwalifikacja do benchmarku „Pracujący w Polsce 18+”",
      "true / false",
      "PL + wiek ≥18 + pracujący + niewyłączony.",
      "",
    ],
    [
      "included_in_norms",
      "Status włączenia do analiz",
      "true / false",
      "false oznacza ręczne wyłączenie obserwacji.",
      "Eksport tej ścieżki zawiera wyłącznie included=true.",
    ],
    [
      "consent_status",
      "Status zgody",
      "active / withdrawn",
      "Aktywna lub wycofana zgoda normatywna.",
      "",
    ],
  ];

  fieldRows.forEach((row) =>
    legend.addRow(row),
  );

  const separator =
    legend.addRow([
      "SŁOWNIKI",
      "",
      "",
      "",
      "",
    ]);

  styleSection(separator);

  addLegendOptions(
    legend,
    "sex_code",
    "Płeć",
    SEX_OPTIONS,
  );

  addLegendOptions(
    legend,
    "voivodeship_code",
    "Województwo",
    VOIVODESHIP_OPTIONS,
  );

  addLegendOptions(
    legend,
    "locality_size_code",
    "Wielkość miejscowości",
    LOCALITY_SIZE_OPTIONS,
  );

  addLegendOptions(
    legend,
    "education_level_code",
    "Poziom wykształcenia",
    ALL_EDUCATION_LEVEL_OPTIONS,
  );

  addLegendOptions(
    legend,
    "education_fields_codes",
    "Dziedzina wykształcenia",
    EDUCATION_FIELD_OPTIONS,
    "Wiele odpowiedzi w eksporcie jest rozdzielanych znakiem |.",
  );

  addLegendOptions(
    legend,
    "employment_form_code",
    "Forma pracy",
    EMPLOYMENT_FORM_OPTIONS,
  );

  addLegendOptions(
    legend,
    "work_time_code",
    "Wymiar pracy",
    WORK_TIME_OPTIONS,
  );

  addLegendOptions(
    legend,
    "industry_section_pkd2025_code",
    "Branża — sekcja PKD 2025",
    INDUSTRY_SECTION_OPTIONS,
  );

  addLegendOptions(
    legend,
    "occupation_major_group_code",
    "Wielka grupa zawodów",
    OCCUPATION_MAJOR_GROUP_OPTIONS,
  );

  addLegendOptions(
    legend,
    "job_level_code",
    "Poziom stanowiska HUMANET",
    JOB_LEVEL_OPTIONS,
  );

  addLegendOptions(
    legend,
    "job_function_code",
    "Obszar funkcjonalny HUMANET",
    JOB_FUNCTION_OPTIONS,
  );

  addLegendOptions(
    legend,
    "organization_size_code",
    "Wielkość organizacji",
    ORGANIZATION_SIZE_OPTIONS,
  );

  addLegendOptions(
    legend,
    "ownership_sector_code",
    "Sektor własności",
    OWNERSHIP_SECTOR_OPTIONS,
  );

  addLegendOptions(
    legend,
    "organization_tenure_code",
    "Staż w obecnej pracy",
    ORGANIZATION_TENURE_OPTIONS,
  );

  addLegendOptions(
    legend,
    "legacy_employment_status_code",
    "Status zawodowy — legacy",
    EMPLOYMENT_STATUS_OPTIONS,
    "Pole kompatybilności ze schematem v1.0.",
  );

  addLegendOptions(
    legend,
    "legacy_industry_code",
    "Branża HUMANET — legacy",
    INDUSTRY_OPTIONS,
    "Pole kompatybilności ze schematem v1.0.",
  );

  addLegendOptions(
    legend,
    "legacy_employment_sector_code",
    "Sektor — legacy",
    EMPLOYMENT_SECTOR_OPTIONS,
    "Pole kompatybilności ze schematem v1.0.",
  );

  legend.eachRow(
    {
      includeEmpty: false,
    },
    (row) => {
      row.alignment = {
        vertical: "top",
        wrapText: true,
      };
    },
  );

  legend.autoFilter = "A5:E5";

  const output =
    await workbook.xlsx.writeBuffer();

  return Buffer.from(output);
}
