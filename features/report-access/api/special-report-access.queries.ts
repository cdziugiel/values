import { and, eq, isNull, or } from "drizzle-orm";

import {
  reportAccessGrants,
  reportAccessProducts,
  reportTemplates,
  reportTemplateVersions,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";
import { requireSession } from "@/server/auth/require-session";
import { getMyAssessmentRuntime } from "@/features/my-assessment/api/my-assessment-runtime";



function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function isUnusedComparisonGrant(input: {
  status: string | null;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
  metadata: unknown;
}) {
  if (
    !isCurrentlyActive({
      status: input.status,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
    })
  ) {
    return false;
  }

  const metadata = asRecord(input.metadata);

  if (metadata.creditStatus === "used") {
    return false;
  }

  if (metadata.comparisonDefinition) {
    return false;
  }

  return true;
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

export async function getComparisonSpecialReportUnlockOffer({
  tenantSlug,
  productId,
  reportTemplateVersionId,
}: {
  tenantSlug: string;
  productId: string;
  reportTemplateVersionId: string;
}) {
  const session = await requireSession();

  if (!session.user?.id || !session.user?.email) {
    return {
      ok: false as const,
      message: "Musisz być zalogowany, aby odblokować raport.",
    };
  }

  const runtime = await getMyAssessmentRuntime({
    userId: session.user.id,
    tenantSlug,
  });

  if (!runtime) {
    return {
      ok: false as const,
      message: "Nie udało się odnaleźć środowiska badania.",
    };
  }

  const [row] = await controlDb
    .select({
      productId: reportAccessProducts.id,
      productCode: reportAccessProducts.code,
      productName: reportAccessProducts.name,
      productDescription: reportAccessProducts.description,
      priceGross: reportAccessProducts.priceGross,
      priceNet: reportAccessProducts.priceNet,
      vatRate: reportAccessProducts.vatRate,
      currency: reportAccessProducts.currency,
      validityDays: reportAccessProducts.validityDays,

      reportTemplateId: reportTemplates.id,
      reportTemplateCode: reportTemplates.code,
      reportTemplateName: reportTemplates.name,
      reportTemplateDescription: reportTemplates.description,
      reportTemplateKind: reportTemplates.kind,

      reportTemplateVersionId: reportTemplateVersions.id,
      reportTemplateVersionName: reportTemplateVersions.name,
      reportTemplateVersion: reportTemplateVersions.version,
      reportTemplateVersionStatus: reportTemplateVersions.status,
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
        eq(reportAccessProducts.id, productId),
        eq(reportAccessProducts.status, "active"),
        eq(reportTemplates.status, "active"),
        eq(reportTemplates.kind, "comparison"),
        eq(reportTemplateVersions.id, reportTemplateVersionId),
        eq(reportTemplateVersions.status, "active"),
        isNull(reportAccessProducts.deletedAt),
        isNull(reportTemplates.deletedAt),
        isNull(reportTemplateVersions.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    return {
      ok: false as const,
      message: "Nie znaleziono aktywnego produktu raportu porównawczego.",
    };
  }

const grants = await controlDb
  .select({
    id: reportAccessGrants.id,
    status: reportAccessGrants.status,
    validFrom: reportAccessGrants.validFrom,
    validUntil: reportAccessGrants.validUntil,
    metadata: reportAccessGrants.metadata,
  })
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.tenantSlug, runtime.tenantSlug),
        eq(reportAccessGrants.reportTemplateId, row.reportTemplateId),
        eq(reportAccessGrants.reportTemplateVersionId, row.reportTemplateVersionId),
        eq(reportAccessGrants.productId, row.productId),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
        or(
          eq(reportAccessGrants.userId, session.user.id),
          eq(reportAccessGrants.email, session.user.email),
        ),
      ),
    );

const unusedGrant = grants.find((grant) =>
  isUnusedComparisonGrant({
    status: grant.status,
    validFrom: grant.validFrom,
    validUntil: grant.validUntil,
    metadata: grant.metadata,
  }),
);

  return {
    ok: true as const,
    tenantSlug: runtime.tenantSlug,
    actorUserId: session.user.id,
    actorEmail: session.user.email,

hasAccess: Boolean(unusedGrant),
existingGrantId: unusedGrant?.id ?? null,

    product: {
      id: row.productId,
      code: row.productCode,
      name: row.productName,
      description: row.productDescription,
      priceGross: row.priceGross,
      priceNet: row.priceNet,
      vatRate: row.vatRate,
      currency: row.currency,
      validityDays: row.validityDays,
    },

    reportTemplate: {
      id: row.reportTemplateId,
      code: row.reportTemplateCode,
      name: row.reportTemplateName,
      description: row.reportTemplateDescription,
      kind: row.reportTemplateKind,
    },

    reportTemplateVersion: {
      id: row.reportTemplateVersionId,
      name: row.reportTemplateVersionName,
      version: row.reportTemplateVersion,
      status: row.reportTemplateVersionStatus,
    },
  };
}