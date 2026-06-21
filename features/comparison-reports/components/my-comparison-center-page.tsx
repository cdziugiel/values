"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  FileText,
  KeyRound,
  Share2,
  ShoppingCart,
  Sparkles,
  UserRoundCheck,
  EyeOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import { MyComparisonReportPage } from "./my-comparison-report-page";
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

type ActiveFlow = "home" | "create-report" | "share-result";

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
      <p className="max-w-3xl text-sm leading-6 text-[#6b7280]">{description}</p>
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
  const [activeFlow, setActiveFlow] = useState<ActiveFlow>("home");
  const [showManagement, setShowManagement] = useState(false);

  const hasUnusedAccess = centerData.unusedAccesses?.length > 0;
  const hasGeneratedReports = centerData.generatedReports?.length > 0;
  const canConfigure = Boolean(productId && reportTemplateVersionId);

  if (activeFlow !== "home") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
            <Sparkles size={14} />
            HUMANET VALUES · Dopasowanie
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#171717]">
            {activeFlow === "create-report"
              ? "Utwórz raport dopasowania"
              : "Udostępnij swój wynik"}
          </h1>
        </div>

        {activeFlow === "create-report" ? (
          hasUnusedAccess && canConfigure ? (
            <MyComparisonReportPage
              questionnaires={questionnaires}
              productId={productId}
              reportTemplateVersionId={reportTemplateVersionId}
              initialOwnSessionId={initialOwnSessionId}
              mode="configure-only"
              onBack={() => setActiveFlow("home")}
            />
          ) : (
            <EmptyCard>
              <div className="flex flex-col gap-4">
                <p>Nie masz obecnie niewykorzystanego raportu dopasowania.</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setActiveFlow("home")}>
                    <ArrowLeft size={16} /> Wróć
                  </Button>
                  {centerData.purchaseHref ? (
                    <Button asChild className="bg-[#171717] text-white">
                      <Link href={centerData.purchaseHref}>
                        <ShoppingCart size={16} /> Kup raport dopasowania
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </EmptyCard>
          )
        ) : (
          <MyComparisonReportPage
            questionnaires={questionnaires}
            productId={productId}
            reportTemplateVersionId={reportTemplateVersionId}
            initialOwnSessionId={initialOwnSessionId}
            mode="token-only"
            onBack={() => setActiveFlow("home")}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 shadow-sm backdrop-blur">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-start md:p-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
              <Sparkles size={14} /> HUMANET VALUES
            </div>
            <h1 className="max-w-4xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
              Dopasowanie dwóch osób
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#6b7280]">
              Sprawdź, co łączy Wasze profile wartości, w czym możecie się uzupełniać oraz gdzie mogą pojawić się różnice.
            </p>
          </div>

          <Button asChild variant="outline" className="rounded-full">
            <Link href="/my/assessment?tab=reports">
              <ArrowLeft size={16} /> Wróć do raportów
            </Link>
          </Button>
        </div>
      </section>

      {hasGeneratedReports ? (
        <section className="space-y-4">
          <SectionHeader
            icon={<FileText size={13} />}
            eyebrow="Twoje raporty"
            title="Wróć do istniejącego dopasowania"
            description="Gotowe raporty są dostępne od razu — nie musisz ponownie przechodzić przez proces tworzenia."
          />

          <div className="grid gap-3 md:grid-cols-2">
            {centerData.generatedReports.map((report: any) => (
              <article
                key={report.id}
                className="rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur"
              >
                <h3 className="text-base font-semibold text-[#171717]">
                  {report.reportTemplateName}
                </h3>
                <p className="mt-2 text-sm text-[#6b7280]">
                  {report.leftLabel} ↔ {report.rightLabel}
                </p>
                <p className="mt-1 text-xs text-[#8b9099]">
                  Utworzono: {formatDate(report.usedAt ?? report.createdAt)}
                </p>
                <Button asChild className="mt-4 w-full rounded-full bg-[#171717] text-white">
                  <Link href={report.href}>
                    <FileText size={16} /> Otwórz raport
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        <SectionHeader
          icon={<BadgeCheck size={13} />}
          eyebrow="Nowe dopasowanie"
          title="Co chcesz zrobić?"
          description="Wybierz jedną ścieżkę. W kolejnych krokach pokażemy tylko informacje potrzebne do wykonania zadania."
        />

        {hasUnusedAccess ? (
          <div className="rounded-2xl border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.10)] px-4 py-3 text-sm text-[#0f766e]">
            Masz {centerData.unusedAccesses.length} niewykorzystany
            {centerData.unusedAccesses.length === 1 ? " raport" : "ch raportów"} dopasowania.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <article className="flex flex-col rounded-[1.75rem] border border-black/10 bg-white/80 p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              <UserRoundCheck size={20} />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#171717]">
              Mam kod od drugiej osoby
            </h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-[#6b7280]">
              Utwórz raport na podstawie swojego wyniku i kodu otrzymanego od drugiej osoby.
            </p>
            <Button
              type="button"
              className="mt-5 rounded-full bg-[#171717] text-white"
              onClick={() => setActiveFlow("create-report")}
            >
              <Sparkles size={16} /> Sprawdź dopasowanie
            </Button>
          </article>

          <article className="flex flex-col rounded-[1.75rem] border border-black/10 bg-white/80 p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              <Share2 size={20} />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#171717]">
              Chcę udostępnić mój wynik
            </h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-[#6b7280]">
              Utwórz bezpieczny kod i przekaż go osobie, z którą chcesz sprawdzić dopasowanie.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5 rounded-full"
              onClick={() => setActiveFlow("share-result")}
            >
              <KeyRound size={16} /> Udostępnij wynik
            </Button>
          </article>
        </div>

        {!hasUnusedAccess && centerData.purchaseHref ? (
          <Button asChild variant="outline" className="rounded-full">
            <Link href={centerData.purchaseHref}>
              <ShoppingCart size={16} /> Kup raport dopasowania
            </Link>
          </Button>
        ) : null}
      </section>

      <section className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          className="rounded-full"
          onClick={() => setShowManagement((value) => !value)}
        >
          <KeyRound size={16} />
          {showManagement ? "Ukryj zarządzanie kodami" : "Zarządzaj utworzonymi kodami"}
        </Button>

        {showManagement ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {includeInactiveTokens ? (
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/my/assessment/compare">
                    <EyeOff size={16} /> Ukryj nieaktywne
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/my/assessment/compare?showRevokedTokens=1">
                    Pokaż nieaktywne
                  </Link>
                </Button>
              )}
            </div>

            {comparisonShares.length ? (
              <div className="grid gap-3">
                {comparisonShares.map((share: any) => {
                  const isActive = share.isCurrentlyActive;
                  return (
                    <article
                      key={share.id}
                      className="rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm"
                    >
                      <div className="grid gap-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-[#171717]">
                                {share.label || "Kod dopasowania"}
                              </h3>
                              <span className={isActive
                                ? "rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-2.5 py-1 text-xs font-medium text-[#0f766e]"
                                : "rounded-full border border-black/10 bg-[#f3f4f6] px-2.5 py-1 text-xs font-medium text-[#6b7280]"}
                              >
                                {isActive ? "Aktywny" : "Nieaktywny"}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-[#6b7280]">
                              Utworzono: {formatDate(share.createdAt)}
                              {share.expiresAt ? ` · ważny do: ${formatDate(share.expiresAt)}` : ""}
                            </p>
                          </div>
                          {isActive ? (
                            <RevokeComparisonShareForm tenantSlug={tenantSlug} shareId={share.id} />
                          ) : null}
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
              <EmptyCard>Nie masz jeszcze utworzonych kodów dopasowania.</EmptyCard>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
