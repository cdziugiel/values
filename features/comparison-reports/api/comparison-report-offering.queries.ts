import { and, eq, isNull } from "drizzle-orm";

import {
  questionnaireVersions,
  reportAccessProducts,
  reportTemplates,
  reportTemplateVersions,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

export async function resolveComparisonReportOffering({
  productId,
  reportTemplateVersionId,
}: {
  productId: string;
  reportTemplateVersionId: string;
}) {
  const product = await controlDb.query.reportAccessProducts.findFirst({
    where: and(
      eq(reportAccessProducts.id, productId),
      eq(reportAccessProducts.status, "active"),
      isNull(reportAccessProducts.deletedAt),
    ),
  });

  if (!product) {
    throw new Error("Nie znaleziono aktywnego produktu raportowego.");
  }

  const reportTemplate = await controlDb.query.reportTemplates.findFirst({
    where: and(
      eq(reportTemplates.id, product.reportTemplateId),
      eq(reportTemplates.kind, "comparison"),
      eq(reportTemplates.status, "active"),
      isNull(reportTemplates.deletedAt),
    ),
  });

  if (!reportTemplate) {
    throw new Error(
      "Produkt nie jest powiązany z aktywnym raportem porównawczym.",
    );
  }

  if (!reportTemplate.questionnaireId) {
    throw new Error(
      "Szablon raportu porównawczego nie ma przypisanego kwestionariusza.",
    );
  }

  const reportVersion =
    await controlDb.query.reportTemplateVersions.findFirst({
      where: and(
        eq(reportTemplateVersions.id, reportTemplateVersionId),
        eq(reportTemplateVersions.reportTemplateId, reportTemplate.id),
        eq(reportTemplateVersions.status, "active"),
        isNull(reportTemplateVersions.deletedAt),
      ),
    });

  if (!reportVersion) {
    throw new Error("Nie znaleziono aktywnej wersji raportu porównawczego.");
  }

  return {
    product,
    reportTemplate,
    reportVersion,
    questionnaireId: reportTemplate.questionnaireId,
  };
}

export async function assertComparisonQuestionnaireVersionMatchesOffering({
  questionnaireVersionId,
  expectedQuestionnaireId,
}: {
  questionnaireVersionId: string;
  expectedQuestionnaireId: string;
}) {
  const questionnaireVersion =
    await controlDb.query.questionnaireVersions.findFirst({
      where: and(
        eq(questionnaireVersions.id, questionnaireVersionId),
        eq(questionnaireVersions.questionnaireId, expectedQuestionnaireId),
        isNull(questionnaireVersions.deletedAt),
      ),
    });

  if (!questionnaireVersion) {
    throw new Error(
      "Wybrana wersja kwestionariusza nie jest zgodna z tym produktem raportowym.",
    );
  }

  return questionnaireVersion;
}
