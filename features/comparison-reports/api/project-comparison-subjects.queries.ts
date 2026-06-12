import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import {
  questionnaires,
  questionnaireVersions,
} from "@/drizzle/schema";

import {
  assessmentProjectQuestionnaires,
  assessmentResponses,
  assessmentSessions,
  clientOrganizations,
  clientUnits,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";

import { controlDb } from "@/server/db/control-db";
import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

export type ProjectComparisonSubjectType =
  | "respondent"
  | "team"
  | "organization";

export type ProjectComparisonQuestionnaireOption = {
  questionnaireVersionId: string;
  label: string;
  orderIndex: number;
  resultRespondentCount: number;
  resultSessionCount: number;
};

export type ProjectComparisonSubjectOption = {
  key: string;
  subjectType: ProjectComparisonSubjectType;
  subjectId: string;

  questionnaireVersionId: string;
  questionnaireLabel: string;

  label: string;
  description: string | null;

  /**
   * Liczba unikalnych respondentów, którzy mają ostatnią ukończoną sesję
   * z odpowiedziami dla danej wersji kwestionariusza.
   */
  respondentCount: number;

  /**
   * Liczba wyników po deduplikacji respondent + questionnaireVersion.
   * Dla respondentów = 1, dla team/org = liczba respondentów.
   */
  resultCount: number | null;

  assessmentSessionId?: string | null;
};

type ProjectQuestionnaireRow = {
  questionnaireVersionId: string;
  snapshot: string | null;
  orderIndex: number;
};

type CompletedQuestionnaireSessionRow = {
  assessmentSessionId: string;
  respondentId: string;
  completedAt: Date | null;

  questionnaireVersionId: string;

  externalCode: string | null;

  firstName: string | null;
  lastName: string | null;
  email: string | null;

  clientOrganizationId: string | null;
  organizationName: string | null;

  clientUnitId: string | null;
  unitName: string | null;

  responseCount: number;
};

function buildSubjectKey(input: {
  subjectType: ProjectComparisonSubjectType;
  subjectId: string;
  questionnaireVersionId: string;
  assessmentSessionId?: string | null;
}) {
  return [
    input.subjectType,
    input.subjectId,
    input.questionnaireVersionId,
    input.assessmentSessionId ?? "aggregate",
  ].join(":");
}

function formatDate(value: Date | string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildVersionSuffix(version: string | null) {
  const versionValue = String(version ?? "").trim();

  if (!versionValue) return "";

  return versionValue.toLowerCase().startsWith("v")
    ? ` · ${versionValue}`
    : ` · v${versionValue}`;
}

function buildRespondentLabel(input: {
  externalCode: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  respondentId: string;
}) {
  const fullName = [input.firstName, input.lastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");

  if (fullName && input.email) {
    return `Respondent · ${fullName} · ${input.email}`;
  }

  if (fullName) {
    return `Respondent · ${fullName}`;
  }

  if (input.email) {
    return `Respondent · ${input.email}`;
  }

  if (input.externalCode) {
    return `Respondent · ${input.externalCode}`;
  }

  return `Respondent · ${input.respondentId.slice(0, 8)}`;
}

function buildRespondentDescription(input: {
  externalCode: string | null;
  email: string | null;
  completedAt: Date | string | null;
  responseCount: number;
}) {
  const parts: string[] = [];

  if (input.externalCode) {
    parts.push(`Kod: ${input.externalCode}`);
  }

  if (input.email) {
    parts.push(`Email: ${input.email}`);
  }

  if (input.completedAt) {
    parts.push(`Ukończono: ${formatDate(input.completedAt)}`);
  }

  parts.push(`Odpowiedzi: ${input.responseCount}`);

  return parts.join(" · ");
}

function resolveQuestionnaireLabelFromSnapshot(input: {
  questionnaireVersionId: string;
  snapshot: string | null;
}) {
  if (input.snapshot) {
    try {
      const parsed = JSON.parse(input.snapshot) as {
        name?: string;
        title?: string;
        code?: string;
        version?: string | number;
      };

      const name =
        parsed.name?.trim() ||
        parsed.title?.trim() ||
        parsed.code?.trim();

      if (name) {
        const versionSuffix = parsed.version
          ? buildVersionSuffix(String(parsed.version))
          : "";

        return `${name}${versionSuffix}`;
      }
    } catch {
      const trimmed = input.snapshot.trim();

      if (trimmed && trimmed.length < 120) {
        return trimmed;
      }
    }
  }

  return `Kwestionariusz ${input.questionnaireVersionId.slice(0, 8)}`;
}

async function resolveQuestionnaireVersionLabels(input: {
  versionIds: string[];
  snapshotByVersionId: Map<string, string | null>;
}) {
  const uniqueVersionIds = Array.from(new Set(input.versionIds)).filter(
    Boolean,
  );

  const fallback = new Map(
    uniqueVersionIds.map((versionId) => [
      versionId,
      resolveQuestionnaireLabelFromSnapshot({
        questionnaireVersionId: versionId,
        snapshot: input.snapshotByVersionId.get(versionId) ?? null,
      }),
    ]),
  );

  if (!uniqueVersionIds.length) {
    return fallback;
  }

  const rows = await controlDb
    .select({
      versionId: questionnaireVersions.id,
      version: questionnaireVersions.version,

      questionnaireName: questionnaires.name,
      questionnaireCode: questionnaires.code,
    })
    .from(questionnaireVersions)
    .innerJoin(
      questionnaires,
      eq(questionnaires.id, questionnaireVersions.questionnaireId),
    )
    .where(
      and(
        inArray(questionnaireVersions.id, uniqueVersionIds),
        isNull(questionnaireVersions.deletedAt),
        isNull(questionnaires.deletedAt),
      ),
    );

  const labels = new Map(fallback);

  for (const row of rows) {
    const baseName =
      row.questionnaireName?.trim() ||
      row.questionnaireCode?.trim() ||
      `Kwestionariusz ${row.versionId.slice(0, 8)}`;

    labels.set(row.versionId, `${baseName}${buildVersionSuffix(row.version)}`);
  }

  return labels;
}

/**
 * Źródłem prawdy dla wykonania konkretnego kwestionariusza są odpowiedzi.
 *
 * Jedna sesja może zawierać odpowiedzi dla kilku questionnaireVersionId,
 * więc grupujemy po:
 * - assessmentSessionId
 * - questionnaireVersionId
 *
 * Potem bierzemy ostatnią completed sesję respondenta dla danej wersji.
 */
async function resolveCompletedQuestionnaireSessionRows({
  db,
  assessmentProjectId,
  questionnaireVersionIds,
}: {
  db: Awaited<ReturnType<typeof getTenantDb>>;
  assessmentProjectId: string;
  questionnaireVersionIds: string[];
}) {
  if (!questionnaireVersionIds.length) {
    return [];
  }

  const rows = await db
    .select({
      assessmentSessionId: assessmentSessions.id,
      respondentId: assessmentSessions.respondentId,
      completedAt: assessmentSessions.completedAt,

      questionnaireVersionId: assessmentResponses.questionnaireVersionId,
      questionnaireItemId: assessmentResponses.questionnaireItemId,

      externalCode: respondents.externalCode,

      firstName: respondentIdentities.firstName,
      lastName: respondentIdentities.lastName,
      email: respondentIdentities.email,

      clientOrganizationId: respondents.clientOrganizationId,
      organizationName: clientOrganizations.name,

      clientUnitId: respondents.clientUnitId,
      unitName: clientUnits.name,
    })
    .from(assessmentSessions)
    .innerJoin(
      assessmentResponses,
      eq(assessmentResponses.assessmentSessionId, assessmentSessions.id),
    )
    .innerJoin(
      respondents,
      eq(respondents.id, assessmentSessions.respondentId),
    )
    .leftJoin(
      respondentIdentities,
      eq(respondentIdentities.respondentId, respondents.id),
    )
    .leftJoin(
      clientOrganizations,
      eq(clientOrganizations.id, respondents.clientOrganizationId),
    )
    .leftJoin(clientUnits, eq(clientUnits.id, respondents.clientUnitId))
    .where(
      and(
        eq(assessmentSessions.assessmentProjectId, assessmentProjectId),
        eq(assessmentSessions.status, "completed"),
        inArray(
          assessmentResponses.questionnaireVersionId,
          questionnaireVersionIds,
        ),
        isNull(assessmentSessions.deletedAt),
        isNull(assessmentResponses.deletedAt),
        isNull(respondents.deletedAt),
        isNull(respondentIdentities.deletedAt),
        isNull(clientOrganizations.deletedAt),
        isNull(clientUnits.deletedAt),
      ),
    )
    .orderBy(desc(assessmentSessions.completedAt));

  const grouped = new Map<
    string,
    {
      assessmentSessionId: string;
      respondentId: string;
      completedAt: Date | null;

      questionnaireVersionId: string;

      externalCode: string | null;

      firstName: string | null;
      lastName: string | null;
      email: string | null;

      clientOrganizationId: string | null;
      organizationName: string | null;

      clientUnitId: string | null;
      unitName: string | null;

      questionnaireItemIds: Set<string>;
    }
  >();

  for (const row of rows) {
    const key = `${row.assessmentSessionId}:${row.questionnaireVersionId}`;

    const existing =
      grouped.get(key) ??
      {
        assessmentSessionId: row.assessmentSessionId,
        respondentId: row.respondentId,
        completedAt: row.completedAt,

        questionnaireVersionId: row.questionnaireVersionId,

        externalCode: row.externalCode,

        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,

        clientOrganizationId: row.clientOrganizationId,
        organizationName: row.organizationName,

        clientUnitId: row.clientUnitId,
        unitName: row.unitName,

        questionnaireItemIds: new Set<string>(),
      };

    existing.questionnaireItemIds.add(row.questionnaireItemId);

    grouped.set(key, existing);
  }

  const out: CompletedQuestionnaireSessionRow[] = [];

  for (const item of grouped.values()) {
    out.push({
      assessmentSessionId: item.assessmentSessionId,
      respondentId: item.respondentId,
      completedAt: item.completedAt,

      questionnaireVersionId: item.questionnaireVersionId,

      externalCode: item.externalCode,

      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,

      clientOrganizationId: item.clientOrganizationId,
      organizationName: item.organizationName,

      clientUnitId: item.clientUnitId,
      unitName: item.unitName,

      responseCount: item.questionnaireItemIds.size,
    });
  }

  return out;
}

function dedupeLatestSessionPerRespondentAndQuestionnaire<
  T extends {
    respondentId: string;
    questionnaireVersionId: string;
    completedAt: Date | string | null;
  },
>(rows: T[]) {
  const map = new Map<string, T>();

  for (const row of rows) {
    const key = `${row.respondentId}:${row.questionnaireVersionId}`;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, row);
      continue;
    }

    const existingTime = existing.completedAt
      ? new Date(existing.completedAt).getTime()
      : 0;

    const rowTime = row.completedAt ? new Date(row.completedAt).getTime() : 0;

    if (rowTime > existingTime) {
      map.set(key, row);
    }
  }

  return Array.from(map.values());
}

function buildRespondentSubjects({
  rows,
  questionnaireLabelByVersionId,
}: {
  rows: CompletedQuestionnaireSessionRow[];
  questionnaireLabelByVersionId: Map<string, string>;
}) {
  return rows.map<ProjectComparisonSubjectOption>((row) => ({
    key: buildSubjectKey({
      subjectType: "respondent",
      subjectId: row.respondentId,
      questionnaireVersionId: row.questionnaireVersionId,
      assessmentSessionId: row.assessmentSessionId,
    }),
    subjectType: "respondent",
    subjectId: row.respondentId,
    assessmentSessionId: row.assessmentSessionId,
    questionnaireVersionId: row.questionnaireVersionId,
    questionnaireLabel:
      questionnaireLabelByVersionId.get(row.questionnaireVersionId) ??
      `Kwestionariusz ${row.questionnaireVersionId.slice(0, 8)}`,
    label: buildRespondentLabel({
      externalCode: row.externalCode,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      respondentId: row.respondentId,
    }),
    description: buildRespondentDescription({
      externalCode: row.externalCode,
      email: row.email,
      completedAt: row.completedAt,
      responseCount: row.responseCount,
    }),
    respondentCount: 1,
    resultCount: 1,
  }));
}

function buildAggregateSubjects({
  rows,
  questionnaireLabelByVersionId,
}: {
  rows: CompletedQuestionnaireSessionRow[];
  questionnaireLabelByVersionId: Map<string, string>;
}) {
  const organizationMap = new Map<string, ProjectComparisonSubjectOption>();
  const teamMap = new Map<string, ProjectComparisonSubjectOption>();

  for (const row of rows) {
    if (row.clientOrganizationId) {
      const key = buildSubjectKey({
        subjectType: "organization",
        subjectId: row.clientOrganizationId,
        questionnaireVersionId: row.questionnaireVersionId,
      });

      const existing = organizationMap.get(key);

      if (existing) {
        existing.respondentCount += 1;
        existing.resultCount = (existing.resultCount ?? 0) + 1;
      } else {
        organizationMap.set(key, {
          key,
          subjectType: "organization",
          subjectId: row.clientOrganizationId,
          questionnaireVersionId: row.questionnaireVersionId,
          questionnaireLabel:
            questionnaireLabelByVersionId.get(row.questionnaireVersionId) ??
            `Kwestionariusz ${row.questionnaireVersionId.slice(0, 8)}`,
          label: `Organizacja · ${row.organizationName ?? "Bez nazwy"}`,
          description: null,
          respondentCount: 1,
          resultCount: 1,
        });
      }
    }

    if (row.clientUnitId) {
      const key = buildSubjectKey({
        subjectType: "team",
        subjectId: row.clientUnitId,
        questionnaireVersionId: row.questionnaireVersionId,
      });

      const existing = teamMap.get(key);

      if (existing) {
        existing.respondentCount += 1;
        existing.resultCount = (existing.resultCount ?? 0) + 1;
      } else {
        teamMap.set(key, {
          key,
          subjectType: "team",
          subjectId: row.clientUnitId,
          questionnaireVersionId: row.questionnaireVersionId,
          questionnaireLabel:
            questionnaireLabelByVersionId.get(row.questionnaireVersionId) ??
            `Kwestionariusz ${row.questionnaireVersionId.slice(0, 8)}`,
          label: `Zespół · ${row.unitName ?? "Bez nazwy"}`,
          description: null,
          respondentCount: 1,
          resultCount: 1,
        });
      }
    }
  }

  const organizationSubjects = Array.from(organizationMap.values()).map(
    (subject) => ({
      ...subject,
      description: `Respondenci z ukończonym kwestionariuszem: ${subject.respondentCount}`,
    }),
  );

  const teamSubjects = Array.from(teamMap.values()).map((subject) => ({
    ...subject,
    description: `Respondenci z ukończonym kwestionariuszem: ${subject.respondentCount}`,
  }));

  return {
    organizationSubjects,
    teamSubjects,
  };
}

function buildQuestionnaireOptions({
  projectQuestionnaires,
  questionnaireLabelByVersionId,
  latestRows,
  allCompletedRows,
}: {
  projectQuestionnaires: ProjectQuestionnaireRow[];
  questionnaireLabelByVersionId: Map<string, string>;
  latestRows: CompletedQuestionnaireSessionRow[];
  allCompletedRows: CompletedQuestionnaireSessionRow[];
}) {
  const respondentIdsByVersionId = new Map<string, Set<string>>();
  const sessionIdsByVersionId = new Map<string, Set<string>>();

  for (const row of latestRows) {
    const respondentSet =
      respondentIdsByVersionId.get(row.questionnaireVersionId) ??
      new Set<string>();

    respondentSet.add(row.respondentId);
    respondentIdsByVersionId.set(row.questionnaireVersionId, respondentSet);
  }

  for (const row of allCompletedRows) {
    const sessionSet =
      sessionIdsByVersionId.get(row.questionnaireVersionId) ??
      new Set<string>();

    sessionSet.add(row.assessmentSessionId);
    sessionIdsByVersionId.set(row.questionnaireVersionId, sessionSet);
  }

  return projectQuestionnaires.map<ProjectComparisonQuestionnaireOption>(
    (projectQuestionnaire) => {
      const questionnaireVersionId =
        projectQuestionnaire.questionnaireVersionId;

      return {
        questionnaireVersionId,
        label:
          questionnaireLabelByVersionId.get(questionnaireVersionId) ??
          `Kwestionariusz ${questionnaireVersionId.slice(0, 8)}`,
        orderIndex: projectQuestionnaire.orderIndex,
        resultRespondentCount:
          respondentIdsByVersionId.get(questionnaireVersionId)?.size ?? 0,
        resultSessionCount:
          sessionIdsByVersionId.get(questionnaireVersionId)?.size ?? 0,
      };
    },
  );
}

export async function listProjectComparisonSubjects({
  tenantSlug,
  assessmentProjectId,
}: {
  tenantSlug: string;
  assessmentProjectId: string;
}) {
  const ctx = await requireTenantContext({tenantSlug});
  const db = await getTenantDb(ctx);

  const projectQuestionnaires = await db
    .select({
      questionnaireVersionId:
        assessmentProjectQuestionnaires.questionnaireVersionId,
      snapshot: assessmentProjectQuestionnaires.snapshot,
      orderIndex: assessmentProjectQuestionnaires.orderIndex,
    })
    .from(assessmentProjectQuestionnaires)
    .where(
      and(
        eq(
          assessmentProjectQuestionnaires.assessmentProjectId,
          assessmentProjectId,
        ),
        eq(assessmentProjectQuestionnaires.status, "active"),
        isNull(assessmentProjectQuestionnaires.deletedAt),
      ),
    )
    .orderBy(asc(assessmentProjectQuestionnaires.orderIndex));

  if (!projectQuestionnaires.length) {
    return {
      questionnaires: [],
      subjects: [],
    };
  }

  const snapshotByVersionId = new Map(
    projectQuestionnaires.map((row) => [
      row.questionnaireVersionId,
      row.snapshot ?? null,
    ]),
  );

  const questionnaireVersionIds = projectQuestionnaires.map(
    (row) => row.questionnaireVersionId,
  );

  const questionnaireLabelByVersionId =
    await resolveQuestionnaireVersionLabels({
      versionIds: questionnaireVersionIds,
      snapshotByVersionId,
    });

  const completedRows = await resolveCompletedQuestionnaireSessionRows({
    db,
    assessmentProjectId,
    questionnaireVersionIds,
  });

  const latestRows =
    dedupeLatestSessionPerRespondentAndQuestionnaire(completedRows);

  const respondentSubjects = buildRespondentSubjects({
    rows: latestRows,
    questionnaireLabelByVersionId,
  });

  const { organizationSubjects, teamSubjects } = buildAggregateSubjects({
    rows: latestRows,
    questionnaireLabelByVersionId,
  });

  const questionnaires = buildQuestionnaireOptions({
    projectQuestionnaires,
    questionnaireLabelByVersionId,
    latestRows,
    allCompletedRows: completedRows,
  });

  return {
    questionnaires,
    subjects: [
      ...organizationSubjects,
      ...teamSubjects,
      ...respondentSubjects,
    ],
  };
}