import { describe, expect, it } from "vitest";

import { buildNormativeProfilesCsv } from "./normative-profile-csv";

describe("buildNormativeProfilesCsv", () => {
  it("exports v1.1 normative profile fields used for worker benchmarks", () => {
    const csv = buildNormativeProfilesCsv([
      {
        profileId: "profile-1",
        ownerUserId: "user-1",
        ownerEmail: "owner@example.com",
        ownerName: "Jan Kowalski",

        revision: 2,
        excludedFromNorms: false,
        ageAtAssessment: 36,

        sex: "female",
        countryCode: "PL",
        voivodeshipCode: "14",
        localitySize: "city_100k_250k",
        educationLevel: "master",

        workedLastWeek: true,
        hasJobTemporaryAbsence: null,
        isWorkingForNorms: true,
        employmentForm: "employee",
        workTime: "full_time",
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
      },
    ]);

    expect(csv).toContain('"profile-1"');
    expect(csv).toContain('"is_working_for_norms"');
    expect(csv).toContain('"industry_section_pkd2025"');
    expect(csv).toContain('"N"');
    expect(csv).toContain('"2"');
    expect(csv).toContain('"active"');
  });
});
