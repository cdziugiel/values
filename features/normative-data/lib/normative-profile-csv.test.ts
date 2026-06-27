import { describe, expect, it } from "vitest";

import { buildNormativeProfilesCsv } from "./normative-profile-csv";

describe("buildNormativeProfilesCsv", () => {
  it("does not export direct identity fields and escapes CSV values", () => {
    const csv = buildNormativeProfilesCsv([
      {
        profileId: "profile-1",
        respondentKey: "respondent-1",
        assessmentSessionKey: "session-1",
        assessmentProjectKey: "project-1",
        projectRespondentKey: "project-respondent-1",
        assessmentCompletedAt: new Date("2026-06-27T10:00:00.000Z"),
        birthYear: 1990,
        ageAtAssessment: 36,
        sex: "female",
        countryCode: "PL",
        voivodeshipCode: "14",
        localitySize: "city_over_500k",
        educationLevel: "master",
        educationFields: ["social_sciences", "business_law"],
        employmentStatus: "employed",
        industryCode: "professional_services",
        jobLevel: "director",
        jobFunction: "general_management",
        organizationSize: "small",
        employmentSector: "private",
        recruitmentChannel: "discount_incentive",
        profileSchemaVersion: "1.0",
        dictionaryVersion: "2026-01",
        consentId: "consent-1",
        consentVersion: "2026-01",
        consentAcceptedAt: new Date("2026-06-27T10:05:00.000Z"),
        consentWithdrawnAt: null,
      },
    ]);

    expect(csv).toContain('"social_sciences|business_law"');
    expect(csv).not.toContain("first_name");
    expect(csv).not.toContain("last_name");
    expect(csv).not.toContain("email");
    expect(csv).not.toContain("date_of_birth");
  });
});
