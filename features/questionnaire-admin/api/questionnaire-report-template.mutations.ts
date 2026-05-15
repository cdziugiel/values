import { and, eq, isNull } from "drizzle-orm";

import {
  questionnaireReportTemplateBindings,
  reportTemplateVersions,
} from "@/drizzle/schema";

import { controlDb } from "@/server/db/control-db";
import { assertQuestionnaireVersionIsDraft } from "./questionnaire-version-guards";

export async function assignReportTemplateToQuestionnaireVersionAsSuperAdmin({
  actorUserId,
  questionnaireVersionId,
  reportTemplateVersionId,
}: {
  actorUserId: string;
  questionnaireVersionId: string;
  reportTemplateVersionId: string;
}) {
  await assertQuestionnaireVersionIsDraft(questionnaireVersionId);

  const reportTemplateVersion =
    await controlDb.query.reportTemplateVersions.findFirst({
      where: and(
        eq(reportTemplateVersions.id, reportTemplateVersionId),
        isNull(reportTemplateVersions.deletedAt),
      ),
    });

  if (!reportTemplateVersion) {
    throw new Error("Nie znaleziono wersji template’u raportu.");
  }

  const now = new Date();

  const result = await controlDb.transaction(async (tx) => {
    await tx
      .update(questionnaireReportTemplateBindings)
      .set({
        status: "inactive",
        isDefault: false,
        deletedAt: now,
        updatedAt: now,
        updatedBy: actorUserId,
      })
      .where(
        and(
          eq(
            questionnaireReportTemplateBindings.questionnaireVersionId,
            questionnaireVersionId,
          ),
          isNull(questionnaireReportTemplateBindings.deletedAt),
        ),
      );

    const [created] = await tx
      .insert(questionnaireReportTemplateBindings)
      .values({
        questionnaireVersionId,
        reportTemplateVersionId,
        isDefault: true,
        status: "active",
        createdBy: actorUserId,
        updatedBy: actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  });

  return result;
}

export async function removeReportTemplateFromQuestionnaireVersionAsSuperAdmin({
  actorUserId,
  questionnaireVersionId,
}: {
  actorUserId: string;
  questionnaireVersionId: string;
}) {
  await assertQuestionnaireVersionIsDraft(questionnaireVersionId);

  const now = new Date();

  const [removed] = await controlDb
    .update(questionnaireReportTemplateBindings)
    .set({
      status: "inactive",
      isDefault: false,
      deletedAt: now,
      updatedAt: now,
      updatedBy: actorUserId,
    })
    .where(
      and(
        eq(
          questionnaireReportTemplateBindings.questionnaireVersionId,
          questionnaireVersionId,
        ),
        eq(questionnaireReportTemplateBindings.isDefault, true),
        isNull(questionnaireReportTemplateBindings.deletedAt),
      ),
    )
    .returning();

  return removed ?? null;
}