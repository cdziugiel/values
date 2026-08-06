import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  or,
} from "drizzle-orm";

import {
  billingProfiles,
  normativeProfileSessionLinks,
  questionnaires,
  questionnaireVersions,
  reportAccessCodes,
  reportAccessGrants,
  reportAccessProducts,
  reportTemplates,
  reportTemplateVersions,
} from "@/drizzle/schema";
import {
  assessmentProjectQuestionnaires,
  assessmentProjects,
  assessmentResultSnapshots,
  assessmentSessions,
  respondentIdentities,
  respondents,
} from "@/drizzle/schema/tenant-schema";
import { resolveReportPreviewConfig } from "@/features/report-builder";
import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import { resolveAssessmentSessionReportTemplateVersionId } from "./assessment-session-report.queries";

export type PartnerSessionReportProduct = {
  id: string;
  reportTemplateId: string;
  code: string;
  name: string;
  currency: string | null;
  priceGross: string | number | null;
  availableCount: number;
  reportTemplateKind: string | null;
};

export type PartnerAssessmentSessionMaterial = {
  snapshotId: string;
  projectQuestionnaireId: string | null;
  questionnaireId: string | null;
  questionnaireVersionId: string | null;
  questionnaireName: string;
  questionnaireVersion: string | null;

  reportTemplateVersionId: string | null;
  summaryHref: string | null;

  grant: {
    id: string;
    reportTemplateVersionId: string;
    reportHref: string;
  } | null;

  products: PartnerSessionReportProduct[];
  availableProducts: PartnerSessionReportProduct[];

  status:
    | "granted"
    | "pool_available"
    | "purchase_required"
    | "report_unavailable";

  message: string | null;
};

export type PartnerAssessmentSessionMaterialsData = {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };

  project: {
    id: string;
    name: string;
    description: string | null;
  };

  session: {
    id: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
  };

  respondent: {
    id: string;
    displayName: string;
    email: string | null;
    externalCode: string | null;
  };

  normativeDataAvailable: boolean;
  canManageReportAccess: boolean;

  billingProfile: {
    type: string | null;
    companyName: string | null;
    taxId: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    country: string | null;
    postalCode: string | null;
    city: string | null;
    street: string | null;
    buildingNumber: string | null;
    apartmentNumber: string | null;
    invoiceEmail: string | null;
  } | null;

  materials: PartnerAssessmentSessionMaterial[];
};

type MaterialScope = {
  snapshotId: string;
  projectQuestionnaireId: string | null;
  questionnaireId: string | null;
  questionnaireVersionId: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeString(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function getDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  externalCode: string | null;
}) {
  const fullName = [input.firstName, input.lastName]
    .filter(Boolean)
    .join(" ");

  return fullName || input.email || input.externalCode || "Respondent";
}

function isGrantCurrentlyActive(input: {
  status: string;
  validFrom: Date | null;
  validUntil: Date | null;
}) {
  if (input.status !== "active") {
    return false;
  }

  const now = new Date();

  if (input.validFrom && input.validFrom > now) {
    return false;
  }

  if (input.validUntil && input.validUntil < now) {
    return false;
  }

  return true;
}

function getGrantScope(metadataValue: unknown) {
  const metadata = asRecord(metadataValue);
  const reportScope = asRecord(metadata.reportScope);

  return {
    projectQuestionnaireId:
      normalizeString(metadata.projectQuestionnaireId) ??
      normalizeString(reportScope.projectQuestionnaireId),

    questionnaireId:
      normalizeString(metadata.questionnaireId) ??
      normalizeString(reportScope.questionnaireId),

    questionnaireVersionId:
      normalizeString(metadata.questionnaireVersionId) ??
      normalizeString(reportScope.questionnaireVersionId),
  };
}

function grantMatchesScope({
  metadata,
  scope,
}: {
  metadata: unknown;
  scope: MaterialScope;
}) {
  const grantScope = getGrantScope(metadata);

  if (scope.projectQuestionnaireId) {
    return (
      grantScope.projectQuestionnaireId ===
      scope.projectQuestionnaireId
    );
  }

  if (scope.questionnaireVersionId) {
    return (
      grantScope.questionnaireVersionId ===
      scope.questionnaireVersionId
    );
  }

  if (scope.questionnaireId) {
    return grantScope.questionnaireId === scope.questionnaireId;
  }

  return false;
}

function buildScopeSearchParams(scope: MaterialScope) {
  const params = new URLSearchParams();

  if (scope.projectQuestionnaireId) {
    params.set(
      "projectQuestionnaireId",
      scope.projectQuestionnaireId,
    );
  }

  if (scope.questionnaireVersionId) {
    params.set(
      "questionnaireVersionId",
      scope.questionnaireVersionId,
    );
  }

  return params;
}

function buildReportHref({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
  scope,
}: {
  tenantSlug: string;
  sessionId: string;
  reportTemplateVersionId: string;
  scope: MaterialScope;
}) {
  const params = buildScopeSearchParams(scope);
  const query = params.toString();

  return (
    `/t/${tenantSlug}/assessment-sessions/${sessionId}` +
    `/report/${reportTemplateVersionId}` +
    (query ? `?${query}` : "")
  );
}

function buildSummaryHref({
  tenantSlug,
  sessionId,
  reportTemplateVersionId,
  scope,
}: {
  tenantSlug: string;
  sessionId: string;
  reportTemplateVersionId: string;
  scope: MaterialScope;
}) {
  const params = buildScopeSearchParams(scope);
  const query = params.toString();

  return (
    `/t/${tenantSlug}/assessment-sessions/${sessionId}` +
    `/report/${reportTemplateVersionId}/teaser` +
    (query ? `?${query}` : "")
  );
}

export async function getPartnerAssessmentSessionMaterials({
  tenantSlug,
  sessionId,
}: {
  tenantSlug: string;
  sessionId: string;
}): Promise<PartnerAssessmentSessionMaterialsData | null> {
  const ctx = await requireTenantContext({ tenantSlug });

  requirePermission(ctx, "assessment_result:read");
  requirePermission(ctx, "report:read");

  const db = await getTenantDb(ctx);

  const sessionRows = await db
    .select({
      sessionId: assessmentSessions.id,
      sessionStatus: assessmentSessions.status,
      sessionStartedAt: assessmentSessions.startedAt,
      sessionCompletedAt: assessmentSessions.completedAt,

      projectId: assessmentProjects.id,
      projectName: assessmentProjects.name,
      projectDescription: assessmentProjects.description,

      respondentId: respondents.id,
      respondentExternalCode: respondents.externalCode,
      respondentEmail: respondentIdentities.email,
      respondentFirstName: respondentIdentities.firstName,
      respondentLastName: respondentIdentities.lastName,
    })
    .from(assessmentSessions)
    .innerJoin(
      assessmentProjects,
      eq(
        assessmentProjects.id,
        assessmentSessions.assessmentProjectId,
      ),
    )
    .innerJoin(
      respondents,
      eq(respondents.id, assessmentSessions.respondentId),
    )
    .leftJoin(
      respondentIdentities,
      and(
        eq(
          respondentIdentities.respondentId,
          respondents.id,
        ),
        isNull(respondentIdentities.deletedAt),
      ),
    )
    .where(
      and(
        eq(assessmentSessions.id, sessionId),
        isNull(assessmentSessions.deletedAt),
        isNull(assessmentProjects.deletedAt),
        isNull(respondents.deletedAt),
      ),
    )
    .limit(1);

  const sessionRow = sessionRows[0] ?? null;

  if (!sessionRow) {
    return null;
  }

  const [snapshotRows, normativeLinkRows, billingProfileRows] =
    await Promise.all([
      db
        .select({
          snapshotId: assessmentResultSnapshots.id,
          projectQuestionnaireId:
            assessmentResultSnapshots.projectQuestionnaireId,
          questionnaireId:
            assessmentResultSnapshots.questionnaireId,
          questionnaireVersionId:
            assessmentResultSnapshots.questionnaireVersionId,
          createdAt: assessmentResultSnapshots.createdAt,
        })
        .from(assessmentResultSnapshots)
        .where(
          and(
            eq(
              assessmentResultSnapshots.assessmentSessionId,
              sessionId,
            ),
            isNull(assessmentResultSnapshots.deletedAt),
          ),
        )
        .orderBy(asc(assessmentResultSnapshots.createdAt)),

      ctx.controlDb
        .select({
          id: normativeProfileSessionLinks.id,
        })
        .from(normativeProfileSessionLinks)
        .where(
          and(
            eq(normativeProfileSessionLinks.tenantId, ctx.tenantId),
            eq(
              normativeProfileSessionLinks.assessmentSessionId,
              sessionId,
            ),
          ),
        )
        .limit(1),

      ctx.controlDb
        .select({
          type: billingProfiles.type,
          companyName: billingProfiles.companyName,
          taxId: billingProfiles.taxId,
          firstName: billingProfiles.firstName,
          lastName: billingProfiles.lastName,
          email: billingProfiles.email,
          phone: billingProfiles.phone,
          country: billingProfiles.country,
          postalCode: billingProfiles.postalCode,
          city: billingProfiles.city,
          street: billingProfiles.street,
          buildingNumber: billingProfiles.buildingNumber,
          apartmentNumber: billingProfiles.apartmentNumber,
          invoiceEmail: billingProfiles.invoiceEmail,
        })
        .from(billingProfiles)
        .where(
          and(
            eq(billingProfiles.ownerType, "tenant"),
            eq(billingProfiles.tenantSlug, tenantSlug),
            isNull(billingProfiles.deletedAt),
          ),
        )
        .orderBy(desc(billingProfiles.updatedAt))
        .limit(1),
    ]);

  const projectQuestionnaireIds = Array.from(
    new Set(
      snapshotRows
        .map((row) => row.projectQuestionnaireId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const projectQuestionnaireRows =
    projectQuestionnaireIds.length > 0
      ? await db
          .select({
            id: assessmentProjectQuestionnaires.id,
            questionnaireId:
              assessmentProjectQuestionnaires.questionnaireId,
            questionnaireVersionId:
              assessmentProjectQuestionnaires.questionnaireVersionId,
          })
          .from(assessmentProjectQuestionnaires)
          .where(
            and(
              inArray(
                assessmentProjectQuestionnaires.id,
                projectQuestionnaireIds,
              ),
              eq(
                assessmentProjectQuestionnaires.assessmentProjectId,
                sessionRow.projectId,
              ),
              isNull(assessmentProjectQuestionnaires.deletedAt),
            ),
          )
      : [];

  const projectQuestionnaireById = new Map(
    projectQuestionnaireRows.map((row) => [row.id, row]),
  );

  const scopes: MaterialScope[] = snapshotRows.map((snapshot) => {
    const projectQuestionnaire = snapshot.projectQuestionnaireId
      ? projectQuestionnaireById.get(snapshot.projectQuestionnaireId) ?? null
      : null;

    return {
      snapshotId: snapshot.snapshotId,
      projectQuestionnaireId:
        snapshot.projectQuestionnaireId ?? null,
      questionnaireId:
        snapshot.questionnaireId ??
        projectQuestionnaire?.questionnaireId ??
        null,
      questionnaireVersionId:
        snapshot.questionnaireVersionId ??
        projectQuestionnaire?.questionnaireVersionId ??
        null,
    };
  });

  const questionnaireVersionIds = Array.from(
    new Set(
      scopes
        .map((scope) => scope.questionnaireVersionId)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const questionnaireRows =
    questionnaireVersionIds.length > 0
      ? await ctx.controlDb
          .select({
            questionnaireId: questionnaires.id,
            questionnaireName: questionnaires.name,
            questionnaireVersionId: questionnaireVersions.id,
            questionnaireVersion: questionnaireVersions.version,
            questionnaireVersionName: questionnaireVersions.name,
          })
          .from(questionnaireVersions)
          .innerJoin(
            questionnaires,
            eq(
              questionnaires.id,
              questionnaireVersions.questionnaireId,
            ),
          )
          .where(
            and(
              inArray(
                questionnaireVersions.id,
                questionnaireVersionIds,
              ),
              isNull(questionnaireVersions.deletedAt),
              isNull(questionnaires.deletedAt),
            ),
          )
      : [];

  const questionnaireByVersionId = new Map(
    questionnaireRows.map((row) => [
      row.questionnaireVersionId,
      row,
    ]),
  );

  const resolvedReportVersions = await Promise.all(
    scopes.map(async (scope) => {
      if (!scope.questionnaireVersionId) {
        return {
          snapshotId: scope.snapshotId,
          reportTemplateVersionId: null,
        };
      }

      const reportTemplateVersionId =
        await resolveAssessmentSessionReportTemplateVersionId({
          tenantSlug,
          sessionId,
          projectQuestionnaireId:
            scope.projectQuestionnaireId,
          questionnaireVersionId:
            scope.questionnaireVersionId,
        });

      return {
        snapshotId: scope.snapshotId,
        reportTemplateVersionId,
      };
    }),
  );

  const reportTemplateVersionIdBySnapshotId = new Map(
    resolvedReportVersions.map((row) => [
      row.snapshotId,
      row.reportTemplateVersionId,
    ]),
  );

  const grantRows = await ctx.controlDb
    .select({
      id: reportAccessGrants.id,
      status: reportAccessGrants.status,
      reportTemplateId: reportAccessGrants.reportTemplateId,
      reportTemplateVersionId:
        reportAccessGrants.reportTemplateVersionId,
      validFrom: reportAccessGrants.validFrom,
      validUntil: reportAccessGrants.validUntil,
      metadata: reportAccessGrants.metadata,
      createdAt: reportAccessGrants.createdAt,
    })
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.assessmentSessionId, sessionId),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
      ),
    )
    .orderBy(desc(reportAccessGrants.createdAt));

  const allReportTemplateVersionIds = Array.from(
    new Set(
      [
        ...resolvedReportVersions.map(
          (row) => row.reportTemplateVersionId,
        ),
        ...grantRows.map(
          (grant) => grant.reportTemplateVersionId,
        ),
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  const reportVersionRows =
    allReportTemplateVersionIds.length > 0
      ? await ctx.controlDb
          .select({
            reportTemplateVersionId: reportTemplateVersions.id,
            reportTemplateId: reportTemplateVersions.reportTemplateId,
            config: reportTemplateVersions.config,
            reportTemplateKind: reportTemplates.kind,
            reportTemplateStatus: reportTemplates.status,
          })
          .from(reportTemplateVersions)
          .innerJoin(
            reportTemplates,
            eq(
              reportTemplates.id,
              reportTemplateVersions.reportTemplateId,
            ),
          )
          .where(
            and(
              inArray(
                reportTemplateVersions.id,
                allReportTemplateVersionIds,
              ),
              isNull(reportTemplateVersions.deletedAt),
              isNull(reportTemplates.deletedAt),
            ),
          )
      : [];

  const reportVersionById = new Map(
    reportVersionRows.map((row) => [
      row.reportTemplateVersionId,
      row,
    ]),
  );

  const currentReportTemplateIds = Array.from(
    new Set(
      resolvedReportVersions
        .map((row) => {
          if (!row.reportTemplateVersionId) {
            return null;
          }

          return (
            reportVersionById.get(row.reportTemplateVersionId)
              ?.reportTemplateId ?? null
          );
        })
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const productRows =
    currentReportTemplateIds.length > 0
      ? await ctx.controlDb
          .select({
            id: reportAccessProducts.id,
            reportTemplateId:
              reportAccessProducts.reportTemplateId,
            code: reportAccessProducts.code,
            name: reportAccessProducts.name,
            currency: reportAccessProducts.currency,
            priceGross: reportAccessProducts.priceGross,
            reportTemplateKind: reportTemplates.kind,
          })
          .from(reportAccessProducts)
          .innerJoin(
            reportTemplates,
            eq(
              reportTemplates.id,
              reportAccessProducts.reportTemplateId,
            ),
          )
          .where(
            and(
              inArray(
                reportAccessProducts.reportTemplateId,
                currentReportTemplateIds,
              ),
              eq(reportAccessProducts.status, "active"),
              eq(reportTemplates.status, "active"),
              eq(reportTemplates.kind, "personal"),
              isNull(reportAccessProducts.deletedAt),
              isNull(reportTemplates.deletedAt),
            ),
          )
          .orderBy(asc(reportAccessProducts.name))
      : [];

  const availableCodeRows =
    productRows.length > 0
      ? await ctx.controlDb
          .select({
            productId: reportAccessCodes.productId,
            value: count(reportAccessCodes.id),
          })
          .from(reportAccessCodes)
          .where(
            and(
              eq(reportAccessCodes.tenantSlug, tenantSlug),
              inArray(
                reportAccessCodes.productId,
                productRows.map((product) => product.id),
              ),
              eq(reportAccessCodes.status, "available"),
              or(
                isNull(reportAccessCodes.assessmentProjectId),
                eq(
                  reportAccessCodes.assessmentProjectId,
                  sessionRow.projectId,
                ),
              ),
              isNull(reportAccessCodes.assessmentSessionId),
              isNull(reportAccessCodes.assessmentAccessLinkId),
              isNull(reportAccessCodes.assignedToEmail),
              isNull(reportAccessCodes.assignedToUserId),
              isNull(reportAccessCodes.deletedAt),
            ),
          )
          .groupBy(reportAccessCodes.productId)
      : [];

  const availableCountByProductId = new Map(
    availableCodeRows.map((row) => [
      row.productId,
      Number(row.value ?? 0),
    ]),
  );

  const productsByReportTemplateId = new Map<
    string,
    PartnerSessionReportProduct[]
  >();

  for (const product of productRows) {
    const enrichedProduct: PartnerSessionReportProduct = {
      ...product,
      availableCount:
        availableCountByProductId.get(product.id) ?? 0,
    };

    const current =
      productsByReportTemplateId.get(product.reportTemplateId) ?? [];

    current.push(enrichedProduct);
    productsByReportTemplateId.set(product.reportTemplateId, current);
  }

  const normativeDataAvailable = normativeLinkRows.length > 0;

  const materials = scopes.map((scope): PartnerAssessmentSessionMaterial => {
    const questionnaire = scope.questionnaireVersionId
      ? questionnaireByVersionId.get(scope.questionnaireVersionId) ?? null
      : null;

    const currentReportTemplateVersionId =
      reportTemplateVersionIdBySnapshotId.get(scope.snapshotId) ?? null;

    const currentReportVersion = currentReportTemplateVersionId
      ? reportVersionById.get(currentReportTemplateVersionId) ?? null
      : null;

    const activeGrant =
      grantRows.find((grant) => {
        if (!isGrantCurrentlyActive(grant)) {
          return false;
        }

        const grantedReportVersion = reportVersionById.get(
          grant.reportTemplateVersionId,
        );

        if (grantedReportVersion?.reportTemplateKind !== "personal") {
          return false;
        }

        return grantMatchesScope({
          metadata: grant.metadata,
          scope,
        });
      }) ?? null;

    const reportTemplateId =
      currentReportVersion?.reportTemplateId ?? null;

    const products = reportTemplateId
      ? productsByReportTemplateId.get(reportTemplateId) ?? []
      : [];

    const availableProducts = products.filter(
      (product) => product.availableCount > 0,
    );

    const previewConfig = currentReportVersion
      ? resolveReportPreviewConfig(currentReportVersion.config)
      : null;

    const summaryHref =
      sessionRow.sessionStatus === "completed" &&
      normativeDataAvailable &&
      currentReportTemplateVersionId &&
      currentReportVersion?.reportTemplateKind === "personal" &&
      previewConfig?.personalTeaser.enabled
        ? buildSummaryHref({
            tenantSlug,
            sessionId,
            reportTemplateVersionId:
              currentReportTemplateVersionId,
            scope,
          })
        : null;

    const grant = activeGrant
      ? {
          id: activeGrant.id,
          reportTemplateVersionId:
            activeGrant.reportTemplateVersionId,
          reportHref: buildReportHref({
            tenantSlug,
            sessionId,
            reportTemplateVersionId:
              activeGrant.reportTemplateVersionId,
            scope,
          }),
        }
      : null;

    const status: PartnerAssessmentSessionMaterial["status"] = grant
      ? "granted"
      : availableProducts.length > 0
        ? "pool_available"
        : products.length > 0
          ? "purchase_required"
          : "report_unavailable";

    const message =
      status === "report_unavailable"
        ? currentReportTemplateVersionId
          ? "Dla tego raportu nie ma aktywnego produktu dostępu."
          : "Dla tego kwestionariusza nie skonfigurowano aktywnego raportu."
        : null;

    return {
      snapshotId: scope.snapshotId,
      projectQuestionnaireId:
        scope.projectQuestionnaireId,
      questionnaireId: scope.questionnaireId,
      questionnaireVersionId:
        scope.questionnaireVersionId,
      questionnaireName:
        questionnaire?.questionnaireName ??
        questionnaire?.questionnaireVersionName ??
        "Kwestionariusz",
      questionnaireVersion:
        questionnaire?.questionnaireVersion ?? null,
      reportTemplateVersionId:
        currentReportTemplateVersionId,
      summaryHref,
      grant,
      products,
      availableProducts,
      status,
      message,
    };
  });

  return {
    tenant: {
      id: ctx.tenantId,
      slug: ctx.tenantSlug,
      name: ctx.tenantName,
    },
    project: {
      id: sessionRow.projectId,
      name: sessionRow.projectName,
      description: sessionRow.projectDescription,
    },
    session: {
      id: sessionRow.sessionId,
      status: sessionRow.sessionStatus,
      startedAt: sessionRow.sessionStartedAt,
      completedAt: sessionRow.sessionCompletedAt,
    },
    respondent: {
      id: sessionRow.respondentId,
      displayName: getDisplayName({
        firstName: sessionRow.respondentFirstName,
        lastName: sessionRow.respondentLastName,
        email: sessionRow.respondentEmail,
        externalCode: sessionRow.respondentExternalCode,
      }),
      email: sessionRow.respondentEmail,
      externalCode: sessionRow.respondentExternalCode,
    },
    normativeDataAvailable,
    canManageReportAccess:
      ctx.permissions.includes("assessment_project:update"),
    billingProfile: billingProfileRows[0] ?? null,
    materials,
  };
}
