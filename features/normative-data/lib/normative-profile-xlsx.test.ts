import ExcelJS from "exceljs";
import {
  describe,
  expect,
  it,
} from "vitest";

import type { NormativeProfileAdminRowDto } from "../types/normative-admin.types";
import { buildNormativeProfilesXlsx } from "./normative-profile-xlsx";

describe("buildNormativeProfilesXlsx", () => {
  it("creates Data and Legend sheets with codes and labels", async () => {
    const row: NormativeProfileAdminRowDto = {
      profileId: "profile-1",
      ownerUserId: "user-1",
      ownerEmail: "owner@example.com",
      ownerName: "Jan Kowalski",

      revision: 2,
      excludedFromNorms: false,

      birthYear: 1990,
      ageAtAssessment: 36,

      sex: "female",
      countryCode: "PL",
      voivodeshipCode: "14",
      localitySize: "city_100k_250k",

      educationLevel: "master",
      educationFields: [
        "social_sciences",
      ],

      workedLastWeek: true,
      hasJobTemporaryAbsence: null,
      isWorkingForNorms: true,

      employmentForm: "employee",
      workTime: "full_time",

      industryClassification: "PKD2025",
      industrySection: "N",

      occupationMajorGroup: "2",
      managesPeople: true,
      ownershipSector: "private",
      organizationTenure: "3_5_years",

      employmentStatus: "employed",
      industryCode: "professional_services",
      jobLevel: "director",
      jobFunction: "general_management",
      organizationSize: "medium",
      employmentSector: "private",

      recruitmentChannel: "research_panel",

      schemaVersion: "1.1",
      dictionaryVersion: "2026-09",
      completedAt: "2026-09-06T10:00:00.000Z",

      consentVersion: "2026-01",
      consentAcceptedAt: "2026-09-06T10:05:00.000Z",
      consentWithdrawnAt: null,

      rewardStatus: null,
      discountCodeId: null,
      discountCodePreview: null,
      rewardIssuedAt: null,
      rewardExpiresAt: null,

      sessionCount: 1,
      tenantCount: 1,
    };

    const output =
      await buildNormativeProfilesXlsx(
        [row],
      );

    const workbook =
      new ExcelJS.Workbook();

    await workbook.xlsx.load(
      output as unknown as Parameters<
        typeof workbook.xlsx.load
      >[0],
    );

    const data =
      workbook.getWorksheet("Dane");

    const legend =
      workbook.getWorksheet("Legenda");

    expect(data).toBeTruthy();
    expect(legend).toBeTruthy();

    const headerValues =
      data!.getRow(1).values as unknown[];

    expect(
      headerValues,
    ).toContain(
      "sex_label",
    );

    expect(
      headerValues,
    ).toContain(
      "education_fields_labels",
    );

    const rowValues =
      data!.getRow(2).values as unknown[];

    expect(
      rowValues,
    ).toContain("Kobieta");

    expect(
      rowValues,
    ).toContain("mazowieckie");

    expect(
      rowValues,
    ).toContain(
      "Działalność profesjonalna, naukowa i techniczna",
    );

    expect(
      rowValues,
    ).toContain(
      "Nauki społeczne",
    );

    const legendText =
      legend!
        .getSheetValues()
        .flat()
        .filter(Boolean)
        .join(" ");

    expect(
      legendText,
    ).toContain(
      "Wielka grupa zawodów",
    );

    expect(
      legendText,
    ).toContain(
      "Pracownicy usług i sprzedawcy",
    );
  });
});
