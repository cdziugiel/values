#!/usr/bin/env node

/**
 * HUMANET VALUES — multi-questionnaire invitation session lifecycle fix
 *
 * Problem fixed:
 * A logged-in respondent can have one assessment_session shared by several
 * project questionnaires. Completing one questionnaire must NOT complete the
 * whole package/session. Per-questionnaire completion is kept in
 * assessment_invitation_index; the aggregate session is completed only when
 * every active questionnaire in the package is completed.
 *
 * Usage from repository root:
 *   node humanet-values-multi-questionnaire-session-fix.mjs status
 *   node humanet-values-multi-questionnaire-session-fix.mjs install
 *   node humanet-values-multi-questionnaire-session-fix.mjs verify
 *   node humanet-values-multi-questionnaire-session-fix.mjs rollback
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import childProcess from "node:child_process";

const PATCH_ID = "humanet-values-multi-questionnaire-session-fix-v1";
const BACKUP_ROOT = path.join(".humanet-installer-backups", PATCH_ID);

const FILES = {
  complete: {
    path: "features/public-assessment/api/complete-assessment-session.actions.ts",
    sha: "2a1b69ef93cf662b2064fde90521c078683aa149",
  },
  invitationSync: {
    path: "features/my-assessment/api/assessment-invitation-index.mutations.ts",
    sha: "5f3ac71be885fdca7e336ce327db2a2cf0c8538a",
  },
  invitationStart: {
    path: "features/my-assessment/api/start-or-continue-indexed-invitation-session.ts",
    sha: "9d68f6329dd3cd5fdab39131a13c7b1e32ae3489",
  },
  myAssessmentQueries: {
    path: "features/my-assessment/api/my-assessment.queries.ts",
    sha: "20d3e760fa8cc9b6a3bbb69156d7ece24bd2fd49",
  },
};

const NEW_HELPER =
  "features/public-assessment/lib/assessment-package-completion.ts";
const NEW_TEST =
  "features/public-assessment/lib/assessment-package-completion.test.ts";

const HELPER_CONTENT = `type AssessmentPackageCompletionInput = {
  activeProjectQuestionnaireIds: readonly string[];
  completedProjectQuestionnaireIds: ReadonlySet<string>;
  currentProjectQuestionnaireId: string;
};

export function areAllProjectQuestionnairesCompleted({
  activeProjectQuestionnaireIds,
  completedProjectQuestionnaireIds,
  currentProjectQuestionnaireId,
}: AssessmentPackageCompletionInput) {
  if (activeProjectQuestionnaireIds.length === 0) {
    return false;
  }

  return activeProjectQuestionnaireIds.every(
    (projectQuestionnaireId) =>
      projectQuestionnaireId === currentProjectQuestionnaireId ||
      completedProjectQuestionnaireIds.has(projectQuestionnaireId),
  );
}
`;

const TEST_CONTENT = `import { describe, expect, it } from "vitest";

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
`;

function info(message = "") {
  console.log(message);
}

function fail(message, exitCode = 1) {
  console.error(`\nBŁĄD: ${message}\n`);
  process.exit(exitCode);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeAtomic(filePath, content) {
  ensureParent(filePath);
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, filePath);
}

function gitBlobSha(content) {
  const bytes = Buffer.from(content, "utf8");
  const header = Buffer.from(`blob ${bytes.length}\0`, "utf8");
  return crypto
    .createHash("sha1")
    .update(header)
    .update(bytes)
    .digest("hex");
}

function sha256(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function count(text, fragment) {
  if (!fragment) return 0;
  let result = 0;
  let offset = 0;

  while (true) {
    const index = text.indexOf(fragment, offset);
    if (index < 0) return result;
    result += 1;
    offset = index + fragment.length;
  }
}

function replaceExactlyOnce(text, from, to, label) {
  const occurrences = count(text, from);

  if (occurrences !== 1) {
    throw new Error(
      `${label}: oczekiwano dokładnie 1 dopasowania, znaleziono ${occurrences}.`,
    );
  }

  return text.replace(from, to);
}

function replaceBetween(text, start, end, replacement, label) {
  const startCount = count(text, start);
  const endCount = count(text, end);

  if (startCount !== 1 || endCount !== 1) {
    throw new Error(
      `${label}: niejednoznaczne kotwice (start=${startCount}, end=${endCount}).`,
    );
  }

  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end, startIndex + start.length);

  if (endIndex < 0 || endIndex <= startIndex) {
    throw new Error(`${label}: błędna kolejność kotwic.`);
  }

  return (
    text.slice(0, startIndex) +
    replacement +
    text.slice(endIndex)
  );
}

function assertRepoRoot() {
  if (!fs.existsSync("package.json")) {
    fail(
      "Nie znaleziono package.json. Uruchom instalator z katalogu głównego repozytorium VALUES.",
    );
  }

  for (const config of Object.values(FILES)) {
    if (!fs.existsSync(config.path)) {
      fail(`Nie znaleziono pliku: ${config.path}`);
    }
  }
}

function patchCompleteAction(original) {
  let next = original;

  const importAnchor =
    'import { dispatchAssessmentFunnelEvent } from "@/features/analytics/server/assessment-funnel.analytics";\n';

  const importReplacement =
    importAnchor +
    'import { areAllProjectQuestionnairesCompleted } from "../lib/assessment-package-completion";\n';

  next = replaceExactlyOnce(
    next,
    importAnchor,
    importReplacement,
    "import helpera package-completion",
  );

  const responseFilter = `          and(
            eq(assessmentResponses.assessmentSessionId, session.sessionId),
            isNull(assessmentResponses.deletedAt),
          ),
`;

  const responseFilterReplacement = `          and(
            eq(assessmentResponses.assessmentSessionId, session.sessionId),
            eq(
              assessmentResponses.questionnaireVersionId,
              currentProjectQuestionnaire.questionnaireVersionId,
            ),
            isNull(assessmentResponses.deletedAt),
          ),
`;

  next = replaceExactlyOnce(
    next,
    responseFilter,
    responseFilterReplacement,
    "scope odpowiedzi do bieżącego kwestionariusza",
  );

  const blockStart = '      step = "update-assessment-session";\n';
  const blockEnd = '      // @humanet-funnel-analytics-v1\n';

  const lifecycleBlock = `      // HUMANET_MULTI_QUESTIONNAIRE_SESSION_FIX_V1_BEGIN
      step = "load-active-project-questionnaires";
      const activeProjectQuestionnaires =
        await listActiveProjectQuestionnaires({
          db,
          assessmentProjectId: session.assessmentProjectId,
        });

      if (activeProjectQuestionnaires.length === 0) {
        return {
          status: "error",
          message: "Ten projekt nie ma aktywnych kwestionariuszy.",
        };
      }

      step = "load-completed-project-questionnaires";
      const completedProjectQuestionnaireIds =
        await listCompletedProjectQuestionnaireIdsFromIndex({
          tenantId: resolved.tenantId,
          projectRespondentId: session.projectRespondentId,
        });

      const allQuestionnairesCompleted =
        areAllProjectQuestionnairesCompleted({
          activeProjectQuestionnaireIds:
            activeProjectQuestionnaires.map(
              (row: any) => row.projectQuestionnaireId,
            ),
          completedProjectQuestionnaireIds,
          currentProjectQuestionnaireId:
            currentProjectQuestionnaire.projectQuestionnaireId,
        });

      step = "update-assessment-session-lifecycle";

      if (allQuestionnairesCompleted) {
        await db
          .update(assessmentSessions)
          .set({
            status: "completed",
            completedAt: now,
            updatedAt: now,
            updatedBy: actorUserId,
          })
          .where(eq(assessmentSessions.id, session.sessionId));
      } else {
        await db
          .update(assessmentSessions)
          .set({
            status: "in_progress",
            completedAt: null,
            updatedAt: now,
            updatedBy: actorUserId,
          })
          .where(eq(assessmentSessions.id, session.sessionId));
      }

      step = "update-project-respondent-lifecycle";

      if (allQuestionnairesCompleted) {
        await db
          .update(assessmentProjectRespondents)
          .set({
            status: "completed",
            completedAt: now,
            updatedAt: now,
            updatedBy: actorUserId,
          })
          .where(
            eq(
              assessmentProjectRespondents.id,
              session.projectRespondentId,
            ),
          );
      } else {
        await db
          .update(assessmentProjectRespondents)
          .set({
            status: "started",
            completedAt: null,
            updatedAt: now,
            updatedBy: actorUserId,
          })
          .where(
            eq(
              assessmentProjectRespondents.id,
              session.projectRespondentId,
            ),
          );
      }

      step = "calculate-scores";
      const scoringResult = await calculateAssessmentSessionScores({
        db,
        sessionId: session.sessionId,
      });

      step = "create-result-snapshot";
      const snapshot = await createAssessmentResultSnapshot({
        db,
        tenantSlug,
        sessionId: session.sessionId,
        actorUserId,
        projectQuestionnaireId:
          currentProjectQuestionnaire.projectQuestionnaireId,
        questionnaireVersionId:
          currentProjectQuestionnaire.questionnaireVersionId,
      });

      const reportAccessGrantResult = {
        granted: false,
        mode: "manual_partner_grant_required",
        message:
          "Dostęp do raportu nie jest nadawany automatycznie. Może go nadać partner po zakończeniu sesji.",
      };

      step = "insert-questionnaire-audit-log";
      await db.insert(tenantAuditLog).values({
        actorUserId,
        actorRole: "RESPONDENT",
        action: "assessment_questionnaire_completed",
        entityType: "assessment_session",
        entityId: session.sessionId,
        after: {
          completedAt: now.toISOString(),
          scoring: scoringResult,
          reportAccessGrant: reportAccessGrantResult,
          mode: "my-assessment",
          projectQuestionnaireId:
            currentProjectQuestionnaire.projectQuestionnaireId,
          questionnaireVersionId:
            currentProjectQuestionnaire.questionnaireVersionId,
          snapshotCreated: Boolean(snapshot),
          allQuestionnairesCompleted,
        },
      });

      if (allQuestionnairesCompleted) {
        step = "insert-session-audit-log";

        await db.insert(tenantAuditLog).values({
          actorUserId,
          actorRole: "RESPONDENT",
          action: "assessment_session_completed",
          entityType: "assessment_session",
          entityId: session.sessionId,
          after: {
            completedAt: now.toISOString(),
            mode: "my-assessment",
            reason: "all_project_questionnaires_completed",
            projectQuestionnaireIds:
              activeProjectQuestionnaires.map(
                (row: any) => row.projectQuestionnaireId,
              ),
          },
        });
      }
      // HUMANET_MULTI_QUESTIONNAIRE_SESSION_FIX_V1_END

`;

  next = replaceBetween(
    next,
    blockStart,
    blockEnd,
    lifecycleBlock,
    "lifecycle my-assessment",
  );

  return next;
}

function patchInvitationSync(original) {
  let next = original;

  const existingRowsAnchor = `  const completedSession = completedSessionRows[0] ?? null;

  const now = new Date();

  for (const row of rows) {
`;

  const existingRowsReplacement = `  const completedSession = completedSessionRows[0] ?? null;

  // HUMANET_MULTI_QUESTIONNAIRE_SESSION_FIX_V1_SYNC_BEGIN
  /**
   * assessmentInvitationIndex jest źródłem prawdy dla statusu pojedynczego
   * kwestionariusza. assessment_session opisuje cały pakiet i nie może
   * nadpisywać granularnego statusu już istniejącego wpisu.
   */
  const existingIndexRows = await controlDb
    .select({
      projectQuestionnaireId:
        assessmentInvitationIndex.tenantProjectQuestionnaireId,
      status: assessmentInvitationIndex.status,
      tenantSessionId: assessmentInvitationIndex.tenantSessionId,
      startedAt: assessmentInvitationIndex.startedAt,
      completedAt: assessmentInvitationIndex.completedAt,
    })
    .from(assessmentInvitationIndex)
    .where(
      and(
        eq(assessmentInvitationIndex.tenantId, ctx.tenantId),
        eq(
          assessmentInvitationIndex.tenantProjectRespondentId,
          projectRespondentId,
        ),
        isNull(assessmentInvitationIndex.deletedAt),
      ),
    );

  const existingIndexByProjectQuestionnaireId = new Map(
    existingIndexRows.map((indexRow) => [
      indexRow.projectQuestionnaireId,
      indexRow,
    ]),
  );
  // HUMANET_MULTI_QUESTIONNAIRE_SESSION_FIX_V1_SYNC_END

  const now = new Date();

  for (const row of rows) {
`;

  next = replaceExactlyOnce(
    next,
    existingRowsAnchor,
    existingRowsReplacement,
    "pobranie granularnych statusów invitation index",
  );

  const statusAnchor = `    let status = shouldBeDeleted ? "revoked" : "invited";
    let tenantSessionId: string | null = null;
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;

    if (!shouldBeDeleted && activeSession) {
      status = "in_progress";
      tenantSessionId = activeSession.id;
      startedAt = activeSession.startedAt ?? null;
      completedAt = null;
    } else if (!shouldBeDeleted && completedSession) {
      status = "completed";
      tenantSessionId = completedSession.id;
      startedAt = completedSession.startedAt ?? null;
      completedAt = completedSession.completedAt ?? null;
    } else if (!shouldBeDeleted && row.projectRespondentStatus === "completed") {
      status = "completed";
      tenantSessionId = null;
      startedAt = row.startedAt ?? null;
      completedAt = row.completedAt ?? null;
    } else if (!shouldBeDeleted) {
      status = "invited";
      tenantSessionId = null;
      startedAt = null;
      completedAt = null;
    }
`;

  const statusReplacement = `    let status = shouldBeDeleted ? "revoked" : "invited";
    let tenantSessionId: string | null = null;
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;

    const existingIndex =
      existingIndexByProjectQuestionnaireId.get(
        row.projectQuestionnaireId,
      ) ?? null;

    if (!shouldBeDeleted && existingIndex) {
      /**
       * Nie propagujemy statusu całej assessment_session na wszystkie
       * kwestionariusze. Konkretne przejścia invited -> in_progress ->
       * completed są wykonywane przez markAssessmentInvitationIndexSession().
       */
      status = existingIndex.status;
      tenantSessionId = existingIndex.tenantSessionId ?? null;
      startedAt = existingIndex.startedAt ?? null;
      completedAt = existingIndex.completedAt ?? null;
    } else if (!shouldBeDeleted && activeSession) {
      status = "in_progress";
      tenantSessionId = activeSession.id;
      startedAt = activeSession.startedAt ?? null;
      completedAt = null;
    } else if (!shouldBeDeleted && completedSession) {
      /**
       * Fallback wyłącznie dla historycznych/brakujących wpisów indeksu.
       * Istniejący granularny wpis nigdy nie trafia do tej gałęzi.
       */
      status = "completed";
      tenantSessionId = completedSession.id;
      startedAt = completedSession.startedAt ?? null;
      completedAt = completedSession.completedAt ?? null;
    } else if (!shouldBeDeleted && row.projectRespondentStatus === "completed") {
      status = "completed";
      tenantSessionId = null;
      startedAt = row.startedAt ?? null;
      completedAt = row.completedAt ?? null;
    } else if (!shouldBeDeleted) {
      status = "invited";
      tenantSessionId = null;
      startedAt = null;
      completedAt = null;
    }
`;

  next = replaceExactlyOnce(
    next,
    statusAnchor,
    statusReplacement,
    "ochrona per-questionnaire status przed propagacją statusu sesji",
  );

  return next;
}

function patchInvitationStart(original) {
  const oldBlock = `  if (invitation.status === "completed" && invitation.tenantSessionId) {
    return {
      ok: true as const,
      href:
        \`/my/assessment/sessions/\${encodeURIComponent(invitation.tenantSessionId)}\` +
        \`/completed?tenant=\${encodeURIComponent(invitation.tenantSlug)}\`,
    };
  }
`;

  const newBlock = `  if (invitation.status === "completed" && invitation.tenantSessionId) {
    // HUMANET_MULTI_QUESTIONNAIRE_SESSION_FIX_V1_RESULT_SCOPE
    const completedParams = new URLSearchParams({
      tenant: invitation.tenantSlug,
      projectQuestionnaireId:
        invitation.tenantProjectQuestionnaireId,
      questionnaireVersionId:
        invitation.questionnaireVersionId,
    });

    return {
      ok: true as const,
      href:
        \`/my/assessment/sessions/\${encodeURIComponent(invitation.tenantSessionId)}\` +
        \`/completed?\${completedParams.toString()}\`,
    };
  }
`;

  return replaceExactlyOnce(
    original,
    oldBlock,
    newBlock,
    "scoped completed href w invitation start",
  );
}

function patchMyAssessmentQueries(original) {
  const oldBlock = `    const actionHref =
      status === "completed" && row.tenantSessionId
        ? \`/my/assessment/sessions/\${encodeURIComponent(row.tenantSessionId)}\` +
          \`/completed?tenant=\${encodeURIComponent(row.tenantSlug)}\`
        : status === "in_progress" && row.tenantSessionId
`;

  const newBlock = `    const completedHrefParams = new URLSearchParams({
      tenant: row.tenantSlug,
      projectQuestionnaireId:
        row.tenantProjectQuestionnaireId,
      questionnaireVersionId:
        row.questionnaireVersionId,
    });

    // HUMANET_MULTI_QUESTIONNAIRE_SESSION_FIX_V1_RESULT_SCOPE
    const actionHref =
      status === "completed" && row.tenantSessionId
        ? \`/my/assessment/sessions/\${encodeURIComponent(row.tenantSessionId)}\` +
          \`/completed?\${completedHrefParams.toString()}\`
        : status === "in_progress" && row.tenantSessionId
`;

  return replaceExactlyOnce(
    original,
    oldBlock,
    newBlock,
    "scoped completed href na liście my-assessment",
  );
}

function buildPatchedFiles(originals) {
  return {
    [FILES.complete.path]: patchCompleteAction(originals[FILES.complete.path]),
    [FILES.invitationSync.path]: patchInvitationSync(
      originals[FILES.invitationSync.path],
    ),
    [FILES.invitationStart.path]: patchInvitationStart(
      originals[FILES.invitationStart.path],
    ),
    [FILES.myAssessmentQueries.path]: patchMyAssessmentQueries(
      originals[FILES.myAssessmentQueries.path],
    ),
    [NEW_HELPER]: HELPER_CONTENT,
    [NEW_TEST]: TEST_CONTENT,
  };
}

function verifyContentMap(files) {
  const problems = [];

  const complete = files[FILES.complete.path] ?? "";
  const sync = files[FILES.invitationSync.path] ?? "";
  const start = files[FILES.invitationStart.path] ?? "";
  const queries = files[FILES.myAssessmentQueries.path] ?? "";
  const helper = files[NEW_HELPER] ?? "";
  const test = files[NEW_TEST] ?? "";

  const completeRequirements = [
    'import { areAllProjectQuestionnairesCompleted } from "../lib/assessment-package-completion";',
    "HUMANET_MULTI_QUESTIONNAIRE_SESSION_FIX_V1_BEGIN",
    "HUMANET_MULTI_QUESTIONNAIRE_SESSION_FIX_V1_END",
    "assessmentResponses.questionnaireVersionId",
    'status: "in_progress"',
    "completedAt: null",
    'action: "assessment_questionnaire_completed"',
    'reason: "all_project_questionnaires_completed"',
    "areAllProjectQuestionnairesCompleted({",
  ];

  for (const fragment of completeRequirements) {
    if (!complete.includes(fragment)) {
      problems.push(`complete action: brakuje ${fragment}`);
    }
  }

  const forbiddenComplete = [
    "Na tym etapie kończymy całą assessment_session, bo w aktualnym modelu",
    "ProjectRespondent oznacz jako completed tylko dlatego, że obecny model",
  ];

  for (const fragment of forbiddenComplete) {
    if (complete.includes(fragment)) {
      problems.push(`complete action: pozostała stara błędna logika/komentarz`);
    }
  }

  if (
    count(
      complete,
      "HUMANET_MULTI_QUESTIONNAIRE_SESSION_FIX_V1_BEGIN",
    ) !== 1
  ) {
    problems.push("complete action: marker lifecycle nie występuje dokładnie raz");
  }

  const syncRequirements = [
    "HUMANET_MULTI_QUESTIONNAIRE_SESSION_FIX_V1_SYNC_BEGIN",
    "existingIndexByProjectQuestionnaireId",
    "if (!shouldBeDeleted && existingIndex)",
    "status = existingIndex.status",
    "tenantSessionId = existingIndex.tenantSessionId ?? null",
  ];

  for (const fragment of syncRequirements) {
    if (!sync.includes(fragment)) {
      problems.push(`invitation sync: brakuje ${fragment}`);
    }
  }

  const scopedRequirements = [
    ["invitation start", start],
    ["my-assessment queries", queries],
  ];

  for (const [label, content] of scopedRequirements) {
    for (const fragment of [
      "HUMANET_MULTI_QUESTIONNAIRE_SESSION_FIX_V1_RESULT_SCOPE",
      "projectQuestionnaireId",
      "questionnaireVersionId",
    ]) {
      if (!content.includes(fragment)) {
        problems.push(`${label}: brakuje ${fragment}`);
      }
    }
  }

  if (helper !== HELPER_CONTENT) {
    problems.push("helper package-completion różni się od wersji instalatora");
  }

  if (test !== TEST_CONTENT) {
    problems.push("test regresyjny różni się od wersji instalatora");
  }

  return {
    ok: problems.length === 0,
    problems,
  };
}

function isInstalled() {
  if (!fs.existsSync(NEW_HELPER) || !fs.existsSync(NEW_TEST)) {
    return false;
  }

  const files = {};

  for (const config of Object.values(FILES)) {
    if (!fs.existsSync(config.path)) return false;
    files[config.path] = read(config.path);
  }

  files[NEW_HELPER] = read(NEW_HELPER);
  files[NEW_TEST] = read(NEW_TEST);

  return verifyContentMap(files).ok;
}

function assertPreflight() {
  const originals = {};

  for (const config of Object.values(FILES)) {
    const content = read(config.path);
    const actual = gitBlobSha(content);

    if (actual !== config.sha) {
      throw new Error(
        [
          `Preflight zatrzymany: ${config.path}`,
          `  oczekiwany Git blob SHA: ${config.sha}`,
          `  lokalny Git blob SHA:    ${actual}`,
          "Kod różni się od wersji przeanalizowanej na GitHubie.",
        ].join("\n"),
      );
    }

    originals[config.path] = content;
  }

  if (fs.existsSync(NEW_HELPER) || fs.existsSync(NEW_TEST)) {
    throw new Error(
      `Pliki ${NEW_HELPER} lub ${NEW_TEST} już istnieją, ale poprawka nie jest kompletna. Nie nadpisuję nieznanych zmian.`,
    );
  }

  return originals;
}

function makeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function backupFiles(originals) {
  const backupDir = path.join(BACKUP_ROOT, makeTimestamp());
  fs.mkdirSync(backupDir, { recursive: true });

  const manifest = {
    patchId: PATCH_ID,
    installedAt: new Date().toISOString(),
    files: {},
  };

  for (const [filePath, content] of Object.entries(originals)) {
    const backupName =
      filePath.replaceAll("/", "__").replaceAll("\\", "__") + ".before";
    const backupPath = path.join(backupDir, backupName);
    fs.writeFileSync(backupPath, content, "utf8");

    manifest.files[filePath] = {
      existedBefore: true,
      backupPath,
      beforeGitBlobSha: gitBlobSha(content),
      beforeSha256: sha256(content),
      afterGitBlobSha: null,
      afterSha256: null,
    };
  }

  for (const filePath of [NEW_HELPER, NEW_TEST]) {
    manifest.files[filePath] = {
      existedBefore: false,
      backupPath: null,
      beforeGitBlobSha: null,
      beforeSha256: null,
      afterGitBlobSha: null,
      afterSha256: null,
    };
  }

  return { backupDir, manifest };
}

function saveManifest(backupDir, manifest) {
  const manifestPath = path.join(backupDir, "manifest.json");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(manifest, null, 2) + "\n",
    "utf8",
  );
  return manifestPath;
}

function rollbackInMemory(manifest) {
  for (const [filePath, meta] of Object.entries(manifest.files)) {
    if (meta.existedBefore) {
      const original = read(meta.backupPath);
      writeAtomic(filePath, original);
    } else if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

function tryRunRegressionTest() {
  const testPath = NEW_TEST;

  const candidates =
    process.platform === "win32"
      ? [
          ["pnpm.cmd", ["exec", "vitest", "run", testPath]],
          ["npm.cmd", ["exec", "--", "vitest", "run", testPath]],
        ]
      : [
          ["pnpm", ["exec", "vitest", "run", testPath]],
          ["npm", ["exec", "--", "vitest", "run", testPath]],
        ];

  for (const [command, args] of candidates) {
    const probe = childProcess.spawnSync(command, ["--version"], {
      stdio: "ignore",
      shell: false,
    });

    if (probe.error) {
      continue;
    }

    info("");
    info(`Uruchamiam test regresyjny: ${command} ${args.join(" ")}`);

    const result = childProcess.spawnSync(command, args, {
      stdio: "inherit",
      shell: false,
    });

    if (result.status !== 0) {
      throw new Error(
        `Test regresyjny zakończył się kodem ${result.status ?? "unknown"}.`,
      );
    }

    return true;
  }

  info("");
  info(
    "UWAGA: nie znaleziono pnpm/npm do automatycznego uruchomienia Vitest. Statyczna weryfikacja przeszła; uruchom test ręcznie.",
  );
  return false;
}

function install() {
  assertRepoRoot();

  if (isInstalled()) {
    info("OK: poprawka jest już zainstalowana.");
    verify();
    return;
  }

  let originals;
  try {
    originals = assertPreflight();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  let patched;
  try {
    patched = buildPatchedFiles(originals);
  } catch (error) {
    fail(
      `Nie udało się przygotować bezpiecznej poprawki: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const staticVerification = verifyContentMap(patched);

  if (!staticVerification.ok) {
    fail(
      `Wewnętrzna weryfikacja poprawki nie przeszła:\n- ${staticVerification.problems.join(
        "\n- ",
      )}`,
    );
  }

  const { backupDir, manifest } = backupFiles(originals);

  try {
    for (const [filePath, content] of Object.entries(patched)) {
      writeAtomic(filePath, content);
      manifest.files[filePath].afterGitBlobSha = gitBlobSha(content);
      manifest.files[filePath].afterSha256 = sha256(content);
    }

    const installedFiles = {};
    for (const filePath of Object.keys(patched)) {
      installedFiles[filePath] = read(filePath);
    }

    const verification = verifyContentMap(installedFiles);

    if (!verification.ok) {
      throw new Error(
        `Weryfikacja po zapisie nie przeszła: ${verification.problems.join(
          "; ",
        )}`,
      );
    }

    const manifestPath = saveManifest(backupDir, manifest);

    tryRunRegressionTest();

    info("");
    info("OK: poprawka multi-questionnaire session została zainstalowana.");
    info(`Backup: ${backupDir}`);
    info(`Manifest: ${manifestPath}`);
    info("");
    info("Najważniejsze zachowanie po poprawce:");
    info("  1. Jeden respondent + jeden projekt nadal może mieć jedną wspólną sesję.");
    info("  2. Ukończenie Q1 oznacza completed tylko dla Q1.");
    info("  3. Sesja pozostaje in_progress, dopóki Q2/Q3/Q4 nie są ukończone.");
    info("  4. Dopiero ostatni aktywny kwestionariusz zamyka session + projectRespondent.");
    info("  5. Wyniki są linkowane z projectQuestionnaireId + questionnaireVersionId.");
    info("  6. Sync nie nadpisuje granularnych statusów z aggregate session.");
  } catch (error) {
    try {
      rollbackInMemory(manifest);
      info("Automatyczny rollback po błędzie instalacji: OK");
    } catch (rollbackError) {
      console.error(
        `KRYTYCZNE: rollback po błędzie również się nie udał: ${
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError)
        }`,
      );
    }

    fail(
      `Instalacja nie powiodła się: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function verify() {
  assertRepoRoot();

  const files = {};

  for (const config of Object.values(FILES)) {
    files[config.path] = read(config.path);
  }

  if (!fs.existsSync(NEW_HELPER) || !fs.existsSync(NEW_TEST)) {
    fail("VERIFY FAILED: brakuje helpera lub testu regresyjnego.", 2);
  }

  files[NEW_HELPER] = read(NEW_HELPER);
  files[NEW_TEST] = read(NEW_TEST);

  const result = verifyContentMap(files);

  if (!result.ok) {
    fail(`VERIFY FAILED:\n- ${result.problems.join("\n- ")}`, 2);
  }

  info("VERIFY OK");
  info("Lifecycle pakietu kilku kwestionariuszy jest poprawiony statycznie.");
}

function listManifests() {
  if (!fs.existsSync(BACKUP_ROOT)) return [];

  return fs
    .readdirSync(BACKUP_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(BACKUP_ROOT, entry.name, "manifest.json"))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => {
      try {
        return {
          path: filePath,
          data: JSON.parse(read(filePath)),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) =>
      String(b.data.installedAt).localeCompare(String(a.data.installedAt)),
    );
}

function rollback() {
  assertRepoRoot();

  const latest = listManifests()[0];

  if (!latest) {
    fail(
      `Nie znaleziono manifestu w ${BACKUP_ROOT}. Nie wykonano żadnych zmian.`,
    );
  }

  const manifest = latest.data;

  if (manifest.patchId !== PATCH_ID) {
    fail("Najnowszy manifest nie należy do tego instalatora.");
  }

  for (const [filePath, meta] of Object.entries(manifest.files)) {
    if (!fs.existsSync(filePath)) {
      if (!meta.existedBefore) {
        continue;
      }
      fail(`Rollback zatrzymany: brakuje obecnego pliku ${filePath}.`);
    }

    const current = read(filePath);
    const currentSha = gitBlobSha(current);

    if (currentSha !== meta.afterGitBlobSha) {
      fail(
        [
          `Rollback zatrzymany: ${filePath} zmienił się po instalacji.`,
          `  obecny SHA:     ${currentSha}`,
          `  po instalacji:  ${meta.afterGitBlobSha}`,
          "Nie nadpisuję późniejszych zmian.",
        ].join("\n"),
      );
    }
  }

  for (const [filePath, meta] of Object.entries(manifest.files)) {
    if (meta.existedBefore) {
      if (!meta.backupPath || !fs.existsSync(meta.backupPath)) {
        fail(`Brakuje backupu dla ${filePath}.`);
      }

      const original = read(meta.backupPath);

      if (sha256(original) !== meta.beforeSha256) {
        fail(`Backup ${filePath} nie przeszedł SHA-256.`);
      }

      writeAtomic(filePath, original);
    } else if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  info("ROLLBACK OK");
  info(`Przywrócono stan sprzed poprawki z: ${latest.path}`);
}

function status() {
  assertRepoRoot();

  if (isInstalled()) {
    info("Status: ZAINSTALOWANY");
    return;
  }

  let allOriginal = true;

  for (const config of Object.values(FILES)) {
    const actual = gitBlobSha(read(config.path));
    const same = actual === config.sha;
    allOriginal = allOriginal && same;

    info(
      `${config.path}: ${same ? "wersja bazowa" : `inna wersja (${actual})`}`,
    );
  }

  if (fs.existsSync(NEW_HELPER) || fs.existsSync(NEW_TEST)) {
    allOriginal = false;
    info("Wykryto plik helpera/testu z niepełnym lub innym stanem poprawki.");
  }

  info(
    `Status: ${
      allOriginal
        ? "NIEZAINSTALOWANY — zgodna wersja bazowa"
        : "NIEZNANY / CZĘŚCIOWY — instalator niczego nie nadpisze"
    }`,
  );
}

function help() {
  console.log(`
HUMANET VALUES — multi-questionnaire invitation session fix

Użycie:
  node humanet-values-multi-questionnaire-session-fix.mjs status
  node humanet-values-multi-questionnaire-session-fix.mjs install
  node humanet-values-multi-questionnaire-session-fix.mjs verify
  node humanet-values-multi-questionnaire-session-fix.mjs rollback

Uruchamiaj z katalogu głównego repozytorium VALUES.
`.trim());
}

const command = process.argv[2] ?? "help";

switch (command) {
  case "install":
    install();
    break;
  case "verify":
    verify();
    break;
  case "rollback":
    rollback();
    break;
  case "status":
    status();
    break;
  case "help":
  case "--help":
  case "-h":
    help();
    break;
  default:
    fail(`Nieznana komenda: ${command}`);
}
