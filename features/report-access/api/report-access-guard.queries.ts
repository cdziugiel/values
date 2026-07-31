import { requireSession } from "@/server/auth/require-session";

import {
  getActiveReportAccessGrantForCurrentUserSessionScope,
} from "./report-access.queries";

export type ReportAccessGuardResult =
  | {
      ok: true;
      isSuperAdmin: boolean;
      grant: {
        id: string;
        source: string;
        tenantSlug: string;
        assessmentSessionId: string | null;
        reportTemplateId: string;
        reportTemplateVersionId: string;
        projectQuestionnaireId: string | null;
        questionnaireVersionId: string | null;
      } | null;
    }
  | {
      ok: false;
      message: string;
    };

function normalizeOptionalString(
  value: unknown,
) {
  const normalized = String(
    value ?? "",
  ).trim();

  return normalized || null;
}

function asRecord(
  value: unknown,
): Record<string, any> {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  )
    ? value as Record<string, any>
    : {};
}

function readGrantProjectQuestionnaireId(
  metadata: unknown,
) {
  const record = asRecord(metadata);
  const scope = asRecord(
    record.reportScope,
  );

  return (
    normalizeOptionalString(
      record.projectQuestionnaireId,
    ) ??
    normalizeOptionalString(
      scope.projectQuestionnaireId,
    )
  );
}

function readGrantQuestionnaireVersionId(
  metadata: unknown,
) {
  const record = asRecord(metadata);
  const scope = asRecord(
    record.reportScope,
  );

  return (
    normalizeOptionalString(
      record.questionnaireVersionId,
    ) ??
    normalizeOptionalString(
      scope.questionnaireVersionId,
    )
  );
}

function getUserRole(session: unknown) {
  const raw = session as any;

  return (
    raw?.user?.role ??
    raw?.user?.systemRole ??
    raw?.user?.appRole ??
    raw?.user?.type ??
    null
  );
}

function isSuperAdminSession(
  session: unknown,
) {
  const role = getUserRole(session);

  return (
    role === "SUPER_ADMIN" ||
    role === "super_admin" ||
    role === "superadmin"
  );
}

export async function assertCanViewMyAssessmentReport({
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
}): Promise<ReportAccessGuardResult> {
  if (
    !tenantSlug ||
    !sessionId ||
    !reportTemplateVersionId
  ) {
    return {
      ok: false,
      message:
        "Brakuje danych wymaganych do sprawdzenia dostępu do raportu.",
    };
  }

  const session = await requireSession();

  if (isSuperAdminSession(session)) {
    return {
      ok: true,
      isSuperAdmin: true,
      grant: null,
    };
  }

  const grant =
    await getActiveReportAccessGrantForCurrentUserSessionScope({
      tenantSlug,
      sessionId,
      reportTemplateVersionId,
      projectQuestionnaireId,
      questionnaireVersionId,
    });

  if (!grant) {
    return {
      ok: false,
      message:
        "Ten raport wymaga aktywnego dostępu.",
    };
  }

  return {
    ok: true,
    isSuperAdmin: false,
    grant: {
      id: grant.id,
      source: grant.source,
      tenantSlug: grant.tenantSlug,
      assessmentSessionId:
        grant.assessmentSessionId,
      reportTemplateId:
        grant.reportTemplateId,
      reportTemplateVersionId:
        grant.reportTemplateVersionId,
      projectQuestionnaireId:
        readGrantProjectQuestionnaireId(
          grant.metadata,
        ),
      questionnaireVersionId:
        readGrantQuestionnaireVersionId(
          grant.metadata,
        ),
    },
  };
}