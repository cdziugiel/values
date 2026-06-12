import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  GitCompare,
  KeyRound,
  Plus,
  ReceiptText,
  Share2,
  ShoppingCart,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { MyComparisonReportPage } from "./my-comparison-report-page";
import { Copy, EyeOff } from "lucide-react";
import { RevokeComparisonShareForm } from "./revoke-comparison-token-form";
import { RenameComparisonShareForm } from "./rename-comparison-share-form";

type MyComparisonCenterPageProps = {
  tenantSlug: string;
  questionnaires: any[];
  centerData: any;
  comparisonShares: any[];
  includeInactiveTokens: boolean;
  productId: string | null;
  reportTemplateVersionId: string | null;
  initialOwnSessionId: string | null;
  activeAccessId: string | null;
};

function formatDate(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

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

function SectionHeader({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
        {icon}
        {eyebrow}
      </div>

      <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
        {title}
      </h2>

      <p className="max-w-3xl text-sm leading-6 text-[#6b7280]">
        {description}
      </p>
    </div>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
      {children}
    </div>
  );
}




export function MyComparisonCenterPage({
  tenantSlug,
  questionnaires,
  centerData,
  productId,
  comparisonShares,
  includeInactiveTokens,
  reportTemplateVersionId,
  initialOwnSessionId,
  activeAccessId,
}: MyComparisonCenterPageProps) {
  const hasUnusedAccess = centerData.unusedAccesses?.length > 0;
  const hasGeneratedReports = centerData.generatedReports?.length > 0;
  const canConfigure = Boolean(productId && reportTemplateVersionId);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 shadow-sm backdrop-blur">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-start md:p-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
              <GitCompare size={14} />
              HUMANET VALUES
            </div>

            <h1 className="max-w-4xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
              Porównania indywidualne
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-[#6b7280]">
              Tutaj możesz skonfigurować zakupione porównanie, wygenerować token
              dla innej osoby oraz wrócić do wcześniej wygenerowanych raportów.
            </p>
          </div>

          <div className="flex flex-col gap-2 md:min-w-60">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/my/assessment?tab=reports">
                <ArrowLeft size={16} />
                Wróć do raportów
              </Link>
            </Button>

            {centerData.purchaseHref ? (
              <Button
                asChild
                className="rounded-full bg-[#171717] text-white"
              >
                <Link href={centerData.purchaseHref}>
                  <ShoppingCart size={16} />
                  Kup porównanie
                </Link>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-3 md:p-8">
          <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5">
            <BadgeCheck size={18} />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
              Niewykorzystane
            </p>
            <div className="mt-2 text-2xl font-semibold text-[#171717]">
              {centerData.unusedAccesses?.length ?? 0}
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5">
            <FileText size={18} />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
              Wygenerowane
            </p>
            <div className="mt-2 text-2xl font-semibold text-[#171717]">
              {centerData.generatedReports?.length ?? 0}
            </div>
          </article>

          <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5">
            <ReceiptText size={18} />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
              Cena kolejnego
            </p>
            <div className="mt-2 text-2xl font-semibold text-[#171717]">
              {centerData.selectedProduct
                ? formatMoney({
                    amount: centerData.selectedProduct.priceGross,
                    currency: centerData.selectedProduct.currency,
                  })
                : "—"}
            </div>
          </article>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          icon={<BadgeCheck size={13} />}
          eyebrow="Aktywne dostępy"
          title="Zakupione porównania do skonfigurowania"
          description="Każdy zakupiony dostęp pozwala wygenerować jeden raport porównawczy. Jeżeli masz niewykorzystany dostęp, możesz od razu przejść do konfiguracji."
        />

        {hasUnusedAccess ? (
          <div className="grid gap-3">
            {centerData.unusedAccesses.map((access: any) => (
              <article
                key={access.id}
                className="rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur"
              >
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <h3 className="text-base font-semibold tracking-[-0.02em] text-[#171717]">
                      {access.reportTemplateName}
                    </h3>

                    <p className="mt-1 text-sm text-[#6b7280]">
                      Zakupiono: {formatDate(access.createdAt)}
                      {access.validUntil
                        ? ` · ważny do: ${formatDate(access.validUntil)}`
                        : ""}
                    </p>
                  </div>

                  {access.href ? (
                    <Button
                      asChild
                      className="rounded-full bg-[#171717] text-white"
                    >
                      <Link href={access.href}>
                        <GitCompare size={16} />
                        Przejdź do porównania
                      </Link>
                    </Button>
                  ) : (
                    <Button disabled variant="outline" className="rounded-full">
                      Brak konfiguracji
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyCard>
            Nie masz obecnie niewykorzystanego dostępu do raportu
            porównawczego. Kup porównanie, aby skonfigurować nowy raport.
          </EmptyCard>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader
          icon={<KeyRound size={13} />}
          eyebrow="Token"
          title="Udostępnij swój wynik innej osobie"
          description="Wygeneruj token dla swojego zakończonego badania. Druga osoba, która kupiła raport porównawczy, wklei ten token podczas konfiguracji."
        />

        <div className="rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur">
          <MyComparisonReportPage
            questionnaires={questionnaires}
            productId={productId}
            reportTemplateVersionId={reportTemplateVersionId}
            initialOwnSessionId={initialOwnSessionId}
            mode="token-only"
          />
        </div>
      </section>
<section className="space-y-4">
  <SectionHeader
    icon={<KeyRound size={13} />}
    eyebrow="Tokeny"
    title="Moje wygenerowane tokeny"
    description="Domyślnie pokazujemy tylko aktywne tokeny. Możesz nadać tokenowi nazwę albo unieważnić go, jeśli nie powinien już działać."
  />

  <div className="flex flex-wrap gap-2">
    {includeInactiveTokens ? (
      <Button asChild variant="outline" className="rounded-full">
        <Link href="/my/assessment/compare">
          <EyeOff size={16} />
          Ukryj unieważnione
        </Link>
      </Button>
    ) : (
      <Button asChild variant="outline" className="rounded-full">
        <Link href="/my/assessment/compare?showRevokedTokens=1">
          Pokaż unieważnione
        </Link>
      </Button>
    )}
  </div>

  {comparisonShares.length ? (
    <div className="grid gap-3">
      {comparisonShares.map((share: any) => {
        const isActive = share.isCurrentlyActive;

        const questionnaireVersionId =
          share.metadata?.questionnaireVersionId ?? null;

        return (
          <article
            key={share.id}
            className="rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur"
          >
            <div className="grid gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#171717]">
                      {share.label || "Token porównania"}
                    </h3>

                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                        isActive
                          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
                          : "border-black/10 bg-[#f3f4f6] text-[#6b7280]",
                      ].join(" ")}
                    >
                      {isActive ? "Aktywny" : share.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-[#6b7280]">
                    Utworzono: {formatDate(share.createdAt)}
                    {share.expiresAt
                      ? ` · ważny do: ${formatDate(share.expiresAt)}`
                      : ""}
                    {share.lastUsedAt
                      ? ` · ostatnio użyty: ${formatDate(share.lastUsedAt)}`
                      : ""}
                    {share.revokedAt
                      ? ` · unieważniony: ${formatDate(share.revokedAt)}`
                      : ""}
                  </p>

                  <p className="mt-1 text-xs text-[#8b9099]">
                    Sesja: {share.assessmentSessionId}
                    {questionnaireVersionId
                      ? ` · wersja kwestionariusza: ${questionnaireVersionId}`
                      : ""}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-[#8b9099]">
                    Pełny token jest widoczny tylko bezpośrednio po
                    wygenerowaniu. Ze względów bezpieczeństwa później można
                    zarządzać tokenem, ale nie można go ponownie odczytać.
                  </p>
                </div>

                {isActive ? (
                  <RevokeComparisonShareForm
                    tenantSlug={tenantSlug}
                    shareId={share.id}
                  />
                ) : (
                  <Button disabled variant="outline" className="rounded-full">
                    Nieaktywny
                  </Button>
                )}
              </div>

              <RenameComparisonShareForm
                tenantSlug={tenantSlug}
                shareId={share.id}
                initialLabel={share.label}
              />
            </div>
          </article>
        );
      })}
    </div>
  ) : (
    <EmptyCard>
      {includeInactiveTokens
        ? "Nie masz jeszcze wygenerowanych tokenów."
        : "Nie masz aktywnych tokenów. Wybierz swój wynik i utwórz token, aby udostępnić go drugiej osobie."}
    </EmptyCard>
  )}
</section>
{hasUnusedAccess && canConfigure ? (
  <section
    id="configure-comparison"
    className="scroll-mt-8 space-y-4"
  >
    <SectionHeader
      icon={<GitCompare size={13} />}
      eyebrow="Konfiguracja"
      title="Skonfiguruj zakupione porównanie"
      description={
        activeAccessId
          ? "Skonfiguruj wybrany aktywny dostęp. Wybierz swój wynik bazowy i wklej token drugiej osoby."
          : "Wybierz swój wynik bazowy i wklej token drugiej osoby. Po wygenerowaniu raportu ten dostęp zostanie oznaczony jako wykorzystany."
      }
    />

    <MyComparisonReportPage
      questionnaires={questionnaires}
      productId={productId}
      reportTemplateVersionId={reportTemplateVersionId}
      initialOwnSessionId={initialOwnSessionId}
      mode="configure-only"
    />
  </section>
) : null}

      <section className="space-y-4">
        <SectionHeader
          icon={<Share2 size={13} />}
          eyebrow="Historia"
          title="Wygenerowane porównania"
          description="Lista raportów porównawczych, które zostały już skonfigurowane i wygenerowane z zakupionych dostępów."
        />

        {hasGeneratedReports ? (
          <div className="grid gap-3">
            {centerData.generatedReports.map((report: any) => (
              <article
                key={report.id}
                className="rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur"
              >
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <h3 className="text-base font-semibold tracking-[-0.02em] text-[#171717]">
                      {report.reportTemplateName}
                    </h3>

                    <p className="mt-1 text-sm text-[#6b7280]">
                      {report.leftLabel} ↔ {report.rightLabel}
                    </p>

                    <p className="mt-1 text-xs text-[#8b9099]">
                      Wygenerowano:{" "}
                      {formatDate(report.usedAt ?? report.createdAt)}
                    </p>
                  </div>

                  <Button
                    asChild
                    className="rounded-full bg-[#171717] text-white"
                  >
                    <Link href={report.href}>
                      <FileText size={16} />
                      Zobacz raport
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyCard>
            Nie masz jeszcze wygenerowanych raportów porównawczych.
          </EmptyCard>
        )}
      </section>
    </div>
  );
}