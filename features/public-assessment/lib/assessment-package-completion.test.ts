import { describe, expect, it } from "vitest";

import { areAllProjectQuestionnairesCompleted } from "./assessment-package-completion";

describe("areAllProjectQuestionnairesCompleted", () => {
  const active = ["q1", "q2", "q3", "q4"];

  it("keeps a 4-questionnaire package open when only Q1 has a snapshot", () => {
    expect(
      areAllProjectQuestionnairesCompleted({
        activeProjectQuestionnaireIds: active,
        completedProjectQuestionnaireIds: new Set(["q1"]),
      }),
    ).toBe(false);
  });

  it("keeps the package open when Q1-Q3 have snapshots", () => {
    expect(
      areAllProjectQuestionnairesCompleted({
        activeProjectQuestionnaireIds: active,
        completedProjectQuestionnaireIds: new Set(["q1", "q2", "q3"]),
      }),
    ).toBe(false);
  });

  it("completes the package only when all active questionnaires have snapshots", () => {
    expect(
      areAllProjectQuestionnairesCompleted({
        activeProjectQuestionnaireIds: active,
        completedProjectQuestionnaireIds: new Set(["q1", "q2", "q3", "q4"]),
      }),
    ).toBe(true);
  });

  it("completes a single-questionnaire package after its snapshot exists", () => {
    expect(
      areAllProjectQuestionnairesCompleted({
        activeProjectQuestionnaireIds: ["q1"],
        completedProjectQuestionnaireIds: new Set(["q1"]),
      }),
    ).toBe(true);
  });

  it("does not complete an empty/invalid package", () => {
    expect(
      areAllProjectQuestionnairesCompleted({
        activeProjectQuestionnaireIds: [],
        completedProjectQuestionnaireIds: new Set(),
      }),
    ).toBe(false);
  });
});
