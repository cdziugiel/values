import { describe, expect, it } from "vitest";

import {
  ageGroup,
  isPolishWorkerBenchmarkEligible,
  mapEducationToBael,
  mapLocalityToResidenceType,
  mapPkd2025SectionToEconomicSector,
  resolveIsWorkingForNorms,
} from "./normative-profile-derived";

describe("normative profile v1.1 derived fields", () => {
  it("resolves working status from the two-stage screener", () => {
    expect(resolveIsWorkingForNorms("yes", "not_applicable")).toBe(true);
    expect(resolveIsWorkingForNorms("no", "yes")).toBe(true);
    expect(resolveIsWorkingForNorms("no", "no")).toBe(false);
  });

  it("does not guess ambiguous legacy education categories", () => {
    expect(mapEducationToBael("vocational")).toBeNull();
    expect(mapEducationToBael("secondary")).toBeNull();
    expect(mapEducationToBael("master")).toBe("higher");
    expect(mapEducationToBael("general_secondary")).toBe("general_secondary");
  });

  it("derives residence and economic sector", () => {
    expect(mapLocalityToResidenceType("village")).toBe("rural");
    expect(mapLocalityToResidenceType("city_100k_250k")).toBe("urban");
    expect(mapPkd2025SectionToEconomicSector("A")).toBe("agriculture");
    expect(mapPkd2025SectionToEconomicSector("C")).toBe("industry");
    expect(mapPkd2025SectionToEconomicSector("Q")).toBe("services");
  });

  it("uses stable analysis age groups without discarding exact age", () => {
    expect(ageGroup(18)).toBe("18-24");
    expect(ageGroup(34)).toBe("25-34");
    expect(ageGroup(65)).toBe("65+");
    expect(ageGroup(17)).toBeNull();
  });

  it("qualifies Polish working adults for the worker benchmark", () => {
    expect(isPolishWorkerBenchmarkEligible({
      countryCode: "PL",
      ageAtAssessment: 42,
      isWorkingForNorms: true,
    })).toBe(true);

    expect(isPolishWorkerBenchmarkEligible({
      countryCode: "PL",
      ageAtAssessment: 17,
      isWorkingForNorms: true,
    })).toBe(false);
  });
});
