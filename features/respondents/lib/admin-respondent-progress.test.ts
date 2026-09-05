// @humanet-respondent-directory-v1
// features/respondents/lib/admin-respondent-progress.test.ts

import { describe, expect, it } from "vitest";

import { deriveAdminQuestionnaireRuns } from "./admin-respondent-progress";

const startedAt = new Date("2026-08-28T10:00:00.000Z");
const completedAt = new Date("2026-08-28T10:10:00.000Z");

describe("deriveAdminQuestionnaireRuns", () => {
  it("traktuje snapshot jako źródło zakończenia kwestionariusza", () => {
    const runs = deriveAdminQuestionnaireRuns({
      sessions: [
        {
          sessionId: "session-1",
          respondentId: "respondent-1",
          projectId: "project-1",
          projectName: "Projekt",
          sessionStatus: "in_progress",
          startedAt,
          completedAt: null,
        },
      ],
      responses: [
        {
          sessionId: "session-1",
          questionnaireId: "questionnaire-1",
          questionnaireVersionId: "version-1",
          responseCount: 12,
        },
      ],
      snapshots: [
        {
          sessionId: "session-1",
          questionnaireId: "questionnaire-1",
          questionnaireVersionId: "version-1",
          createdAt: completedAt,
        },
      ],
    });

    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("completed");
    expect(runs[0]?.completedAt).toEqual(completedAt);
  });

  it("obsługuje legacy fallback dla pojedynczego kwestionariusza w zakończonej sesji", () => {
    const runs = deriveAdminQuestionnaireRuns({
      sessions: [
        {
          sessionId: "session-1",
          respondentId: "respondent-1",
          projectId: "project-1",
          projectName: "Projekt",
          sessionStatus: "completed",
          startedAt,
          completedAt,
        },
      ],
      responses: [
        {
          sessionId: "session-1",
          questionnaireId: "questionnaire-1",
          questionnaireVersionId: "version-1",
          responseCount: 20,
        },
      ],
      snapshots: [],
    });

    expect(runs[0]?.status).toBe("completed");
  });

  it("nie uznaje wielokwestionariuszowej sesji legacy za jednoznacznie zakończone kwestionariusze", () => {
    const runs = deriveAdminQuestionnaireRuns({
      sessions: [
        {
          sessionId: "session-1",
          respondentId: "respondent-1",
          projectId: "project-1",
          projectName: "Projekt",
          sessionStatus: "completed",
          startedAt,
          completedAt,
        },
      ],
      responses: [
        {
          sessionId: "session-1",
          questionnaireId: "questionnaire-1",
          questionnaireVersionId: "version-1",
          responseCount: 20,
        },
        {
          sessionId: "session-1",
          questionnaireId: "questionnaire-2",
          questionnaireVersionId: "version-2",
          responseCount: 10,
        },
      ],
      snapshots: [],
    });

    expect(runs.map((run) => run.status)).toEqual([
      "started",
      "started",
    ]);
  });

  it("pokazuje zakończony kwestionariusz nawet gdy historyczny snapshot nie ma już odpowiedzi", () => {
    const runs = deriveAdminQuestionnaireRuns({
      sessions: [
        {
          sessionId: "session-1",
          respondentId: "respondent-1",
          projectId: "project-1",
          projectName: "Projekt",
          sessionStatus: "completed",
          startedAt,
          completedAt,
        },
      ],
      responses: [],
      snapshots: [
        {
          sessionId: "session-1",
          questionnaireId: "questionnaire-1",
          questionnaireVersionId: "version-1",
          createdAt: completedAt,
        },
      ],
    });

    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("completed");
    expect(runs[0]?.responseCount).toBe(0);
  });
});
