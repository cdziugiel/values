import { describe, expect, it } from "vitest";
import { inferWorkSituationFromLegacy, resolveIsWorkingForNormsFromSituation } from "./normative-profile-derived";
// @humanet-normative-work-situation-v1_2-test
describe("work situation v1.2", () => {
  it("classifies current situation", () => {
    expect(resolveIsWorkingForNormsFromSituation("working")).toBe(true);
    expect(resolveIsWorkingForNormsFromSituation("temporarily_not_working")).toBe(true);
    expect(resolveIsWorkingForNormsFromSituation("not_working")).toBe(false);
  });
  it("reads historical v1.1 screener", () => {
    expect(inferWorkSituationFromLegacy({ workedLastWeek: true })).toBe("working");
    expect(inferWorkSituationFromLegacy({ workedLastWeek: false, hasJobTemporaryAbsence: true })).toBe("temporarily_not_working");
    expect(inferWorkSituationFromLegacy({ workedLastWeek: false, hasJobTemporaryAbsence: false })).toBe("not_working");
  });
});
