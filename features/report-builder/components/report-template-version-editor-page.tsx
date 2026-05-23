// features/report-builder/components/report-template-version-editor-page.tsx

import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  LayoutTemplate,
  Maximize2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/shared/ui";

import { getReportTemplateVersionEditorData } from "../api/report-template-admin.queries";
import { listReportPreviewSessionOptions } from "../api/report-preview-session.queries";
import { ReportTemplateVersionEditForm } from "./report-template-version-edit-form";
import { ReportRealDataPreviewPicker } from "./report-real-data-preview-picker";

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
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
            {label}
          </p>

          <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#171717]">
            {value}
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          {icon}
        </div>
      </div>
    </article>
  );
}

export async function ReportTemplateVersionEditorPage({
  reportTemplateId,
  reportTemplateVersionId,
}: {
  reportTemplateId: string;
  reportTemplateVersionId: string;
}) {
  const data = await getReportTemplateVersionEditorData({
    reportTemplateId,
    reportTemplateVersionId,
  });

  if (!data) {
    return (
      <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <PageHeader
            title="Nie znaleziono wersji raportu"
            description="Wersja template’u nie istnieje albo została zarchiwizowana."
          />

          <BrandButton
            href={`/dashboard/report-templates/${reportTemplateId}`}
            variant="secondary"
          >
            <ArrowLeft size={16} />
            Wróć
          </BrandButton>
        </div>
      </div>
    );
  }

  const { version } = data;

  const previewSessions = await listReportPreviewSessionOptions({
    reportTemplateVersionId: version.reportTemplateVersionId,
  });

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full ">
        <PageHeader
          title={`Wersja raportu: ${version.name}`}
          description={`${version.reportTemplateName} · ${version.version}`}
          actions={
            <div className="flex flex-wrap gap-2">
              <ReportRealDataPreviewPicker
                reportTemplateVersionId={version.reportTemplateVersionId}
                sessions={previewSessions}
              />

              <BrandButton
                href={`/dashboard/report-builder/${version.reportTemplateVersionId}`}
              >
                <ExternalLink size={16} />
                Otwórz builder
              </BrandButton>

              <BrandButton
                href={`/dashboard/report-templates/${reportTemplateId}`}
                variant="secondary"
              >
                <ArrowLeft size={16} />
                Wróć do template’u
              </BrandButton>
            </div>
          }
        />

        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <ShieldCheck size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Wersja template’u raportu
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                  {version.name}
                </h1>

                <Badge
                  variant="outline"
                  className={`rounded-full ${getStatusBadgeClassName(
                    version.status,
                  )}`}
                >
                  {statusLabel(version.status)}
                </Badge>

                {version.isDefault ? (
                  <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                    Domyślna
                  </Badge>
                ) : null}
              </div>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Konfiguruj metadane wersji, globalny CSS/JS i przechodź do
                buildera, gdzie edytujesz strony A4, sloty komponentów i
                warunki widoczności.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <LayoutTemplate size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    Template
                  </p>
                  <p className="mt-0.5 text-sm text-[#6b7280]">
                    {version.reportTemplateName}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-4 md:p-8">
            <MetricCard
              label="Status"
              value={statusLabel(version.status)}
              icon={<Sparkles size={18} />}
            />

            <MetricCard
              label="Format"
              value={version.pageSize}
              icon={<FileText size={18} />}
            />

            <MetricCard
              label="Orientacja"
              value={version.orientation === "portrait" ? "Pionowa" : "Pozioma"}
              icon={<Maximize2 size={18} />}
            />

            <MetricCard
              label="Kwestionariusz"
              value={
                <span>
                  {version.questionnaireVersionName}
                  <span className="mt-1 block font-mono text-xs font-normal text-[#6b7280]">
                    {version.questionnaireVersion}
                  </span>
                </span>
              }
              icon={<ShieldCheck size={18} />}
            />
          </div>
        </section>

        <ReportTemplateVersionEditForm version={version} />

        <section className="group relative overflow-hidden rounded-[2rem] hv-brand-card p-6 transition duration-300 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                <FileText size={13} />
                Treść raportu
              </div>

              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                Strony A4 i komponenty raportowe
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">
                Strony A4, HTML/CSS/JS, warunki widoczności i komponenty
                aplikacyjne edytujesz w builderze raportu.
              </p>
            </div>

            <BrandButton
              href={`/dashboard/report-builder/${version.reportTemplateVersionId}`}
            >
              <ExternalLink size={16} />
              Przejdź do buildera
            </BrandButton>
          </div>
        </section>
      </div>
    </div>
  );
}
