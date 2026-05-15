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

async function assertQuestionnaireVersionBelongsToTemplateQuestionnaire({
  reportTemplateId,
  questionnaireVersionId,
}: {
  reportTemplateId: string;
  questionnaireVersionId: string;
}) {
  const template = await assertReportTemplateExists(reportTemplateId);

  const version = await controlDb.query.questionnaireVersions.findFirst({
    where: and(
      eq(questionnaireVersions.id, questionnaireVersionId),
      isNull(questionnaireVersions.deletedAt),
    ),
  });

  if (!version) {
    throw new Error("Nie znaleziono wersji kwestionariusza.");
  }

  if (version.questionnaireId !== template.questionnaireId) {
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

  await assertQuestionnaireExists(parsed.questionnaireId);

  const [template] = await controlDb
    .insert(reportTemplates)
    .values({
      questionnaireId: parsed.questionnaireId,
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

  const [template] = await controlDb
    .update(reportTemplates)
    .set({
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

  await assertQuestionnaireVersionBelongsToTemplateQuestionnaire({
    reportTemplateId: parsed.reportTemplateId,
    questionnaireVersionId: parsed.questionnaireVersionId,
  });

  const [version] = await controlDb
    .insert(reportTemplateVersions)
    .values({
      reportTemplateId: parsed.reportTemplateId,
      questionnaireVersionId: parsed.questionnaireVersionId,
      version: parsed.version,
      name: parsed.name,
      description: nullIfEmpty(parsed.description),
      status: "draft",
      isDefault: false,
      globalCss: "",
      globalJs: "",
      pageSize: "A4",
      orientation: "portrait",
      config: {},
      dataBindings: {},
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