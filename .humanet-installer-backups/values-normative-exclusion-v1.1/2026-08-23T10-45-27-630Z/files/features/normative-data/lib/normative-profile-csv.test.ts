import { describe, expect, it } from "vitest";

import { buildNormativeProfilesCsv } from "./normative-profile-csv";

describe("buildNormativeProfilesCsv", () => {
  it("exports normative profile rows using the current admin DTO contract", () => {
    const csv = buildNormativeProfilesCsv([
      {
        profileId: "profile-1",
        ownerUserId: "user-1",
        ownerEmail: "owner@example.com",
        ownerName: "Jan Kowalski",

        revision: 1,
        ageAtAssessment: 36,
        sex: "female",
        voivodeshipCode: "14",
        educationLevel: "master",
        employmentStatus: "employed",
        industryCode: "professional_services",
        jobLevel: "director",

        schemaVersion: "1.0",
        dictionaryVersion: "2026-01",

        completedAt: "2026-06-27T10:00:00.000Z",

        consentVersion: "2026-01",
        consentAcceptedAt: "2026-06-27T10:05:00.000Z",
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
    expect(csv).toContain('"owner@example.com"');
    expect(csv).toContain('"professional_services"');
    expect(csv).toContain('"2026-06-27T10:00:00.000Z"');
    expect(csv).toContain('"active"');
  });
});