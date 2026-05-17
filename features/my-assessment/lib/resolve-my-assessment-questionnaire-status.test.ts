import { describe, expect, it } from "vitest";

import {
  canContinueMyAssessmentSession,
  canShowMyAssessmentResult,
  resolveMyAssessmentQuestionnaireStatus,
} from "./resolve-my-assessment-questionnaire-status";

describe("resolveMyAssessmentQuestionnaireStatus", () => {
  it("returns completed for completed session", () => {
    expect(
      resolveMyAssessmentQuestionnaireStatus({
        sessionStatus: "completed",
        completedAt: null,
      }),
    ).toBe("completed");
  });

  it("returns completed when completedAt exists even if legacy status is inconsistent", () => {
    expect(
      resolveMyAssessmentQuestionnaireStatus({
        sessionStatus: "in_progress",
        completedAt: new Date("2026-05-16T10:00:00Z"),
      }),
    ).toBe("completed");
  });

  it("returns in_progress for opened session", () => {
    expect(
      resolveMyAssessmentQuestionnaireStatus({
        sessionStatus: "opened",
        completedAt: null,
      }),
    ).toBe("in_progress");
  });

  it("returns in_progress for in_progress session", () => {
    expect(
      resolveMyAssessmentQuestionnaireStatus({
        sessionStatus: "in_progress",
        completedAt: null,
      }),
    ).toBe("in_progress");
  });

  it("returns available when there is no session", () => {
    expect(
      resolveMyAssessmentQuestionnaireStatus({
        sessionStatus: null,
        completedAt: null,
      }),
    ).toBe("available");
  });

  it("keeps coming_soon above session state", () => {
    expect(
      resolveMyAssessmentQuestionnaireStatus({
        isComingSoon: true,
        sessionStatus: "in_progress",
        completedAt: null,
      }),
    ).toBe("coming_soon");
  });

  it("keeps locked above session state", () => {
    expect(
      resolveMyAssessmentQuestionnaireStatus({
        isLocked: true,
        sessionStatus: "in_progress",
        completedAt: null,
      }),
    ).toBe("locked");
  });

  it("keeps disabled above session state", () => {
    expect(
      resolveMyAssessmentQuestionnaireStatus({
        isEnabled: false,
        sessionStatus: "in_progress",
        completedAt: null,
      }),
    ).toBe("disabled");
  });
});

describe("my assessment session actions", () => {
  it("allows continuing opened or in_progress sessions only", () => {
    expect(canContinueMyAssessmentSession({ sessionStatus: "opened" })).toBe(true);
    expect(canContinueMyAssessmentSession({ sessionStatus: "in_progress" })).toBe(true);
    expect(canContinueMyAssessmentSession({ sessionStatus: "completed" })).toBe(false);
  });

  it("does not allow continuing when completedAt exists", () => {
    expect(
      canContinueMyAssessmentSession({
        sessionStatus: "in_progress",
        completedAt: new Date("2026-05-16T10:00:00Z"),
      }),
    ).toBe(false);
  });

  it("shows result for completed sessions", () => {
    expect(canShowMyAssessmentResult({ sessionStatus: "completed" })).toBe(true);
    expect(
      canShowMyAssessmentResult({
        sessionStatus: "in_progress",
        completedAt: new Date("2026-05-16T10:00:00Z"),
      }),
    ).toBe(true);
  });
});