// @humanet-respondent-directory-v1
// features/respondents/lib/admin-respondent-progress.ts

export type AdminProgressSessionInput = {
  sessionId: string;
  respondentId: string;
  projectId: string;
  projectName: string | null;
  sessionStatus: string;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type AdminProgressResponseInput = {
  sessionId: string;
  questionnaireId: string | null;
  questionnaireVersionId: string;
  responseCount: number;
};

export type AdminProgressSnapshotInput = {
  sessionId: string;
  questionnaireId: string | null;
  questionnaireVersionId: string | null;
  createdAt: Date | null;
};

export type DerivedAdminQuestionnaireRun = {
  respondentId: string;
  projectId: string;
  projectName: string | null;
  questionnaireId: string | null;
  questionnaireVersionId: string;
  status: "started" | "completed";
  responseCount: number;
  startedAt: Date | null;
  completedAt: Date | null;
};

function runKey(sessionId: string, questionnaireVersionId: string) {
  return `${sessionId}::${questionnaireVersionId}`;
}

function dateValue(value: Date | null) {
  return value?.getTime() ?? 0;
}

/**
 * Status "completed" opiera się przede wszystkim na snapshotcie wyniku.
 * Dla historycznych sesji sprzed modelu scoped snapshot stosujemy ostrożny
 * fallback: zakończona sesja może oznaczać ukończony kwestionariusz tylko,
 * jeśli w tej sesji występuje dokładnie jedna wersja kwestionariusza.
 */
export function deriveAdminQuestionnaireRuns({
  sessions,
  responses,
  snapshots,
}: {
  sessions: AdminProgressSessionInput[];
  responses: AdminProgressResponseInput[];
  snapshots: AdminProgressSnapshotInput[];
}): DerivedAdminQuestionnaireRun[] {
  const sessionById = new Map(
    sessions.map((session) => [session.sessionId, session]),
  );

  const responsesBySessionId = new Map<
    string,
    AdminProgressResponseInput[]
  >();

  for (const response of responses) {
    const current = responsesBySessionId.get(response.sessionId) ?? [];
    current.push(response);
    responsesBySessionId.set(response.sessionId, current);
  }

  const snapshotByRunKey = new Map<
    string,
    AdminProgressSnapshotInput
  >();

  for (const snapshot of snapshots) {
    if (!snapshot.questionnaireVersionId) continue;

    snapshotByRunKey.set(
      runKey(snapshot.sessionId, snapshot.questionnaireVersionId),
      snapshot,
    );
  }

  const derivedByRunKey = new Map<
    string,
    DerivedAdminQuestionnaireRun
  >();

  for (const response of responses) {
    const session = sessionById.get(response.sessionId);
    if (!session) continue;

    const key = runKey(
      response.sessionId,
      response.questionnaireVersionId,
    );

    const snapshot = snapshotByRunKey.get(key) ?? null;
    const responseVariants =
      responsesBySessionId.get(response.sessionId) ?? [];

    const legacySingleQuestionnaireCompletion =
      !snapshot &&
      session.sessionStatus === "completed" &&
      responseVariants.length === 1;

    const completed =
      Boolean(snapshot) || legacySingleQuestionnaireCompletion;

    derivedByRunKey.set(key, {
      respondentId: session.respondentId,
      projectId: session.projectId,
      projectName: session.projectName,
      questionnaireId:
        snapshot?.questionnaireId ?? response.questionnaireId,
      questionnaireVersionId: response.questionnaireVersionId,
      status: completed ? "completed" : "started",
      responseCount: response.responseCount,
      startedAt: session.startedAt,
      completedAt: snapshot?.createdAt ??
        (legacySingleQuestionnaireCompletion
          ? session.completedAt
          : null),
    });
  }

  for (const snapshot of snapshots) {
    if (!snapshot.questionnaireVersionId) continue;

    const key = runKey(
      snapshot.sessionId,
      snapshot.questionnaireVersionId,
    );

    if (derivedByRunKey.has(key)) continue;

    const session = sessionById.get(snapshot.sessionId);
    if (!session) continue;

    derivedByRunKey.set(key, {
      respondentId: session.respondentId,
      projectId: session.projectId,
      projectName: session.projectName,
      questionnaireId: snapshot.questionnaireId,
      questionnaireVersionId: snapshot.questionnaireVersionId,
      status: "completed",
      responseCount: 0,
      startedAt: session.startedAt,
      completedAt: snapshot.createdAt ?? session.completedAt,
    });
  }

  return Array.from(derivedByRunKey.values()).sort((a, b) => {
    const completedDifference =
      dateValue(b.completedAt) - dateValue(a.completedAt);

    if (completedDifference !== 0) {
      return completedDifference;
    }

    return dateValue(b.startedAt) - dateValue(a.startedAt);
  });
}
