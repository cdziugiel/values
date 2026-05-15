// features/report-builder/api/report-builder.mutations.ts

import { and, asc, desc, eq, gt, isNull, lt } from "drizzle-orm";

import {
  reportTemplatePages,
  reportTemplateVersions,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

import {
  archiveReportTemplatePageSchema,
  createReportTemplatePageSchema,
  reorderReportTemplatePageSchema,
  updateReportTemplatePageSchema,
  updateReportTemplateVersionBuilderSettingsSchema,
  type ArchiveReportTemplatePageInput,
  type CreateReportTemplatePageInput,
  type ReorderReportTemplatePageInput,
  type UpdateReportTemplatePageInput,
  type UpdateReportTemplateVersionBuilderSettingsInput,
} from "../forms/report-template.schema";

function nullIfEmpty(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pad3(value: number) {
  return String(value).padStart(3, "0");
}

async function assertReportTemplateVersionIsDraft(reportTemplateVersionId: string) {
  const version = await controlDb.query.reportTemplateVersions.findFirst({
    where: and(
      eq(reportTemplateVersions.id, reportTemplateVersionId),
      isNull(reportTemplateVersions.deletedAt),
    ),
    columns: {
      id: true,
      status: true,
    },
  });

  if (!version) {
    throw new Error("Nie znaleziono wersji template’u raportu.");
  }

  if (version.status !== "draft") {
    throw new Error(
      "Edytować zawartość można tylko w roboczej wersji template’u raportu.",
    );
  }

  return version;
}

async function assertReportTemplatePageVersionIsDraft(pageId: string) {
  const page = await controlDb.query.reportTemplatePages.findFirst({
    where: and(
      eq(reportTemplatePages.id, pageId),
      isNull(reportTemplatePages.deletedAt),
    ),
    columns: {
      id: true,
      reportTemplateVersionId: true,
    },
  });

  if (!page) {
    throw new Error("Nie znaleziono strony raportu.");
  }

  await assertReportTemplateVersionIsDraft(page.reportTemplateVersionId);

  return page;
}

async function getNextReportPageOrderIndex(reportTemplateVersionId: string) {
  const lastPage = await controlDb.query.reportTemplatePages.findFirst({
    where: and(
      eq(reportTemplatePages.reportTemplateVersionId, reportTemplateVersionId),
      isNull(reportTemplatePages.deletedAt),
    ),
    orderBy: desc(reportTemplatePages.orderIndex),
    columns: {
      orderIndex: true,
    },
  });

  return (lastPage?.orderIndex ?? 0) + 1;
}

async function buildUniqueReportPageCode({
  reportTemplateVersionId,
  orderIndex,
}: {
  reportTemplateVersionId: string;
  orderIndex: number;
}) {
  let candidate = `PAGE_${pad3(orderIndex)}`;
  let suffix = 1;

  while (
    await controlDb.query.reportTemplatePages.findFirst({
      where: and(
        eq(reportTemplatePages.reportTemplateVersionId, reportTemplateVersionId),
        eq(reportTemplatePages.code, candidate),
        isNull(reportTemplatePages.deletedAt),
      ),
      columns: {
        id: true,
      },
    })
  ) {
    suffix += 1;
    candidate = `PAGE_${pad3(orderIndex)}_${suffix}`;
  }

  return candidate;
}

export async function updateReportTemplateVersionBuilderSettingsAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: UpdateReportTemplateVersionBuilderSettingsInput;
}) {
  const parsed = updateReportTemplateVersionBuilderSettingsSchema.parse(input);

  await assertReportTemplateVersionIsDraft(parsed.reportTemplateVersionId);

  const [updated] = await controlDb
    .update(reportTemplateVersions)
    .set({
      name: parsed.name.trim(),
      description: nullIfEmpty(parsed.description),
      globalCss: parsed.globalCss ?? "",
      globalJs: parsed.globalJs ?? "",
      orientation: parsed.orientation,
      config: asRecord(parsed.config),
      dataBindings: asRecord(parsed.dataBindings),
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(reportTemplateVersions.id, parsed.reportTemplateVersionId))
    .returning();

  return updated;
}

export async function createReportTemplatePageAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: CreateReportTemplatePageInput;
}) {
  const parsed = createReportTemplatePageSchema.parse(input);

  await assertReportTemplateVersionIsDraft(parsed.reportTemplateVersionId);

  const orderIndex = await getNextReportPageOrderIndex(
    parsed.reportTemplateVersionId,
  );

  const code = await buildUniqueReportPageCode({
    reportTemplateVersionId: parsed.reportTemplateVersionId,
    orderIndex,
  });

  const [created] = await controlDb
    .insert(reportTemplatePages)
    .values({
      reportTemplateVersionId: parsed.reportTemplateVersionId,
      code,
      title: parsed.title.trim(),
      description: nullIfEmpty(parsed.description),
      orderIndex,
      html: `
<div class="report-page-content">
  <h1>{{ project.name }}</h1>
  <p>Nowa strona raportu.</p>
</div>
`.trim(),
      css: "",
      js: "",
      visibilityCondition: null,
      componentBindings: [],
      config: {},
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning();

  return created;
}

export async function updateReportTemplatePageAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: UpdateReportTemplatePageInput;
}) {
  const parsed = updateReportTemplatePageSchema.parse(input);

  const page = await assertReportTemplatePageVersionIsDraft(
    parsed.reportTemplatePageId,
  );

  const code = normalizeCode(parsed.code);

  const existingByCode = await controlDb.query.reportTemplatePages.findFirst({
    where: and(
      eq(reportTemplatePages.reportTemplateVersionId, page.reportTemplateVersionId),
      eq(reportTemplatePages.code, code),
      isNull(reportTemplatePages.deletedAt),
    ),
  });

  if (existingByCode && existingByCode.id !== parsed.reportTemplatePageId) {
    throw new Error(`Strona raportu o kodzie "${code}" już istnieje.`);
  }

  const [updated] = await controlDb
    .update(reportTemplatePages)
    .set({
      code,
      title: parsed.title.trim(),
      description: nullIfEmpty(parsed.description),
      html: parsed.html,
      css: parsed.css,
      js: parsed.js,
      visibilityCondition: parsed.visibilityCondition ?? null,
      componentBindings: asArray(parsed.componentBindings),
      config: asRecord(parsed.config),
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(reportTemplatePages.id, parsed.reportTemplatePageId))
    .returning();

  return updated;
}

export async function reorderReportTemplatePageAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: ReorderReportTemplatePageInput;
}) {
  const parsed = reorderReportTemplatePageSchema.parse(input);

  const currentVersion = await assertReportTemplatePageVersionIsDraft(
    parsed.reportTemplatePageId,
  );

  const currentPage = await controlDb.query.reportTemplatePages.findFirst({
    where: and(
      eq(reportTemplatePages.id, parsed.reportTemplatePageId),
      isNull(reportTemplatePages.deletedAt),
    ),
  });

  if (!currentPage) {
    throw new Error("Nie znaleziono strony raportu.");
  }

  const sibling = await controlDb.query.reportTemplatePages.findFirst({
    where: and(
      eq(
        reportTemplatePages.reportTemplateVersionId,
        currentVersion.reportTemplateVersionId,
      ),
      isNull(reportTemplatePages.deletedAt),
      parsed.direction === "up"
        ? lt(reportTemplatePages.orderIndex, currentPage.orderIndex)
        : gt(reportTemplatePages.orderIndex, currentPage.orderIndex),
    ),
    orderBy:
      parsed.direction === "up"
        ? desc(reportTemplatePages.orderIndex)
        : asc(reportTemplatePages.orderIndex),
  });

  if (!sibling) {
    return currentPage;
  }

  const now = new Date();

  await controlDb.transaction(async (tx) => {
    await tx
      .update(reportTemplatePages)
      .set({
        orderIndex: -1,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(reportTemplatePages.id, currentPage.id));

    await tx
      .update(reportTemplatePages)
      .set({
        orderIndex: currentPage.orderIndex,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(reportTemplatePages.id, sibling.id));

    await tx
      .update(reportTemplatePages)
      .set({
        orderIndex: sibling.orderIndex,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(reportTemplatePages.id, currentPage.id));
  });

  return currentPage;
}

export async function archiveReportTemplatePageAsSuperAdmin({
  actorUserId,
  input,
}: {
  actorUserId: string;
  input: ArchiveReportTemplatePageInput;
}) {
  const parsed = archiveReportTemplatePageSchema.parse(input);

  await assertReportTemplatePageVersionIsDraft(parsed.reportTemplatePageId);

  const now = new Date();

  const [archived] = await controlDb
    .update(reportTemplatePages)
    .set({
      deletedAt: now,
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .where(eq(reportTemplatePages.id, parsed.reportTemplatePageId))
    .returning();

  return archived;
}