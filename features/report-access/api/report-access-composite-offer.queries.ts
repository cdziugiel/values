import {
  and,
  desc,
  eq,
  inArray,
  isNull,
} from "drizzle-orm";

import { reportAccessGrants } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

import { hasFreshRequiredCompositeSourceSet } from "../lib/composite-report-repurchase";
import {
  getCompositeReportAccessOfferForCurrentUser as getCoreCompositeReportAccessOfferForCurrentUser,
} from "./report-access-core.queries";

type CompositeOfferInput = Parameters<
  typeof getCoreCompositeReportAccessOfferForCurrentUser
>[0];

type CoreCompositeOffer = Awaited<
  ReturnType<
    typeof getCoreCompositeReportAccessOfferForCurrentUser
  >
>;

async function getLatestOwnedCompositeGrant({
  offer,
  reportTemplateVersionId,
}: {
  offer: Extract<CoreCompositeOffer, { ok: true }>;
  reportTemplateVersionId: string;
}) {
  const respondentIdByTenant = new Map(
    offer.respondentContexts.map((context) => [
      context.tenantSlug,
      context.respondent.id,
    ]),
  );

  const tenantSlugs = Array.from(
    respondentIdByTenant.keys(),
  );

  if (tenantSlugs.length === 0) {
    return null;
  }

  const grants = await controlDb
    .select()
    .from(reportAccessGrants)
    .where(
      and(
        inArray(
          reportAccessGrants.tenantSlug,
          tenantSlugs,
        ),
        eq(
          reportAccessGrants.subjectType,
          "respondent",
        ),
        eq(
          reportAccessGrants.reportTemplateVersionId,
          reportTemplateVersionId,
        ),
        eq(
          reportAccessGrants.status,
          "active",
        ),
        isNull(reportAccessGrants.deletedAt),
      ),
    )
    .orderBy(desc(reportAccessGrants.createdAt))
    .limit(100);

  const now = new Date();

  return grants.find((grant) => {
    const respondentId = respondentIdByTenant.get(
      grant.tenantSlug,
    );

    if (
      !respondentId ||
      grant.subjectId !== respondentId
    ) {
      return false;
    }

    if (
      grant.userId &&
      grant.userId !== offer.actorUserId
    ) {
      return false;
    }

    if (
      grant.validFrom &&
      grant.validFrom > now
    ) {
      return false;
    }

    if (
      grant.validUntil &&
      grant.validUntil < now
    ) {
      return false;
    }

    return true;
  }) ?? null;
}

/**
 * Rozszerza bazowy resolver oferty composite o regułę ponownego zakupu.
 *
 * Aktywny grant blokuje zakup tylko wtedy, gdy użytkownik nie ukończył ponownie
 * wszystkich wymaganych kwestionariuszy. Po pojawieniu się pełnego, świeżego
 * zestawu źródeł stary grant nadal pozostaje dostępny w historii, ale nie jest
 * traktowany jako grant dla nowej instancji raportu.
 */
export async function getCompositeReportAccessOfferForCurrentUser(
  input: CompositeOfferInput,
) {
  const offer =
    await getCoreCompositeReportAccessOfferForCurrentUser(input);

  if (!offer.ok) {
    return offer;
  }

  const latestGrant =
    await getLatestOwnedCompositeGrant({
      offer,
      reportTemplateVersionId:
        input.reportTemplateVersionId,
    });

  if (!latestGrant) {
    return {
      ...offer,
      existingGrant: null,
      existingGrantTenantSlug: null,
      hasAccess: false,
    };
  }

  const hasFreshRequiredSourceSet =
    latestGrant.createdAt instanceof Date &&
    hasFreshRequiredCompositeSourceSet({
      grantCreatedAt: latestGrant.createdAt,
      grantMetadata: latestGrant.metadata,
      sourceCandidates: offer.sourceCandidates,
    });

  if (!hasFreshRequiredSourceSet) {
    return {
      ...offer,
      existingGrant: latestGrant,
      existingGrantTenantSlug:
        latestGrant.tenantSlug,
      hasAccess: true,
      hasFreshRequiredSourceSet: false as const,
    };
  }

  return {
    ...offer,
    existingGrant: null,
    existingGrantTenantSlug: null,
    hasAccess: false,
    hasFreshRequiredSourceSet: true as const,
  };
}
