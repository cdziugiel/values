// features/report-templates/components/report-template-admin-list-page.tsx

import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  Layers3,
  PlusCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/shared/ui";

import { getReportTemplateListData } from "../api/report-template-admin.queries";

function statusLabel(status: string) {
  if (status === "active") return "Aktywny";
  if (status === "draft") return "Roboczy";
  if (status === "archived") return "Archiwalny";

  return status;
}

function getStatusBadgeClassName(status: string) {
  if (status === "active") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "draft") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "archived") {
    return "border-black/10 bg-[#f3f4f6] text-[#6b7280]";
  }

  return "border-black/10 bg-white/70 text-[#6b7280]";
}

function percent(value: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
}

function BrandButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Button
      asChild
      variant={variant === "primary" ? "default" : "outline"}
      className={
        variant === "primary"
          ? "rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
          : "rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
      }
    >
      <Link href={href}>{children}</Link>
    </Button>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
  progress,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
  progress?: number;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
            {label}
          </p>

          <div className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#171717]">
            {value}
          </div>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          {icon}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-[#6b7280]">{helper}</p>

      {typeof progress === "number" ? (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-[#6b7280]">Udział</span>
            <span className="font-semibold text-[#171717]">{progress}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf]"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}

function MiniMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: React.ReactNode;
  helper?: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
        {label}
      </div>

      <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#171717]">
        {value}
      </div>

      {helper ? (
        <div className="mt-1 text-xs leading-5 text-[#6b7280]">{helper}</div>
      ) : null}
    </div>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
      {children}
    </div>
  );
}

export async function ReportTemplateAdminListPage() {
  const templates = await getReportTemplateListData();

  const activeTemplatesCount = templates.filter(
    (template) => template.status === "active",
  ).length;

  const draftTemplatesCount = templates.filter(
    (template) => template.status === "draft",
  ).length;

  const versionsCount = templates.reduce(
    (sum, template) => sum + Number(template.versionsCount ?? 0),
    0,
  );

  const activeVersionsCount = templates.reduce(
    (sum, template) => sum + Number(template.activeVersionsCount ?? 0),
    0,
  );

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title="Template’y raportów"
          description="Zarządzaj template’ami raportów, ich wersjami oraz konfiguracją globalną."
          actions={
            <BrandButton href="/dashboard/report-templates/new">
              <PlusCircle size={16} />
              Utwórz template raportu
            </BrandButton>
          }
        />

        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <ShieldCheck size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Biblioteka raportów
                </span>
              </div>

              <h1 className="max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                Template’y raportów i ich wersje publikacyjne.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Twórz bazowe definicje raportów, rozwijaj wersje robocze i
                przypinaj stabilne wersje do konkretnych wersji kwestionariuszy.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <FileText size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    Wersje aktywne
                  </p>
                  <p className="mt-0.5 text-sm text-[#6b7280]">
                    {activeVersionsCount} / {versionsCount} wersji
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Template’y"
            value={templates.length}
            helper="Wszystkie definicje raportów."
            icon={<FileText size={20} />}
          />

          <MetricCard
            label="Aktywne"
            value={activeTemplatesCount}
            helper="Template’y dostępne do pracy."
            icon={<CheckCircle2 size={20} />}
            progress={percent(activeTemplatesCount, templates.length)}
          />

          <MetricCard
            label="Robocze"
            value={draftTemplatesCount}
            helper="Template’y w przygotowaniu."
            icon={<Sparkles size={20} />}
            progress={percent(draftTemplatesCount, templates.length)}
          />

          <MetricCard
            label="Wersje"
            value={versionsCount}
            helper="Wszystkie wersje template’ów raportów."
            icon={<Layers3 size={20} />}
            progress={percent(activeVersionsCount, versionsCount)}
          />
        </section>

        <section className="rounded-[2rem] hv-brand-card">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <FileText size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Lista template’ów
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Każdy template jest powiązany z kwestionariuszem i może mieć
                  wiele wersji raportu.
                </p>
              </div>
            </div>

            <Badge className="w-fit rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              {templates.length} template’ów
            </Badge>
          </div>

          <div className="px-5 pb-5 md:px-6 md:pb-6">
            {templates.length === 0 ? (
              <EmptyPanel>
                Brak template’ów raportów. Utwórz pierwszy template raportu,
                aby móc później przypiąć go do wersji kwestionariusza.
              </EmptyPanel>
            ) : (
              <div className="grid gap-4">
                {templates.map((template) => (
                  <article
                    key={template.reportTemplateId}
                    className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                            {template.name}
                          </h2>

                          <Badge
                            variant="outline"
                            className={`rounded-full ${getStatusBadgeClassName(
                              template.status,
                            )}`}
                          >
                            {statusLabel(template.status)}
                          </Badge>

                          <Badge
                            variant="outline"
                            className="rounded-full border-black/10 bg-white/70 font-mono text-[#6b7280]"
                          >
                            {template.code}
                          </Badge>
                        </div>

                        {template.description ? (
                          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">
                            {template.description}
                          </p>
                        ) : null}

                        <div className="mt-5 grid gap-3 md:grid-cols-4">
                          <MiniMetric
                            label="Kwestionariusz"
                            value={template.questionnaireName}
                            helper={template.questionnaireCode}
                          />

                          <MiniMetric
                            label="Wersje"
                            value={template.versionsCount}
                          />

                          <MiniMetric
                            label="Aktywne"
                            value={template.activeVersionsCount}
                          />

                          <MiniMetric
                            label="Robocze"
                            value={template.draftVersionsCount}
                          />
                        </div>
                      </div>

                      <BrandButton
                        href={`/dashboard/report-templates/${template.reportTemplateId}`}
                        variant="secondary"
                      >
                        Otwórz
                      </BrandButton>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
