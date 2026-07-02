// features/report-access/components/my-report-purchase-opportunities.tsx

import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  Lock,
  ShoppingCart,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { getMyReportPurchaseOpportunities } from "../api/my-report-purchase-opportunities.queries";
import { MySessionReportPurchaseCard } from "./my-session-report-purchase-card";

type PurchaseOpportunitiesData = Awaited<
  ReturnType<typeof getMyReportPurchaseOpportunities>
>;

type SessionReportOffer = PurchaseOpportunitiesData["sessionReportOffers"][number];
type CompositeOffer = PurchaseOpportunitiesData["compositeOffers"][number];
type ComparisonOffer = PurchaseOpportunitiesData["comparisonOffers"][number];

type TenantSessionReportOffer = SessionReportOffer & {
  tenantSlug: string;
};

type TenantCompositeOffer = CompositeOffer & {
  tenantSlug: string;
};

type AggregatedCompositeOffer = TenantCompositeOffer & {
  tenantSlugs: string[];
};

type TenantComparisonOffer = ComparisonOffer & {
  tenantSlug: string;
};

function normalizeTenantSlugs(tenantSlugs: string[]) {
  return Array.from(
    new Set(
      tenantSlugs
        .map((tenantSlug) => tenantSlug.trim())
        .filter((tenantSlug): tenantSlug is string => Boolean(tenantSlug)),
    ),
  );
}
function buildCompositeUnlockHref({
  reportTemplateVersionId,
  tenantSlugs,
  legacyTenantSlug,
}: {
  reportTemplateVersionId: string;
  tenantSlugs: string[];
  legacyTenantSlug?: string | null;
}) {
  const normalizedTenantSlugs = normalizeTenantSlugs([
    ...tenantSlugs,
    legacyTenantSlug ?? "",
  ]);

  const params = new URLSearchParams();

  /**
   * Legacy — starsze route/action nadal mogą czytać pojedynczy tenant.
   */
  const primaryTenantSlug =
    legacyTenantSlug?.trim() || normalizedTenantSlugs[0] || null;

  if (primaryTenantSlug) {
    params.set("tenant", primaryTenantSlug);
  }

  /**
   * Nowy model — pełna lista tenantów dostępnych dla composite.
   */
  if (normalizedTenantSlugs.length > 0) {
    params.set("tenants", normalizedTenantSlugs.join(","));
  }

  return (
    `/my/assessment/composite-reports/${reportTemplateVersionId}/unlock` +
    `?${params.toString()}`
  );
}
function formatMoney({
  amount,
  currency,
}: {
  amount: unknown;
  currency: string | null | undefined;
}) {
  const numberValue = Number(amount);

  if (!Number.isFinite(numberValue)) {
    return "—";
  }

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currency || "PLN",
  }).format(numberValue);
}

function StatusPill({
  status,
}: {
  status: "ready" | "missing_sources" | "missing_product" | "unavailable";
}) {
  const config = {
    ready: {
      label: "Gotowy do odblokowania",
      icon: <CheckCircle2 size={13} />,
      className:
        "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]",
    },
    missing_sources: {
      label: "Brakuje badań źródłowych",
      icon: <Lock size={13} />,
      className: "border-amber-200 bg-amber-50 text-amber-800",
    },
    missing_product: {
      label: "Brak produktu",
      icon: <TriangleAlert size={13} />,
      className: "border-amber-200 bg-amber-50 text-amber-800",
    },
    unavailable: {
      label: "Niedostępny",
      icon: <TriangleAlert size={13} />,
      className: "border-black/10 bg-[#f3f4f6] text-[#6b7280]",
    },
  }[status];

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.className,
      ].join(" ")}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

/**
 * Dla tego samego raportu specjalnego może pojawić się oferta z kilku tenantów.
 * Pokazujemy jedną, preferując:
 * 1. ofertę możliwą do kupienia,
 * 2. status ready,
 * 3. ofertę z mniejszą liczbą brakujących źródeł.
 */
function getSpecialOfferPriority(
  offer: TenantCompositeOffer | TenantComparisonOffer,
) {
  let priority = 0;

  if (offer.canBuy) {
    priority += 100;
  }

  if (offer.status === "ready") {
    priority += 50;
  }

  if (offer.status === "missing_sources") {
    priority += 20;
  }

  if ("missingRequiredSources" in offer) {
    priority -= offer.missingRequiredSources.length;
  }

  return priority;
}

function aggregateCompositeOffers(
  offers: TenantCompositeOffer[],
): AggregatedCompositeOffer[] {
  const byTemplateVersionId = new Map<
    string,
    AggregatedCompositeOffer
  >();

  for (const offer of offers) {
    const key = offer.reportTemplateVersion.id;
    const current = byTemplateVersionId.get(key);

    if (!current) {
      byTemplateVersionId.set(key, {
        ...offer,
        tenantSlugs: normalizeTenantSlugs([offer.tenantSlug]),
      });

      continue;
    }

    const mergedTenantSlugs = normalizeTenantSlugs([
      ...current.tenantSlugs,
      offer.tenantSlug,
    ]);

    /**
     * Jako reprezentanta wizualnego zachowujemy lepszą ofertę,
     * ale nie tracimy tenantów pozostałych ofert.
     */
    const preferredOffer =
      getSpecialOfferPriority(offer) >
      getSpecialOfferPriority(current)
        ? offer
        : current;

    byTemplateVersionId.set(key, {
      ...preferredOffer,
      tenantSlugs: mergedTenantSlugs,
    });
  }

  return Array.from(byTemplateVersionId.values());
}

function deduplicateComparisonOffers(
  offers: TenantComparisonOffer[],
): TenantComparisonOffer[] {
  const byTemplateVersionId = new Map<string, TenantComparisonOffer>();

  for (const offer of offers) {
    const key = offer.reportTemplateVersion.id;
    const current = byTemplateVersionId.get(key);

    if (
      !current ||
      getSpecialOfferPriority(offer) > getSpecialOfferPriority(current)
    ) {
      byTemplateVersionId.set(key, offer);
    }
  }

  return Array.from(byTemplateVersionId.values());
}

export async function MyReportPurchaseOpportunities({
  tenantSlugs,
}: {
  tenantSlugs: string[];
}) {
  const normalizedTenantSlugs = normalizeTenantSlugs(tenantSlugs);

  if (normalizedTenantSlugs.length === 0) {
    return (
      <section className="rounded-[2rem] border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
        <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-[#6b7280]">
          <ShoppingCart size={13} />
          Brak raportów do zakupu
        </div>

        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
          Nie znaleziono kontekstu organizacji
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
          Raporty pojawią się po przypisaniu zakończonych badań do właściwego
          tenanta.
        </p>
      </section>
    );
  }

  const tenantResults = await Promise.all(
    normalizedTenantSlugs.map(async (tenantSlug) => {
      const data = await getMyReportPurchaseOpportunities({
        tenantSlug,
      });

      return {
        tenantSlug,
        data,
      };
    }),
  );

  const sessionReportOffers: TenantSessionReportOffer[] =
    tenantResults.flatMap(({ tenantSlug, data }) =>
      data.sessionReportOffers.map((offer) => ({
        ...offer,
        tenantSlug: offer.tenantSlug || tenantSlug,
      })),
    );

  const allCompositeOffers: TenantCompositeOffer[] = tenantResults.flatMap(
    ({ tenantSlug, data }) =>
      data.compositeOffers.map((offer) => ({
        ...offer,
        tenantSlug: offer.tenantSlug || tenantSlug,
      })),
  );

  const allComparisonOffers: TenantComparisonOffer[] = tenantResults.flatMap(
    ({ tenantSlug, data }) =>
      data.comparisonOffers.map((offer) => ({
        ...offer,
        tenantSlug: offer.tenantSlug || tenantSlug,
      })),
  );

  const compositeOffers = aggregateCompositeOffers(allCompositeOffers);
  const comparisonOffers = deduplicateComparisonOffers(allComparisonOffers);

  const hasSessionOffers = sessionReportOffers.length > 0;
  const hasCompositeOffers = compositeOffers.length > 0;
  const hasComparisonOffers = comparisonOffers.length > 0;
  const hasSpecialOffers = hasCompositeOffers || hasComparisonOffers;

  console.log("MY_REPORT_PURCHASE_OPPORTUNITIES_RESULT", {
    tenantSlugs: normalizedTenantSlugs,
    sessionOffers: sessionReportOffers.map((offer) => ({
      tenantSlug: offer.tenantSlug,
      productId: offer.product.id,
      reportTemplateId: offer.reportTemplate.id,
      sessionsCount: offer.sessions.length,
    })),
compositeOffers: compositeOffers.map((offer) => ({
  tenantSlug: offer.tenantSlug,
  tenantSlugs: offer.tenantSlugs,
  reportTemplateVersionId: offer.reportTemplateVersion.id,
  status: offer.status,
  canBuy: offer.canBuy,
  unlockHref: buildCompositeUnlockHref({
    reportTemplateVersionId: offer.reportTemplateVersion.id,
    tenantSlugs: offer.tenantSlugs,
    legacyTenantSlug: offer.tenantSlug,
  }),
})),
    comparisonOffers: comparisonOffers.map((offer) => ({
      tenantSlug: offer.tenantSlug,
      reportTemplateVersionId: offer.reportTemplateVersion.id,
      status: offer.status,
      canBuy: offer.canBuy,
    })),
  });

  if (!hasSessionOffers && !hasSpecialOffers) {
    return (
      <section className="rounded-[2rem] border border-black/10 bg-white/70 p-6 shadow-sm backdrop-blur">
        <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-[#6b7280]">
          <ShoppingCart size={13} />
          Brak raportów do zakupu
        </div>

        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
          Nie masz teraz raportów oczekujących na odblokowanie
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
          Gdy zakończysz badanie i nie odblokujesz jeszcze raportu, pojawi się
          tutaj możliwość zakupu raportu dla tej konkretnej sesji. Raporty
          złożone pojawią się wtedy, gdy spełnisz ich warunki źródłowe.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-8">
{/*       <div className="flex flex-col gap-1">
        <div className="mb-1 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
          <Sparkles size={13} />
          Raporty do odblokowania
        </div>

        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
          Wybierz raport do zakupu
        </h2>

        <p className="max-w-2xl text-sm leading-6 text-[#6b7280]">
          Możesz kupić raport dla konkretnego zakończonego kwestionariusza albo
          odblokować raport złożony, który łączy kilka źródeł.
        </p>
      </div> */}

      {hasSessionOffers ? (
        <section className="space-y-4">
          <div>
                    <div className="mb-1 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                      <ShoppingCart size={13} />
                      Dostępne
                    </div>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
          Raporty do odblokowania
        </h2>

            <p className="mt-1 text-sm leading-6 text-[#6b7280]">
              Wybierz typ raportu, a następnie zakończone badanie, dla którego
              raport nie został jeszcze odblokowany.
            </p>
          </div>

          <div className="grid gap-3">
            {sessionReportOffers.map((offer) => (
              <MySessionReportPurchaseCard
                key={[
                  offer.tenantSlug,
                  offer.product.id,
                  offer.reportTemplate.id,
                ].join(":")}
                tenantSlug={offer.tenantSlug}
                product={offer.product}
                reportTemplate={offer.reportTemplate}
                reportTemplateVersion={offer.reportTemplateVersion}
                sessions={offer.sessions}
              />
            ))}
          </div>
        </section>
      ) : null}

      {hasSpecialOffers ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-base font-semibold tracking-[-0.02em] text-[#171717]">
              Raporty specjalne
            </h3>

            <p className="mt-1 text-sm leading-6 text-[#6b7280]">
              Raport specjalny jest dostępny po wypełnieniu określonej
              konfiguracji kwestionariuszy.
            </p>
          </div>

          <div className="grid gap-3">
            {compositeOffers.map((offer) => (
              <article
                key={`composite:${offer.reportTemplateVersion.id}`}
                className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
                        {offer.reportTemplate.name}
                      </h3>

                      <StatusPill status={offer.status} />
                    </div>

                    <p className="max-w-3xl text-sm leading-6 text-[#6b7280]">
                      {offer.reportTemplate.description ||
                        offer.product.description ||
                        offer.message}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#6b7280]">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-[#8b9099]" />
                        <span>Wersja:</span>
                        <span className="font-medium text-[#171717]">
                          {offer.reportTemplateVersion.name} (
                          {offer.reportTemplateVersion.version})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <ShoppingCart size={14} className="text-[#8b9099]" />
                        <span>Cena:</span>
                        <span className="font-medium text-[#171717]">
                          {formatMoney({
                            amount: offer.product.priceGross,
                            currency: offer.product.currency,
                          })}
                        </span>
                      </div>
                    </div>

                    {offer.missingRequiredSources.length > 0 ? (
                      <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                        <div className="font-semibold">
                          Aby odblokować ten raport, ukończ:
                        </div>

                        <ul className="mt-1 list-disc pl-5">
                          {offer.missingRequiredSources.map((source) => (
                            <li key={source.slot}>
                              {source.questionnaireName ||
                                source.questionnaireCode}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex md:justify-end">
                    {offer.canBuy ? (
                      <Button
                        asChild
                        className="w-full rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] md:w-auto"
                      >
<Link
  href={buildCompositeUnlockHref({
    reportTemplateVersionId: offer.reportTemplateVersion.id,
    tenantSlugs: offer.tenantSlugs,
    legacyTenantSlug: offer.tenantSlug,
  })}
>
  Odblokuj raport
</Link>
                      </Button>
                    ) : (
                      <Button
                        disabled
                        className="w-full rounded-full md:w-auto"
                        variant="outline"
                      >
                        Niedostępny
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {comparisonOffers.map((offer) => (
              <article
                key={`comparison:${offer.reportTemplateVersion.id}`}
                className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
                        {offer.reportTemplate.name ?? offer.product.name}
                      </h3>

                      <StatusPill status={offer.status} />
                    </div>

                    <p className="max-w-3xl text-sm leading-6 text-[#6b7280]">
                      {offer.reportTemplate.description ||
                        offer.product.description ||
                        offer.message}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#6b7280]">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-[#8b9099]" />
                        <span>Wersja:</span>
                        <span className="font-medium text-[#171717]">
                          {offer.reportTemplateVersion.name} (
                          {offer.reportTemplateVersion.version})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <ShoppingCart size={14} className="text-[#8b9099]" />
                        <span>Cena:</span>
                        <span className="font-medium text-[#171717]">
                          {formatMoney({
                            amount: offer.product.priceGross,
                            currency: offer.product.currency,
                          })}
                        </span>
                      </div>
                    </div>

                    {offer.canBuy ? (
                      <div className="rounded-[1.25rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.10)] px-4 py-3 text-sm leading-6 text-[#0f766e]">
                        Po odblokowaniu będziesz mógł sprawdzić dopasowanie z innym respondentem.
                      </div>
                    ) : (
                      <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                        {offer.message}
                      </div>
                    )}
                  </div>

                  <div className="flex md:justify-end">
                    {offer.canBuy ? (
                      <Button
                        asChild
                        className="w-full rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] md:w-auto"
                      >
                        <Link
                          href={`/my/assessment/special-reports/${offer.reportTemplateVersion.id}/unlock?tenant=${encodeURIComponent(
                            offer.tenantSlug,
                          )}&mode=comparison&product=${encodeURIComponent(
                            offer.product.id,
                          )}`}
                        >
                          Odblokuj raport
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        disabled
                        className="w-full rounded-full md:w-auto"
                        variant="outline"
                      >
                        Niedostępny
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}