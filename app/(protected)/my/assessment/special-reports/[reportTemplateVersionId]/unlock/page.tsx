import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  FileText,
  GitCompare,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { getComparisonSpecialReportUnlockOffer } from "@/features/report-access/api/special-report-access.queries";
import { UnlockSpecialReportAccessForm } from "@/features/report-access/components/unlock-special-report-access-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    reportTemplateVersionId: string;
  }>;
  searchParams: Promise<{
    tenant?: string;
    mode?: string;
    product?: string;
  }>;
};

function formatMoney({
  amount,
  currency,
}: {
  amount: unknown;
  currency: string | null | undefined;
}) {
  const numberValue = Number(amount);

  if (!Number.isFinite(numberValue)) return "—";

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currency || "PLN",
  }).format(numberValue);
}

export default async function Page({ params, searchParams }: PageProps) {
  const { reportTemplateVersionId } = await params;
  const { tenant, mode, product } = await searchParams;

  if (mode !== "comparison" || !product) {
    notFound();
  }

  const offer = await getComparisonSpecialReportUnlockOffer({
    tenantSlug: tenant ?? "humanet",
    productId: product,
    reportTemplateVersionId,
  });

  if (!offer.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center hv-brand-surface px-4 py-10">
        <section className="w-full max-w-2xl rounded-[2rem] hv-brand-card p-6 md:p-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
            <TriangleAlert size={14} />
            <span className="hv-brand-eyebrow text-[0.68rem]">
              HUMANET VALUES
            </span>
          </div>

          <h1 className="text-3xl font-semibold tracking-[-0.045em] text-[#171717]">
            Nie można odblokować raportu
          </h1>

          <p className="mt-4 text-sm leading-7 text-[#6b7280]">
            {offer.message}
          </p>

          <div className="mt-6">
            <Link
              href="/my/assessment?tab=reports"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-5 text-sm font-semibold text-[#171717]"
            >
              <ArrowLeft size={16} />
              Wróć do raportów
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const compareHref = `/my/assessment/compare?product=${encodeURIComponent(
    offer.product.id,
  )}&reportTemplateVersionId=${encodeURIComponent(
    offer.reportTemplateVersion.id,
  )}`;

  return (
    <main className="min-h-screen hv-brand-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-start md:p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <GitCompare size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  HUMANET VALUES
                </span>
              </div>

              <h1 className="max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                Odblokuj raport porównawczy.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Po odblokowaniu przejdziesz do konfiguracji porównania, gdzie
                wybierzesz swój wynik bazowy i wkleisz token drugiej osoby.
              </p>
            </div>

            <div className="flex flex-col gap-2 md:min-w-56">
              <Link
                href="/my/assessment?tab=reports"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-5 text-sm font-semibold text-[#171717]"
              >
                <ArrowLeft size={16} />
                Wróć do raportów
              </Link>

              {offer.hasAccess ? (
                <Link
                  href={compareHref}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-semibold text-white"
                >
                  <GitCompare size={16} />
                  Przejdź do porównania
                </Link>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-3 md:p-8">
            <article className="rounded-[1.5rem] border border-black/10 bg-white/65 p-5 shadow-sm backdrop-blur">
              <FileText size={18} />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
                Raport
              </p>
              <div className="mt-2 text-lg font-semibold text-[#171717]">
                {offer.reportTemplate.name ?? offer.product.name}
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-black/10 bg-white/65 p-5 shadow-sm backdrop-blur">
              <ShieldCheck size={18} />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
                Status
              </p>
              <div className="mt-2 text-lg font-semibold text-[#171717]">
                {offer.hasAccess
                    ? "Masz niewykorzystany dostęp"
                    : "Do odblokowania"}
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-black/10 bg-white/65 p-5 shadow-sm backdrop-blur">
              <ReceiptText size={18} />
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
                Cena
              </p>
              <div className="mt-2 text-lg font-semibold text-[#171717]">
                {formatMoney({
                  amount: offer.product.priceGross,
                  currency: offer.product.currency,
                })}
              </div>
            </article>
          </div>
        </section>

        {!offer.hasAccess ? (
<section className="rounded-[2rem] hv-brand-card p-6 md:p-8">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
      <CreditCard size={19} />
    </div>

    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
        Placeholder płatności
      </p>

      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
        Kup dostęp do raportu porównawczego
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
        Każdy zakup odblokowuje jeden raport porównawczy. Po zakupie wybierzesz
        swój wynik bazowy i wkleisz token osoby, z którą chcesz się porównać.
      </p>
    </div>
  </div>

  <UnlockSpecialReportAccessForm
    tenantSlug={offer.tenantSlug}
    productId={offer.product.id}
    reportTemplateVersionId={offer.reportTemplateVersion.id}
  />
</section>
        ) : null}
      </div>
    </main>
  );
}