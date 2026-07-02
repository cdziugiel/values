import { and, desc, eq, isNull, or } from "drizzle-orm";

import {
  reportAccessGrants,
  reportAccessProducts,
  reportTemplates,
  reportTemplateVersions,
} from "@/drizzle/schema";

import {
  assessmentProjects,
  assessmentSessions,
} from "@/drizzle/schema/tenant-schema";

import { controlDb } from "@/server/db/control-db";

import {
  getCompositeReportAccessOfferForCurrentUser,
  getReportAccessOfferForCompletedSession,
  resolveRespondentForCurrentUser,
} from "./report-access.queries";

const DEFAULT_PUBLIC_TENANT_SLUG = "humanet";

function isCurrentlyActive({
  status,
  validFrom,
  validUntil,
}: {
  status: string;
  validFrom: Date | null;
  validUntil: Date | null;
}) {
  if (status !== "active") {
    return false;
  }

  const now = new Date();

  if (validFrom && validFrom > now) {
    return false;
  }

  if (validUntil && validUntil < now) {
    return false;
  }

  return true;
}

async function hasActiveGrantForSessionReportTemplate({
  tenantSlug,
  sessionId,
  reportTemplateId,
  userId,
  email,
}: {
  tenantSlug: string;
  sessionId: string;
  reportTemplateId: string;
  userId: string;
  email: string | null;
}) {
  const grants = await controlDb
    .select({
      id: reportAccessGrants.id,
      status: reportAccessGrants.status,
      validFrom: reportAccessGrants.validFrom,
      validUntil: reportAccessGrants.validUntil,
      userId: reportAccessGrants.userId,
      email: reportAccessGrants.email,
    })
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.assessmentSessionId, sessionId),
        eq(reportAccessGrants.reportTemplateId, reportTemplateId),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
        or(
          eq(reportAccessGrants.userId, userId),
          email ? eq(reportAccessGrants.email, email) : undefined,
        ),
      ),
    )
    .limit(10);

  return grants.some((grant) =>
    isCurrentlyActive({
      status: grant.status,
      validFrom: grant.validFrom,
      validUntil: grant.validUntil,
    }),
  );
}

type SessionReportOfferRow = {
  tenantSlug: string;

  product: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    priceGross: unknown;
    priceNet: unknown;
    vatRate: unknown;
    currency: string;
    validityDays: number | null;
  };

  reportTemplate: {
    id: string;
    code: string | null;
    name: string | null;
  };

  reportTemplateVersion: {
    id: string;
    name: string | null;
    version: string | null;
  };

  session: {
    id: string;
    completedAt: Date | null;
    assessmentProjectId: string | null;
    assessmentProjectName: string | null;
  };
};

function groupSessionReportOffers(rows: SessionReportOfferRow[]) {
  const grouped = new Map<
    string,
    {
      kind: "personal_session";
      tenantSlug: string;
      product: SessionReportOfferRow["product"];
      reportTemplate: SessionReportOfferRow["reportTemplate"];
      reportTemplateVersion: SessionReportOfferRow["reportTemplateVersion"];
      sessions: SessionReportOfferRow["session"][];
    }
  >();

  for (const row of rows) {
    const key = `${row.product.id}::${row.reportTemplate.id}`;

    const current =
      grouped.get(key) ??
      {
        kind: "personal_session" as const,
        tenantSlug: row.tenantSlug,
        product: row.product,
        reportTemplate: row.reportTemplate,
        reportTemplateVersion: row.reportTemplateVersion,
        sessions: [],
      };

    current.sessions.push(row.session);
    grouped.set(key, current);
  }

  return Array.from(grouped.values()).map((group) => ({
    ...group,
    sessions: [...group.sessions].sort((a, b) => {
      const left = a.completedAt?.getTime() ?? 0;
      const right = b.completedAt?.getTime() ?? 0;

      return right - left;
    }),
  }));
}

async function getSessionReportPurchaseOpportunities({
  tenantSlug,
}: {
  tenantSlug: string;
}) {
  const resolved = await resolveRespondentForCurrentUser({ tenantSlug });

  if (!resolved.ok) {
    return [];
  }

  const completedSessions = await resolved.tenant.db
    .select({
      sessionId: assessmentSessions.id,
      completedAt: assessmentSessions.completedAt,
      assessmentProjectId: assessmentSessions.assessmentProjectId,
      assessmentProjectName: assessmentProjects.name,
    })
    .from(assessmentSessions)
    .leftJoin(
      assessmentProjects,
      eq(assessmentProjects.id, assessmentSessions.assessmentProjectId),
    )
    .where(
      and(
        eq(assessmentSessions.respondentId, resolved.respondent.id),
        eq(assessmentSessions.status, "completed"),
        isNull(assessmentSessions.deletedAt),
      ),
    )
    .orderBy(desc(assessmentSessions.completedAt));

  const offerRows: SessionReportOfferRow[] = [];

  for (const session of completedSessions) {
    const offer = await getReportAccessOfferForCompletedSession({
      tenantSlug,
      sessionId: session.sessionId,
    });

    if (!offer.ok) {
      continue;
    }

    const product = offer.product;

    if (!product) {
      continue;
    }

    /**
     * Ważne:
     * nie sprawdzamy tylko reportTemplateVersionId, bo raport mógł być
     * odblokowany wcześniej na starszej wersji template’u.
     * Dla listy "Do zakupu" istotne jest:
     * czy dla tej sesji istnieje już aktywny grant dla TEGO TYPU raportu.
     */
    const alreadyUnlocked = await hasActiveGrantForSessionReportTemplate({
      tenantSlug,
      sessionId: session.sessionId,
      reportTemplateId: offer.reportVersion.reportTemplateId,
      userId: resolved.actorUserId,
      email: resolved.actorEmail,
    });

    if (alreadyUnlocked) {
      continue;
    }

    offerRows.push({
      tenantSlug,

      product: {
        id: product.id,
        code: product.code,
        name: product.name,
        description: product.description,
        priceGross: product.priceGross,
        priceNet: product.priceNet,
        vatRate: product.vatRate,
        currency: product.currency,
        validityDays: product.validityDays,
      },

      reportTemplate: {
        id: offer.reportVersion.reportTemplateId,
        code: offer.reportVersion.reportTemplateCode ?? null,
        name: offer.reportVersion.reportTemplateName ?? null,
      },

      reportTemplateVersion: {
        id: offer.reportVersion.reportTemplateVersionId,
        name: offer.reportVersion.reportTemplateVersionName ?? null,
        version: offer.reportVersion.reportTemplateVersion ?? null,
      },

      session: {
        id: session.sessionId,
        completedAt: session.completedAt,
        assessmentProjectId: session.assessmentProjectId,
        assessmentProjectName: session.assessmentProjectName,
      },
    });
  }

  return groupSessionReportOffers(offerRows);
}

async function getCompositeReportPurchaseOpportunities({
  tenantSlug,
}: {
  tenantSlug: string;
}) {
  const compositeProducts = await controlDb
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
      isDefaultVersion: reportTemplateVersions.isDefault,
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
        eq(reportTemplates.kind, "personal_composite"),
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

  const uniqueByTemplate = new Map<string, (typeof compositeProducts)[number]>();

  for (const row of compositeProducts) {
    if (!uniqueByTemplate.has(row.reportTemplateId)) {
      uniqueByTemplate.set(row.reportTemplateId, row);
    }
  }

  const rows = Array.from(uniqueByTemplate.values());

  return Promise.all(
    rows.map(async (row) => {
      const offer = await getCompositeReportAccessOfferForCurrentUser({
        tenantSlug,
        reportTemplateVersionId: row.reportTemplateVersionId,
      });

      if (!offer.ok) {
        return {
          kind: "personal_composite" as const,
          tenantSlug,

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

          status: "unavailable" as const,
          canBuy: false,
          message: offer.message,
          missingRequiredSources: [],
        };
      }

      const canBuy = Boolean(offer.product) && offer.eligibility.canRender;

      return {
        kind: "personal_composite" as const,
        tenantSlug,

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

        status: canBuy
          ? ("ready" as const)
          : offer.eligibility.canRender
            ? ("missing_product" as const)
            : ("missing_sources" as const),

        canBuy,
        message: canBuy
          ? "Możesz odblokować nową instancję raportu złożonego."
          : offer.eligibility.canRender
            ? "Brakuje aktywnego produktu sprzedażowego."
            : "Najpierw ukończ wymagane kwestionariusze źródłowe.",

        missingRequiredSources: offer.eligibility.missingRequiredSources,
        configuredSources: offer.eligibility.configuredSources,
        completedQuestionnaireIds: offer.eligibility.completedQuestionnaireIds,
      };
    }),
  );
}


function isComparisonReportTemplateKind(kind: unknown) {
  return kind === "comparison";
}

async function hasActiveGrantForSpecialReportTemplate({
  tenantSlug,
  reportTemplateId,
  userId,
  email,
}: {
  tenantSlug: string;
  reportTemplateId: string;
  userId: string;
  email: string | null;
}) {
  const grants = await controlDb
    .select({
      id: reportAccessGrants.id,
      status: reportAccessGrants.status,
      validFrom: reportAccessGrants.validFrom,
      validUntil: reportAccessGrants.validUntil,
      userId: reportAccessGrants.userId,
      email: reportAccessGrants.email,
    })
    .from(reportAccessGrants)
    .where(
      and(
        eq(reportAccessGrants.tenantSlug, tenantSlug),
        eq(reportAccessGrants.reportTemplateId, reportTemplateId),
        eq(reportAccessGrants.status, "active"),
        isNull(reportAccessGrants.deletedAt),
        or(
          eq(reportAccessGrants.userId, userId),
          email ? eq(reportAccessGrants.email, email) : undefined,
        ),
      ),
    )
    .limit(10);

  return grants.some((grant) =>
    isCurrentlyActive({
      status: grant.status,
      validFrom: grant.validFrom,
      validUntil: grant.validUntil,
    }),
  );
}

async function getComparisonReportPurchaseOpportunities({
  tenantSlug,
}: {
  tenantSlug: string;
}) {
  const resolved = await resolveRespondentForCurrentUser({ tenantSlug });

  if (!resolved.ok) {
    return [];
  }

  const completedSessions = await resolved.tenant.db
    .select({
      sessionId: assessmentSessions.id,
      completedAt: assessmentSessions.completedAt,
      assessmentProjectId: assessmentSessions.assessmentProjectId,
      assessmentProjectName: assessmentProjects.name,
    })
    .from(assessmentSessions)
    .leftJoin(
      assessmentProjects,
      eq(assessmentProjects.id, assessmentSessions.assessmentProjectId),
    )
    .where(
      and(
        eq(assessmentSessions.respondentId, resolved.respondent.id),
        eq(assessmentSessions.status, "completed"),
        isNull(assessmentSessions.deletedAt),
      ),
    )
    .orderBy(desc(assessmentSessions.completedAt));

  const completedSessionsCount = completedSessions.length;

  const comparisonProducts = await controlDb
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

  if (!comparisonProducts.length) {
    return [];
  }

  /**
   * Bierzemy jedną aktywną wersję na template:
   * domyślną albo najnowszą.
   */
  const uniqueByTemplate = new Map<
    string,
    (typeof comparisonProducts)[number]
  >();

  for (const row of comparisonProducts) {
    if (!isComparisonReportTemplateKind(row.reportTemplateKind)) {
      continue;
    }

    if (!uniqueByTemplate.has(row.reportTemplateId)) {
      uniqueByTemplate.set(row.reportTemplateId, row);
    }
  }

  const offers = [];

  for (const row of uniqueByTemplate.values()) {


    const hasCompletedSession = completedSessionsCount > 0;

    offers.push({
      kind: "comparison" as const,
      tenantSlug,

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

      completedSessionsCount,

      status: hasCompletedSession
        ? ("ready" as const)
        : ("missing_sources" as const),

      canBuy: hasCompletedSession,

      message: hasCompletedSession
        ? "Możesz odblokować raport dopasowania. "
        : "Aby odblokować raport dopasowania, potrzebujesz przynajmniej jednego ukończonego wyniku.",
    });
  }

  return offers;
}

export async function getMyReportPurchaseOpportunities({
  tenantSlug = DEFAULT_PUBLIC_TENANT_SLUG,
}: {
  tenantSlug?: string;
} = {}) {
  const [sessionReportOffers, compositeOffers, comparisonOffers] =
    await Promise.all([
      getSessionReportPurchaseOpportunities({ tenantSlug }),
      getCompositeReportPurchaseOpportunities({ tenantSlug }),
      getComparisonReportPurchaseOpportunities({ tenantSlug }),
    ]);

  return {
    tenantSlug,
    sessionReportOffers,
    compositeOffers,
    comparisonOffers,
  };
}