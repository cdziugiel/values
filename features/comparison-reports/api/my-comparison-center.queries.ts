import { and, desc, eq, isNull, or } from "drizzle-orm";

import {
  reportAccessGrants,
  reportAccessProducts,
  reportTemplates,
  reportTemplateVersions,
} from "@/drizzle/schema";

import { controlDb } from "@/server/db/control-db";
import { requireSession } from "@/server/auth/require-session";
import { getMyAssessmentRuntime } from "@/features/my-assessment/api/my-assessment-runtime";

function normalizeEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  return normalized || null;
}

function asRecord(value: unknown): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, any>;
}

function isCurrentlyActive(input: {
  status: string | null;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
}) {
  if (input.status !== "active") return false;

  const now = new Date();

  const validFrom = input.validFrom ? new Date(input.validFrom) : null;
  const validUntil = input.validUntil ? new Date(input.validUntil) : null;

  if (validFrom && validFrom > now) return false;
  if (validUntil && validUntil < now) return false;

  return true;
}

function isComparisonGrant(row: {
  reportTemplateKind: string;
  subjectType: string | null;
  metadata: unknown;
}) {
  const metadata = asRecord(row.metadata);

  return (
    row.reportTemplateKind === "comparison" ||
    row.subjectType === "comparison" ||
    metadata.reportKind === "comparison" ||
    metadata.mode === "comparison"
  );
}

function isUsedComparisonGrant(row: {
  reportTemplateKind: string;
  subjectType: string | null;
  metadata: unknown;
}) {
  const metadata = asRecord(row.metadata);

  return Boolean(
    isComparisonGrant(row) &&
      metadata.creditStatus === "used" &&
      metadata.comparisonDefinition,
  );
}

function isUnusedComparisonGrant(row: {
  status: string;
  validFrom: Date | null;
  validUntil: Date | null;
  reportTemplateKind: string;
  subjectType: string | null;
  metadata: unknown;
}) {
  if (
    !isCurrentlyActive({
      status: row.status,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
    })
  ) {
    return false;
  }

  const metadata = asRecord(row.metadata);

  return (
    isComparisonGrant(row) &&
    metadata.creditStatus !== "used" &&
    !metadata.comparisonDefinition
  );
}

function buildConfigureHref(input: {
  productId: string;
  reportTemplateVersionId: string;
  accessId?: string | null;
}) {
  const params = new URLSearchParams();

  params.set("product", input.productId);
  params.set("reportTemplateVersionId", input.reportTemplateVersionId);

  if (input.accessId) {
    params.set("accessId", input.accessId);
  }

  return `/my/assessment/compare?${params.toString()}#configure-comparison`;
}

function buildPurchaseHref(input: {
  tenantSlug: string;
  productId: string;
  reportTemplateVersionId: string;
}) {
  return `/my/assessment/special-reports/${input.reportTemplateVersionId}/unlock?tenant=${encodeURIComponent(
    input.tenantSlug,
  )}&mode=comparison&product=${encodeURIComponent(input.productId)}`;
}

function buildGeneratedReportHref(grantId: string) {
  return `/my/assessment/comparison-reports/grants/${grantId}`;
}

export async function getMyComparisonCenterData({
  tenantSlug,
  productId,
  reportTemplateVersionId,
}: {
  tenantSlug: string;
  productId?: string | null;
  reportTemplateVersionId?: string | null;
}) {
  const session = await requireSession();
  const userId = session.user?.id;
  const email = normalizeEmail(session.user?.email);

  if (!userId || !email) {
    return {
      ok: false as const,
      message: "Musisz być zalogowany, aby korzystać z porównań.",
      tenantSlug,
      defaultProductId: null,
      defaultReportTemplateVersionId: null,
      purchaseHref: null,
      unusedAccesses: [],
      generatedReports: [],
    };
  }

  const runtime = await getMyAssessmentRuntime({
    userId,
    tenantSlug,
  });

  if (!runtime) {
    return {
      ok: false as const,
      message: "Nie udało się odnaleźć środowiska badania.",
      tenantSlug,
      defaultProductId: null,
      defaultReportTemplateVersionId: null,
      purchaseHref: null,
      unusedAccesses: [],
      generatedReports: [],
    };
  }

  const comparisonProducts = await controlDb
    .select({
      productId: reportAccessProducts.id,
      productName: reportAccessProducts.name,
      productDescription: reportAccessProducts.description,
      priceGross: reportAccessProducts.priceGross,
      currency: reportAccessProducts.currency,

      reportTemplateId: reportTemplates.id,
      reportTemplateKind: reportTemplates.kind,
      reportTemplateName: reportTemplates.name,

      reportTemplateVersionId: reportTemplateVersions.id,
      reportTemplateVersionName: reportTemplateVersions.name,
      reportTemplateVersion: reportTemplateVersions.version,
      isDefaultVersion: reportTemplateVersions.isDefault,
      versionCreatedAt: reportTemplateVersions.createdAt,
    })
    .from(reportAccessProducts)
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportAccessProducts.reportTemplateId),
    )
    .innerJoin(
      reportTemplateVersions,
      eq(reportTemplateVersions.reportTemplateId, reportTemplates.id),
    )
    .where(
      and(
        eq(reportAccessProducts.status, "active"),
        eq(reportTemplates.status, "active"),
        eq(reportTemplates.kind, "comparison"),
        eq(reportTemplateVersions.status, "active"),
        isNull(reportAccessProducts.deletedAt),
        isNull(reportTemplates.deletedAt),
        isNull(reportTemplateVersions.deletedAt),
      ),
    )
    .orderBy(
      desc(reportTemplateVersions.isDefault),
      desc(reportTemplateVersions.createdAt),
    );

  const selectedProduct =
    comparisonProducts.find((row) => {
      if (productId && row.productId !== productId) return false;

      if (
        reportTemplateVersionId &&
        row.reportTemplateVersionId !== reportTemplateVersionId
      ) {
        return false;
      }

      return true;
    }) ?? comparisonProducts[0] ?? null;

  const defaultProductId = selectedProduct?.productId ?? null;
  const defaultReportTemplateVersionId =
    selectedProduct?.reportTemplateVersionId ?? null;

  const grants = await controlDb
    .select({
      id: reportAccessGrants.id,
      source: reportAccessGrants.source,
      status: reportAccessGrants.status,

      tenantSlug: reportAccessGrants.tenantSlug,

      subjectType: reportAccessGrants.subjectType,
      subjectId: reportAccessGrants.subjectId,

      productId: reportAccessGrants.productId,
      reportTemplateId: reportAccessGrants.reportTemplateId,
      reportTemplateVersionId: reportAccessGrants.reportTemplateVersionId,

      validFrom: reportAccessGrants.validFrom,
      validUntil: reportAccessGrants.validUntil,
      createdAt: reportAccessGrants.createdAt,

      metadata: reportAccessGrants.metadata,

      reportTemplateKind: reportTemplates.kind,
      reportTemplateName: reportTemplates.name,
      reportTemplateVersionName: reportTemplateVersions.name,
      reportTemplateVersion: reportTemplateVersions.version,

      productName: reportAccessProducts.name,
    })
    .from(reportAccessGrants)
    .innerJoin(
      reportTemplates,
      eq(reportTemplates.id, reportAccessGrants.reportTemplateId),
    )
    .innerJoin(
      reportTemplateVersions,
      eq(
        reportTemplateVersions.id,
        reportAccessGrants.reportTemplateVersionId,
      ),
    )
    .leftJoin(
      reportAccessProducts,
      eq(reportAccessProducts.id, reportAccessGrants.productId),
    )
    .where(
      and(
        eq(reportAccessGrants.tenantSlug, runtime.tenantSlug),
        eq(reportTemplates.kind, "comparison"),
        isNull(reportAccessGrants.deletedAt),
        isNull(reportTemplates.deletedAt),
        isNull(reportTemplateVersions.deletedAt),
        or(
          eq(reportAccessGrants.userId, userId),
          eq(reportAccessGrants.email, email),
        ),
      ),
    )
    .orderBy(desc(reportAccessGrants.createdAt));

  const activeComparisonGrants = grants.filter((grant) =>
    isCurrentlyActive({
      status: grant.status,
      validFrom: grant.validFrom,
      validUntil: grant.validUntil,
    }),
  );

  const unusedAccesses = activeComparisonGrants
    .filter(isUnusedComparisonGrant)
    .map((grant) => ({
      id: grant.id,
      productId: grant.productId,
      reportTemplateVersionId: grant.reportTemplateVersionId,
      reportTemplateName: grant.reportTemplateName,
      reportTemplateVersionName: grant.reportTemplateVersionName,
      reportTemplateVersion: grant.reportTemplateVersion,
      productName: grant.productName,
      createdAt: grant.createdAt,
      validUntil: grant.validUntil,
href:
  grant.productId && grant.reportTemplateVersionId
    ? buildConfigureHref({
        productId: grant.productId,
        reportTemplateVersionId: grant.reportTemplateVersionId,
        accessId: grant.id,
      })
    : null,
    }));

  const generatedReports = activeComparisonGrants
    .filter(isUsedComparisonGrant)
    .map((grant) => {
      const metadata = asRecord(grant.metadata);
      const comparisonDefinition = asRecord(metadata.comparisonDefinition);
      const groups = Array.isArray(comparisonDefinition.groups)
        ? comparisonDefinition.groups
        : [];

      const leftLabel =
        groups.find((group: any) => group?.key === "left")?.label ??
        "Mój wynik";

      const rightLabel =
        groups.find((group: any) => group?.key === "right")?.label ??
        "Udostępniony wynik";

      return {
        id: grant.id,
        reportTemplateName: grant.reportTemplateName,
        reportTemplateVersionName: grant.reportTemplateVersionName,
        reportTemplateVersion: grant.reportTemplateVersion,
        productName: grant.productName,
        createdAt: grant.createdAt,
        validUntil: grant.validUntil,
        usedAt:
          typeof metadata.usedAt === "string" ? metadata.usedAt : null,
        leftLabel,
        rightLabel,
        href: buildGeneratedReportHref(grant.id),
      };
    });

  return {
    ok: true as const,
    tenantSlug: runtime.tenantSlug,

    defaultProductId,
    defaultReportTemplateVersionId,

    purchaseHref:
      selectedProduct && defaultProductId && defaultReportTemplateVersionId
        ? buildPurchaseHref({
            tenantSlug: runtime.tenantSlug,
            productId: defaultProductId,
            reportTemplateVersionId: defaultReportTemplateVersionId,
          })
        : null,

    selectedProduct: selectedProduct
      ? {
          id: selectedProduct.productId,
          name: selectedProduct.productName,
          description: selectedProduct.productDescription,
          priceGross: selectedProduct.priceGross,
          currency: selectedProduct.currency,
          reportTemplateVersionId: selectedProduct.reportTemplateVersionId,
          reportTemplateVersionName:
            selectedProduct.reportTemplateVersionName,
          reportTemplateVersion: selectedProduct.reportTemplateVersion,
        }
      : null,

    unusedAccesses,
    generatedReports,
  };
}