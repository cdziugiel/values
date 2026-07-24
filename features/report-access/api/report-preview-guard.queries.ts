import { getMyAssessmentCompletedResult } from "@/features/my-assessment/api/my-assessment-result.queries";
import { getReportTemplateVersionForRender } from "@/features/report-builder/api/report-render.queries";
import { resolveReportPreviewConfig } from "@/features/report-builder/lib/report-preview-config";

export type ReportPreviewAccessResult =
  | {
      ok: true;
      result: NonNullable<
        Awaited<ReturnType<typeof getMyAssessmentCompletedResult>>
      >;
      reportTemplateVersion: NonNullable<
        Awaited<
          ReturnType<typeof getReportTemplateVersionForRender>
        >
      >;
      previewConfig: ReturnType<
        typeof resolveReportPreviewConfig
      >;
    }
  | {
      ok: false;
      message: string;
    };

export async function assertCanViewMyAssessmentReportPreview({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
  projectQuestionnaireId = null,
  questionnaireVersionId = null,
}: {
  tenantSlug: string;
  sessionId: string;
  reportTemplateVersionId: string;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}): Promise<ReportPreviewAccessResult> {
  if (!tenantSlug || !sessionId || !reportTemplateVersionId) {
    return {
      ok: false,
      message:
        "Brakuje danych wymaganych do wyświetlenia próbki raportu.",
    };
  }

  try {
    /**
     * Ta funkcja:
     * - wymaga sesji użytkownika,
     * - sprawdza e-mail właściciela sesji,
     * - pobiera snapshot właściwego kwestionariusza.
     */
    const result = await getMyAssessmentCompletedResult({
      tenantSlug,
      sessionId,
      projectQuestionnaireId,
      questionnaireVersionId,
    });

    if (!result?.payload) {
      return {
        ok: false,
        message:
          "Nie odnaleziono ukończonego wyniku dla tej sesji.",
      };
    }

    const reportTemplateVersion =
      await getReportTemplateVersionForRender({
        reportTemplateVersionId,
      });

    if (!reportTemplateVersion) {
      return {
        ok: false,
        message: "Nie odnaleziono wersji szablonu raportu.",
      };
    }

    const previewConfig = resolveReportPreviewConfig(
      reportTemplateVersion.config,
    );

    return {
      ok: true,
      result,
      reportTemplateVersion,
      previewConfig,
    };
  } catch {
    return {
      ok: false,
      message:
        "Nie udało się potwierdzić dostępu do próbki raportu.",
    };
  }
}