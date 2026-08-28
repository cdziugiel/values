import { describe, expect, it } from "vitest";

import { areAllProjectQuestionnairesCompleted } from "./assessment-package-completion";

describe("areAllProjectQuestionnairesCompleted", () => {
  const active = ["q1", "q2", "q3", "q4"];

  it("keeps the package open after the first questionnaire", () => {
    expect(
      areAllProjectQuestionnairesCompleted({
        activeProjectQuestionnaireIds: active,
        completedProjectQuestionnaireIds: new Set(),
        currentProjectQuestionnaireId: "q1",
      }),
    ).toBe(false);
  });

  it("keeps the package open while another questionnaire remains", () => {
    expect(
      areAllProjectQuestionnairesCompleted({
        activeProjectQuestionnaireIds: active,
        completedProjectQuestionnaireIds: new Set(["q1", "q2"]),
        currentProjectQuestionnaireId: "q3",
      }),
    ).toBe(false);
  });

  it("completes the package only with the last questionnaire", () => {
    expect(
      areAllProjectQuestionnairesCompleted({
        activeProjectQuestionnaireIds: active,
        completedProjectQuestionnaireIds: new Set(["q1", "q2", "q3"]),
        currentProjectQuestionnaireId: "q4",
      }),
    ).toBe(true);
  });

  it("still completes a single-questionnaire assessment", () => {
    expect(
      areAllProjectQuestionnairesCompleted({
        activeProjectQuestionnaireIds: ["q1"],
        completedProjectQuestionnaireIds: new Set(),
        currentProjectQuestionnaireId: "q1",
      }),
    ).toBe(true);
  });

  it("does not complete an invalid package without active questionnaires", () => {
    expect(
      areAllProjectQuestionnairesCompleted({
        activeProjectQuestionnaireIds: [],
        completedProjectQuestionnaireIds: new Set(),
        currentProjectQuestionnaireId: "q1",
      }),
    ).toBe(false);
  });
});
