// features/report-access/components/unlock-report-access-page.tsx

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  FileText,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { requireSession } from "@/server/auth/require-session";

import {
  getActiveReportAccessGrantForSession,
  getReportAccessOfferForCompletedSession,
  getReportAccessOfferForCompletedSessionAndReportVersion,
} from "../api/report-access.queries";

import { UnlockReportAccessPlaceholderForm } from "./unlock-report-access-placeholder-form";

type UnlockReportAccessPageProps = {
  tenantSlug: string;
  sessionId: string;
  mode?: "standard" | "comparison";
  productId?: string | null;
  reportTemplateVersionId?: string | null;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
};

type ExtendedReportVersion = {
  reportTemplateId: string;
  reportTemplateVersionId: string;
  reportTemplateName?: string | null;
  reportTemplateCode?: string | null;
  reportTemplateVersionName?: string | null;
  reportTemplateVersion?: string | null;

  questionnaireName?: string | null;
  questionnaireVersionName?: string | null;
  questionnaireVersion?: string | null;
};


function buildUnlockedReportHref({
  mode,
  tenantSlug,
  sessionId,
  productId,
  reportTemplateVersionId,
  projectQuestionnaireId,
  questionnaireVersionId,
}: {
  mode?: "standard" | "comparison";
  tenantSlug: string;
  sessionId: string;
  productId?: string | null;
  reportTemplateVersionId: string;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  if (mode === "comparison") {
    return `/my/assessment/compare?product=${encodeURIComponent(
      productId ?? "",
    )}&reportTemplateVersionId=${encodeURIComponent(
      reportTemplateVersionId,
    )}&ownSessionId=${encodeURIComponent(sessionId)}`;
  }

  const params = new URLSearchParams({
    tenant: tenantSlug,
  });

  if (projectQuestionnaireId) {
    params.set("projectQuestionnaireId", projectQuestionnaireId);
  }

  if (questionnaireVersionId) {
    params.set("questionnaireVersionId", questionnaireVersionId);
  }

  return `/my/assessment/sessions/${sessionId}/report/${reportTemplateVersionId}?${params.toString()}`;
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

function formatReportVersionLabel(reportVersion: ExtendedReportVersion) {
  const name = reportVersion.reportTemplateVersionName;
  const version = reportVersion.reportTemplateVersion;

  if (name && version) {
    return `${name} (${version})`;
  }

  return name ?? version ?? "—";
}

function formatQuestionnaireLabel(reportVersion: ExtendedReportVersion) {
  const name = reportVersion.questionnaireName;
  const versionName = reportVersion.questionnaireVersionName;
  const version = reportVersion.questionnaireVersion;

  if (name && versionName && version) {
    return `${name} · ${versionName} (${version})`;
  }

  if (name && versionName) {
    return `${name} · ${versionName}`;
  }

  return name ?? versionName ?? version ?? "—";
}

function BrandLinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const className =
    variant === "primary"
      ? "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#171717] px-5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/50"
      : "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-5 text-sm font-semibold text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/50";

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function InfoCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white/65 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
            {label}
          </p>

          <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#171717]">
            {value}
          </div>

          {helper ? (
            <div className="mt-1 text-xs leading-5 text-[#6b7280]">{helper}</div>
          ) : null}
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          {icon}
        </div>
      </div>
    </article>
  );
}

function CenteredState({
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center hv-brand-surface px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full max-w-2xl rounded-[2rem] hv-brand-card p-6 md:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
          {icon}
          <span className="hv-brand-eyebrow text-[0.68rem]">{eyebrow}</span>
        </div>

        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.045em] text-[#171717] md:text-4xl">
          {title}
        </h1>

        <p className="mt-4 text-sm leading-7 text-[#6b7280]">{description}</p>

        <div className="mt-6 flex flex-wrap gap-2">{children}</div>
      </section>
    </main>
  );
}

export async function UnlockReportAccessPage({
  tenantSlug,
  sessionId,
  mode = "standard",
  productId = null,
  reportTemplateVersionId = null,
  projectQuestionnaireId = null,
  questionnaireVersionId = null,
}: UnlockReportAccessPageProps) {

  console.log("UNLOCK_REPORT_ACCESS_PAGE_PROPS", {
  tenantSlug,
  sessionId,
  mode,
  productId,
  reportTemplateVersionId,
  projectQuestionnaireId,
  questionnaireVersionId,
});


  const authSession = await requireSession();

const offer =
  mode === "comparison" && reportTemplateVersionId
    ? await getReportAccessOfferForCompletedSessionAndReportVersion({
        tenantSlug,
        sessionId,
        reportTemplateVersionId,
        expectedKind: "comparison",
      })
: await getReportAccessOfferForCompletedSession({
    tenantSlug,
    sessionId,
    projectQuestionnaireId,
    questionnaireVersionId,
  });

  if (!offer.ok) {
    return (
      <CenteredState
        icon={<TriangleAlert size={14} />}
        eyebrow="HUMANET VALUES"
        title="Nie można odblokować raportu"
        description={offer.message}
      >
        <BrandLinkButton href="/my/assessment" variant="secondary">
          <ArrowLeft size={16} />
          Wróć do moich badań
        </BrandLinkButton>
      </CenteredState>
    );
  }

  const reportVersion = offer.reportVersion as ExtendedReportVersion;

  const existingGrant =
    offer.existingGrant ??
    (await getActiveReportAccessGrantForSession({
      tenantSlug,
      sessionId,
      reportTemplateVersionId: reportVersion.reportTemplateVersionId,
      userId: authSession.user.id,
    }));

  if (existingGrant) {
    return (
      <CenteredState
        icon={<CheckCircle2 size={14} />}
        eyebrow="HUMANET VALUES"
        title="Raport jest już odblokowany"
        description="Masz aktywny dostęp do tego raportu. Możesz przejść bezpośrednio do podglądu albo wrócić do wyniku badania."
      >
<BrandLinkButton
  href={buildUnlockedReportHref({
    mode,
    tenantSlug,
    sessionId,
    productId: productId ?? offer.product?.id ?? null,
    reportTemplateVersionId: existingGrant.reportTemplateVersionId,
    projectQuestionnaireId,
    questionnaireVersionId,
  })}
>
  <FileText size={16} />
  {mode === "comparison" ? "Przejdź do porównania" : "Zobacz raport"}
</BrandLinkButton>

        <BrandLinkButton
          href={
  `/my/assessment/sessions/${sessionId}/completed?tenant=${encodeURIComponent(
    tenantSlug,
  )}` +
  (projectQuestionnaireId
    ? `&projectQuestionnaireId=${encodeURIComponent(projectQuestionnaireId)}`
    : "") +
  (questionnaireVersionId
    ? `&questionnaireVersionId=${encodeURIComponent(questionnaireVersionId)}`
    : "")
}
          variant="secondary"
        >
          <ArrowLeft size={16} />
          Wróć do wyniku
        </BrandLinkButton>
      </CenteredState>
    );
  }

  const product = offer.product;
  console.log("OFFER", offer)

  if (!offer.ok) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-6 py-10">
        <div className="rounded-[1.5rem] border border-black/10 bg-white/80 p-6">
          <h1 className="text-xl font-semibold">
            Raport niedostępny do odblokowania
          </h1>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen hv-brand-surface px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-start md:p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <LockKeyhole size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  HUMANET VALUES
                </span>
              </div>

<h1 className="max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
  {mode === "comparison"
    ? "Odblokuj raport porównawczy."
    : "Odblokuj raport."}
</h1>

<p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
  {mode === "comparison"
    ? "Ten raport umożliwia porównanie Twojego wyniku z wynikiem udostępnionym przez inną osobę za pomocą tokenu. Po odblokowaniu przejdziesz do konfiguracji porównania."
    : "Ten raport wymaga aktywnego dostępu. Na tym etapie używany jest placeholder płatności — kliknięcie przycisku zasymuluje opłacenie dostępu i zapisze dostęp do tej konkretnej wersji raportu."}
</p>
            </div>

            <div className="flex flex-col gap-2 md:min-w-56">
<BrandLinkButton
  href={
    `/my/assessment/sessions/${sessionId}/completed?tenant=${encodeURIComponent(
      tenantSlug,
    )}` +
    (projectQuestionnaireId
      ? `&projectQuestionnaireId=${encodeURIComponent(projectQuestionnaireId)}`
      : "") +
    (questionnaireVersionId
      ? `&questionnaireVersionId=${encodeURIComponent(questionnaireVersionId)}`
      : "")
  }
  variant="secondary"
>
                <ArrowLeft size={16} />
                Wróć do wyniku
              </BrandLinkButton>
            </div>
          </div>

          <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-3 md:p-8">
            <InfoCard
              label="Raport"
              value={
                reportVersion.reportTemplateName ??
                reportVersion.reportTemplateVersionName ??
                "Raport"
              }
              helper={`Wersja: ${formatReportVersionLabel(reportVersion)}`}
              icon={<FileText size={18} />}
            />

            <InfoCard
              label="Kwestionariusz"
              value={formatQuestionnaireLabel(reportVersion)}
              icon={<ShieldCheck size={18} />}
            />

            <InfoCard
              label="Cena"
              value={
                product
                  ? formatMoney({
                      amount: product.priceGross,
                      currency: product.currency,
                    })
                  : "—"
              }
              helper={product ? `Brutto, VAT ${product.vatRate ?? "—"}%` : null}
              icon={<ReceiptText size={18} />}
            />
          </div>
        </section>

        {!product ? (
          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900 shadow-sm">
            <div className="flex gap-3">
              <TriangleAlert size={20} className="mt-0.5 shrink-0" />
              <div>
                <h2 className="font-semibold">Brak produktu sprzedażowego</h2>
                <p className="mt-1">
                  Dla tego raportu nie ma jeszcze aktywnego produktu
                  sprzedażowego. Utwórz produkt raportowy w panelu
                  administracyjnym i ustaw jego status na active.
                </p>
              </div>
            </div>
          </section>
        ) : (
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
                  Symulacja zakupu dostępu
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Możesz odblokować raport płatnością placeholderową albo użyć kodu
                  rabatowego. Jeśli kod pokryje całą kwotę, raport zostanie odblokowany
                  bez przechodzenia przez płatność.
                </p>
              </div>
            </div>

<UnlockReportAccessPlaceholderForm
  tenantSlug={tenantSlug}
  sessionId={sessionId}
  mode={mode}
  productId={productId ?? product.id}
  reportTemplateVersionId={reportVersion.reportTemplateVersionId}
  projectQuestionnaireId={projectQuestionnaireId}
  questionnaireVersionId={questionnaireVersionId}
  originalAmountCents={Math.round(Number(product.priceGross ?? 0) * 100)}
  currency={product.currency ?? "PLN"}
/>
          </section>
        )}
      </div>
    </main>
  );
}
