// features/report-builder/api/report-template-admin.mutations.ts

import { and, eq, isNull } from "drizzle-orm";

import {
  questionnaireReportTemplateBindings,
  questionnaireVersions,
  questionnaires,
  reportTemplates,
  reportTemplateVersions,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";
import {
  buildDefaultReportTemplateConfig,
  buildDefaultReportTemplateDataBindings,
  isQuestionnaireBoundReportKind,
} from "../lib/report-template-kind-defaults";

import { requireSuperAdmin } from "@/server/auth/require-super-admin";

import { updatePersonalCompositeSourcesSchema } from "../forms/report-template-admin.schema";
import { buildPersonalCompositeDataBindings } from "../lib/personal-composite-bindings";
import {
  archiveReportTemplateSchema,
  archiveReportTemplateVersionSchema,
  createReportTemplateSchema,
  createReportTemplateVersionSchema,
  publishReportTemplateVersionSchema,
  updateReportTemplateSchema,
  updateReportTemplateVersionSchema,
  type ArchiveReportTemplateInput,
  type ArchiveReportTemplateVersionInput,
  type CreateReportTemplateInput,
  type CreateReportTemplateVersionInput,
  type PublishReportTemplateVersionInput,
  type UpdateReportTemplateInput,
  type UpdateReportTemplateVersionInput,
} from "../forms/report-template-admin.schema";

function nullIfEmpty(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function parseJsonObject(value: string, fieldLabel: string) {
  const normalized = value.trim();

  if (!normalized) {
    return {};
  }

  try {
    const parsed = JSON.parse(normalized);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error(`${fieldLabel} musi być obiektem JSON.`);
    }

    return parsed;
  } catch {
    throw new Error(`${fieldLabel} zawiera nieprawidłowy JSON.`);
  }
}

function assertQuestionnaireRequiredForTemplateKind({
  kind,
  questionnaireId,
}: {
  kind: string;
  questionnaireId?: string | null;
}) {
  if (isQuestionnaireBoundReportKind(kind) && !questionnaireId) {
    throw new Error("Raport personalny musi być powiązany z kwestionariuszem.");
  }
}

async function assertQuestionnaireExists(questionnaireId: string) {
  const questionnaire = await controlDb.query.questionnaires.findFirst({
    where: and(
      eq(questionnaires.id, questionnaireId),
      isNull(questionnaires.deletedAt),
    ),
  });

  if (!questionnaire) {
    throw new Error("Nie znaleziono kwestionariusza.");
  }

  return questionnaire;
}

export async function updatePersonalCompositeSourcesAsSuperAdmin(
  input: unknown,
) {
  const actor = await requireSuperAdmin();

  const parsed = updatePersonalCompositeSourcesSchema.parse(input);

  const [version] = await controlDb
    .select({
      id: reportTemplateVersions.id,
      reportTemplateId: reportTemplateVersions.reportTemplateId,
      dataBindings: reportTemplateVersions.dataBindings,
      templateKind: reportTemplates.kind,
    })
    .from(reportTemplateVersions)
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportTemplateVersions.reportTemplateId),
    )
    .where(
      and(
        eq(reportTemplateVersions.id, parsed.reportTemplateVersionId),
        isNull(reportTemplateVersions.deletedAt),
        isNull(reportTemplates.deletedAt),
      ),
    )
    .limit(1);

  if (!version) {
    throw new Error("Nie znaleziono wersji template’u raportu.");
  }

  if (version.templateKind !== "personal_composite") {
    throw new Error(
      "Źródła kwestionariuszy można konfigurować tylko dla raportu personal_composite.",
    );
  }

  const questionnaireIds = parsed.sources.map((source) => source.questionnaireId);

  const existingQuestionnaires = await controlDb
    .select({
      id: questionnaires.id,
      code: questionnaires.code,
      name: questionnaires.name,
    })
    .from(questionnaires)
    .where(isNull(questionnaires.deletedAt));

  const questionnaireById = new Map(
    existingQuestionnaires.map((questionnaire) => [
      questionnaire.id,
      questionnaire,
    ]),
  );

  for (const source of parsed.sources) {
    const questionnaire = questionnaireById.get(source.questionnaireId);

    if (!questionnaire) {
      throw new Error("Wybrany kwestionariusz nie istnieje.");
    }

    if (questionnaire.code !== source.questionnaireCode) {
      throw new Error(
        "Kod kwestionariusza nie zgadza się z aktualną definicją kwestionariusza.",
      );
    }
  }

  const dataBindings = buildPersonalCompositeDataBindings({
    currentDataBindings: version.dataBindings,
    sources: parsed.sources,
  });

  const [updated] = await controlDb
    .update(reportTemplateVersions)
    .set({
      dataBindings,
      updatedBy: actor.id,
      updatedAt: new Date(),
    })
    .where(eq(reportTemplateVersions.id, parsed.reportTemplateVersionId))
    .returning();

  return updated;
}
async function assertReportTemplateExists(reportTemplateId: string) {
  const template = await controlDb.query.reportTemplates.findFirst({
    where: and(
      eq(reportTemplates.id, reportTemplateId),
      isNull(reportTemplates.deletedAt),
    ),
  });

  if (!template) {
    throw new Error("Nie znaleziono template’u raportu.");
  }

  return template;
}

async function assertReportTemplateVersionExists(reportTemplateVersionId: string) {
  const version = await controlDb.query.reportTemplateVersions.findFirst({
    where: and(
      eq(reportTemplateVersions.id, reportTemplateVersionId),
      isNull(reportTemplateVersions.deletedAt),
    ),
  });

  if (!version) {
    throw new Error("Nie znaleziono wersji template’u raportu.");
  }

  return version;
}

async function assertQuestionnaireVersionForReportTemplate({
  reportTemplateId,
  questionnaireVersionId,
}: {
  reportTemplateId: string;
  questionnaireVersionId?: string | null;
}) {
  const template = await assertReportTemplateExists(reportTemplateId);

  if (isQuestionnaireBoundReportKind(template.kind) && !template.questionnaireId) {
    throw new Error("Raport personalny musi być powiązany z kwestionariuszem.");
  }

  if (isQuestionnaireBoundReportKind(template.kind) && !questionnaireVersionId) {
    throw new Error(
      "Wersja raportu personalnego musi być powiązana z wersją kwestionariusza.",
    );
  }

  if (!questionnaireVersionId) {
    return {
      template,
      questionnaireVersion: null,
    };
  }

  const version = await controlDb.query.questionnaireVersions.findFirst({
    where: and(
      eq(questionnaireVersions.id, questionnaireVersionId),
      isNull(questionnaireVersions.deletedAt),
    ),
  });

  if (!version) {
    throw new Error("Nie znaleziono wersji kwestionariusza.");
  }

  if (
    template.questionnaireId &&
    version.questionnaireId !== template.questionnaireId
  ) {
    throw new Error(
      "Wersja kwestionariusza nie należy do kwestionariusza powiązanego z tym template’em raportu.",
    );
  }

  return {
    template,
    questionnaireVersion: version,
  };
}

export async function createReportTemplateAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: CreateReportTemplateInput;
}) {
  const parsed = createReportTemplateSchema.parse(input);

assertQuestionnaireRequiredForTemplateKind({
  kind: parsed.kind,
  questionnaireId: parsed.questionnaireId,
});

if (parsed.questionnaireId) {
  await assertQuestionnaireExists(parsed.questionnaireId);
}

const [template] = await controlDb
  .insert(reportTemplates)
  .values({
    questionnaireId: parsed.questionnaireId ?? null,
    kind: parsed.kind,
    code: parsed.code,
    name: parsed.name,
    description: nullIfEmpty(parsed.description),
    status: "draft",
    createdBy: actorUserId,
    updatedBy: actorUserId,
  })
  .returning();

  return template;
}

export async function updateReportTemplateAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: UpdateReportTemplateInput;
}) {
  const parsed = updateReportTemplateSchema.parse(input);

await assertReportTemplateExists(parsed.reportTemplateId);

assertQuestionnaireRequiredForTemplateKind({
  kind: parsed.kind,
  questionnaireId: parsed.questionnaireId,
});

if (parsed.questionnaireId) {
  await assertQuestionnaireExists(parsed.questionnaireId);
}

const [template] = await controlDb
  .update(reportTemplates)
  .set({
    questionnaireId: parsed.questionnaireId ?? null,
    kind: parsed.kind,
    code: parsed.code,
    name: parsed.name,
    description: nullIfEmpty(parsed.description),
    status: parsed.status,
    updatedBy: actorUserId,
    updatedAt: new Date(),
  })
  .where(eq(reportTemplates.id, parsed.reportTemplateId))
  .returning();

  return template;
}

export async function archiveReportTemplateAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: ArchiveReportTemplateInput;
}) {
  const parsed = archiveReportTemplateSchema.parse(input);

  await assertReportTemplateExists(parsed.reportTemplateId);

  const now = new Date();

  await controlDb.transaction(async (tx) => {
    const versions = await tx
      .select({
        id: reportTemplateVersions.id,
      })
      .from(reportTemplateVersions)
      .where(
        and(
          eq(reportTemplateVersions.reportTemplateId, parsed.reportTemplateId),
          isNull(reportTemplateVersions.deletedAt),
        ),
      );

    for (const version of versions) {
      await tx
        .update(questionnaireReportTemplateBindings)
        .set({
          status: "inactive",
          deletedAt: now,
          updatedBy: actorUserId,
          updatedAt: now,
        })
        .where(
          and(
            eq(
              questionnaireReportTemplateBindings.reportTemplateVersionId,
              version.id,
            ),
            isNull(questionnaireReportTemplateBindings.deletedAt),
          ),
        );
    }

    await tx
      .update(reportTemplateVersions)
      .set({
        status: "archived",
        deletedAt: now,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(reportTemplateVersions.reportTemplateId, parsed.reportTemplateId));

    await tx
      .update(reportTemplates)
      .set({
        status: "archived",
        deletedAt: now,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(reportTemplates.id, parsed.reportTemplateId));
  });

  return {
    id: parsed.reportTemplateId,
  };
}

export async function createReportTemplateVersionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: CreateReportTemplateVersionInput;
}) {
  const parsed = createReportTemplateVersionSchema.parse(input);

  const { template } = await assertQuestionnaireVersionForReportTemplate({
  reportTemplateId: parsed.reportTemplateId,
  questionnaireVersionId: parsed.questionnaireVersionId,
});

const defaultConfig = buildDefaultReportTemplateConfig(template.kind);
const defaultDataBindings = buildDefaultReportTemplateDataBindings(template.kind);

const [version] = await controlDb
  .insert(reportTemplateVersions)
  .values({
    reportTemplateId: parsed.reportTemplateId,
    questionnaireVersionId: parsed.questionnaireVersionId ?? null,
    version: parsed.version,
    name: parsed.name,
    description: nullIfEmpty(parsed.description),
    status: "draft",
    isDefault: false,
    globalCss: "",
    globalJs: "",
    pageSize: "A4",
    orientation: "portrait",
    config: defaultConfig,
    dataBindings: defaultDataBindings,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  })
  .returning();

  return version;
}

export async function updateReportTemplateVersionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: UpdateReportTemplateVersionInput;
}) {
  const parsed = updateReportTemplateVersionSchema.parse(input);

  const existing = await assertReportTemplateVersionExists(
    parsed.reportTemplateVersionId,
  );

  const config = parseJsonObject(parsed.configText, "Konfiguracja");
  const dataBindings = parseJsonObject(
    parsed.dataBindingsText,
    "Konfiguracja data bindings",
  );

  const now = new Date();

  const [version] = await controlDb.transaction(async (tx) => {
    if (parsed.isDefault) {
      await tx
        .update(reportTemplateVersions)
        .set({
          isDefault: false,
          updatedBy: actorUserId,
          updatedAt: now,
        })
        .where(
          and(
            eq(reportTemplateVersions.reportTemplateId, existing.reportTemplateId),
            isNull(reportTemplateVersions.deletedAt),
          ),
        );
    }

    const [updated] = await tx
      .update(reportTemplateVersions)
      .set({
        version: parsed.version,
        name: parsed.name,
        description: nullIfEmpty(parsed.description),
        status: parsed.status,
        isDefault: parsed.isDefault,
        globalCss: parsed.globalCss,
        globalJs: parsed.globalJs,
        pageSize: parsed.pageSize,
        orientation: parsed.orientation,
        config,
        dataBindings,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(reportTemplateVersions.id, parsed.reportTemplateVersionId))
      .returning();

    return [updated];
  });

  return version;
}

export async function publishReportTemplateVersionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: PublishReportTemplateVersionInput;
}) {
  const parsed = publishReportTemplateVersionSchema.parse(input);

const existing = await assertReportTemplateVersionExists(
  parsed.reportTemplateVersionId,
);

await assertQuestionnaireVersionForReportTemplate({
  reportTemplateId: existing.reportTemplateId,
  questionnaireVersionId: existing.questionnaireVersionId,
});
  const now = new Date();

  const [version] = await controlDb.transaction(async (tx) => {
    await tx
      .update(reportTemplates)
      .set({
        status: "active",
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(reportTemplates.id, existing.reportTemplateId));

    const [updated] = await tx
      .update(reportTemplateVersions)
      .set({
        status: "active",
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(reportTemplateVersions.id, parsed.reportTemplateVersionId))
      .returning();

    return [updated];
  });

  return version;
}

export async function archiveReportTemplateVersionAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: ArchiveReportTemplateVersionInput;
}) {
  const parsed = archiveReportTemplateVersionSchema.parse(input);

  await assertReportTemplateVersionExists(parsed.reportTemplateVersionId);

  const now = new Date();

  const [version] = await controlDb.transaction(async (tx) => {
    await tx
      .update(questionnaireReportTemplateBindings)
      .set({
        status: "inactive",
        deletedAt: now,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(
        and(
          eq(
            questionnaireReportTemplateBindings.reportTemplateVersionId,
            parsed.reportTemplateVersionId,
          ),
          isNull(questionnaireReportTemplateBindings.deletedAt),
        ),
      );

    const [archived] = await tx
      .update(reportTemplateVersions)
      .set({
        status: "archived",
        deletedAt: now,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(reportTemplateVersions.id, parsed.reportTemplateVersionId))
      .returning();

    return [archived];
  });

  return version;
}