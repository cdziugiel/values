// features/report-access/components/unlock-composite-report-access-page.tsx
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

import {
  getCompositeReportAccessOfferForCurrentUser,
} from "../api/report-access.queries";

import { UnlockCompositeReportAccessPlaceholderForm } from "./unlock-composite-report-access-placeholder-form";
import { getPersonalCompositeReport } from "@/features/assessment-results/api/personal-composite-report.queries";

type UnlockCompositeReportAccessPageProps = {
    tenantSlug: string;
    reportTemplateVersionId: string;
};

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
                        <div className="mt-1 text-xs leading-5 text-[#6b7280]">
                            {helper}
                        </div>
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

export async function UnlockCompositeReportAccessPage({
    tenantSlug,
    reportTemplateVersionId,
}: UnlockCompositeReportAccessPageProps) {

    const offer = await getCompositeReportAccessOfferForCurrentUser({
        tenantSlug,
        reportTemplateVersionId,
    });

    if (!offer.ok) {
        return (
            <CenteredState
                icon={<TriangleAlert size={14} />}
                eyebrow="HUMANET VALUES"
                title="Nie można odblokować raportu złożonego"
                description={offer.message}
            >
                <BrandLinkButton href="/my/assessment" variant="secondary">
                    <ArrowLeft size={16} />
                    Wróć do moich badań
                </BrandLinkButton>
            </CenteredState>
        );
    }
    const candidatePreview = await getPersonalCompositeReport({
        tenantSlug,
        respondentId: offer.respondent.id,
        reportTemplateVersionId,
        previewMode: true,
        sourceSelection: {
            mode: "latest_completed",
        },
    });

    const sourceCandidates =
        candidatePreview?.payload?.composite?.sources?.map((source: any) => ({
            slot: source.slot,
            label: source.label,
            questionnaireName: source.questionnaireName,
            candidates: source.candidates ?? [],
        })) ?? [];
    
    const product = offer.product;

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
                                Odblokuj raport złożony.
                            </h1>

                            <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                                Raport złożony łączy wyniki z kilku ukończonych kwestionariuszy.
                                Możesz kupić go tak jak każdy inny raport, o ile wymagane
                                badania źródłowe są już zakończone.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 md:min-w-56">
                            <BrandLinkButton href="/my/assessment" variant="secondary">
                                <ArrowLeft size={16} />
                                Wróć do moich badań
                            </BrandLinkButton>
                        </div>
                    </div>

                    <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-3 md:p-8">
                        <InfoCard
                            label="Raport"
                            value={offer.reportVersion.reportTemplateName}
                            helper={`Wersja: ${offer.reportVersion.reportTemplateVersionName} (${offer.reportVersion.reportTemplateVersion})`}
                            icon={<FileText size={18} />}
                        />

                        <InfoCard
                            label="Warunki"
                            value={
                                offer.eligibility.canRender
                                    ? "Spełnione"
                                    : "Brakuje źródeł"
                            }
                            helper={
                                offer.eligibility.canRender
                                    ? "Wymagane kwestionariusze są zakończone."
                                    : `Brakuje: ${offer.eligibility.missingRequiredSources
                                        .map((source) => source.questionnaireName)
                                        .join(", ")}`
                            }
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

                {!offer.eligibility.canRender ? (
                    <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900 shadow-sm">
                        <div className="flex gap-3">
                            <TriangleAlert size={20} className="mt-0.5 shrink-0" />
                            <div>
                                <h2 className="font-semibold">
                                    Brakuje wymaganych kwestionariuszy
                                </h2>
                                <p className="mt-1">
                                    Aby odblokować raport złożony, najpierw zakończ wymagane
                                    kwestionariusze źródłowe.
                                </p>
                            </div>
                        </div>
                    </section>
                ) : !product ? (
                    <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm leading-6 text-amber-900 shadow-sm">
                        <div className="flex gap-3">
                            <TriangleAlert size={20} className="mt-0.5 shrink-0" />
                            <div>
                                <h2 className="font-semibold">Brak produktu sprzedażowego</h2>
                                <p className="mt-1">
                                    Dla tego raportu złożonego nie ma jeszcze aktywnego produktu
                                    sprzedażowego.
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
                                    Na teraz przycisk poniżej tworzy opłacone zamówienie i aktywny
                                    dostęp do raportu złożonego.
                                </p>
                            </div>
                        </div>

                        <UnlockCompositeReportAccessPlaceholderForm
                            tenantSlug={tenantSlug}
                            reportTemplateVersionId={reportTemplateVersionId}
                            sourceCandidates={sourceCandidates}
                        />
                    </section>
                )}
            </div>
        </main>
    );
}