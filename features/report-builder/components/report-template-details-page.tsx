// features/report-templates/components/report-template-details-page.tsx

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Layers3,
  Pencil,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/shared/ui";

import {
  getReportTemplateKindDescription,
  getReportTemplateKindLabel,
  isPersonalReportTemplateKind,
} from "../constants/report-template-kind-options";

import { getReportTemplateDetailsData } from "../api/report-template-admin.queries";
import { ReportTemplateVersionCreateForm } from "./report-template-version-create-form";
import { ReportTemplateEditForm } from "./report-template-edit-form";
import { ReportTemplateArchiveButton } from "./report-template-archive-button";

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

function orientationLabel(value: string) {
  return value === "portrait" ? "pionowo" : "poziomo";
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

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
      {children}
    </div>
  );
}

export async function ReportTemplateDetailsPage({
  reportTemplateId,
  showArchivedTemplateVersions = false,
}: {
  reportTemplateId: string;
  showArchivedTemplateVersions?: boolean;
}) {
  const data = await getReportTemplateDetailsData(reportTemplateId);

  if (!data) {
    return (
      <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <PageHeader
            title="Nie znaleziono template’u"
            description="Template raportu nie istnieje albo został zarchiwizowany."
          />

          <BrandButton href="/dashboard/report-templates" variant="secondary">
            <ArrowLeft size={16} />
            Wróć
          </BrandButton>
        </div>
      </div>
    );
  }
  const templateKindLabel = getReportTemplateKindLabel(data.template.kind);
  const templateKindDescription = getReportTemplateKindDescription(
    data.template.kind,
  );

  const isPersonalTemplate = isPersonalReportTemplateKind(data.template.kind);

  const templateScopeDescription = isPersonalTemplate
    ? `Template raportu personalnego dla kwestionariusza: ${data.template.questionnaireName ?? "nie przypisano"
    }.`
    : `${templateKindLabel}: ${templateKindDescription}`;
  const availableQuestionnaireVersions =
    data.availableQuestionnaireVersions.filter(
      (questionnaireVersion) => questionnaireVersion.status !== "archived",
    );

  const archivedTemplateVersionsCount = data.versions.filter(
    (version) => version.status === "archived",
  ).length;

  const visibleTemplateVersions = showArchivedTemplateVersions
    ? data.versions
    : data.versions.filter((version) => version.status !== "archived");
  const archivedQuestionnaireVersionsCount =
    data.availableQuestionnaireVersions.filter(
      (questionnaireVersion) => questionnaireVersion.status === "archived",
    ).length;

  const activeVersionsCount = visibleTemplateVersions.filter(
    (version) => version.status === "active",
  ).length;

  const draftVersionsCount = visibleTemplateVersions.filter(
    (version) => version.status === "draft",
  ).length;

  const defaultVersionsCount = visibleTemplateVersions.filter(
    (version) => version.isDefault,
  ).length;

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title={data.template.name}
          description={templateScopeDescription}
          actions={
            <div className="flex flex-wrap gap-2">
              <BrandButton
                href={
                  showArchivedTemplateVersions
                    ? `/dashboard/report-templates/${data.template.id}`
                    : `/dashboard/report-templates/${data.template.id}?archivedTemplateVersions=1`
                }
                variant="secondary"
              >
                {showArchivedTemplateVersions
                  ? "Ukryj archiwalne wersje"
                  : "Pokaż archiwalne wersje"}
              </BrandButton>

              <BrandButton href="/dashboard/report-templates" variant="secondary">
                <ArrowLeft size={16} />
                Wróć do template’ów
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
                  Template raportu
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                  {data.template.name}
                </h1>
                <Badge
                  variant="outline"
                  className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
                >
                  {templateKindLabel}
                </Badge>
                <Badge
                  variant="outline"
                  className={`rounded-full ${getStatusBadgeClassName(
                    data.template.status,
                  )}`}
                >
                  {statusLabel(data.template.status)}
                </Badge>
              </div>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                {data.template.description ??
                  "Zarządzaj ustawieniami template’u i jego wersjami publikacyjnymi."}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <FileText size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    {isPersonalTemplate ? "Kwestionariusz" : "Zakres danych"}
                  </p>
                  <p className="mt-0.5 text-sm text-[#6b7280]">
                    {isPersonalTemplate
                      ? data.template.questionnaireName ?? "Nie przypisano kwestionariusza"
                      : templateKindDescription}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-4 md:p-8">
            <MetricCard
              label="Kod"
              value={
                <span className="font-mono text-base">
                  {data.template.code}
                </span>
              }
              icon={<FileText size={18} />}
            />

            <MetricCard
              label="Wersje"
              value={data.versions.length}
              icon={<Layers3 size={18} />}
            />

            <MetricCard
              label="Aktywne"
              value={activeVersionsCount}
              icon={<CheckCircle2 size={18} />}
            />

            <MetricCard
              label="Domyślne"
              value={defaultVersionsCount}
              icon={<Sparkles size={18} />}
            />
          </div>
        </section>

        <section className="rounded-[2rem] hv-brand-card p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                <Pencil size={13} />
                Ustawienia
              </div>

              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                Ustawienia template’u
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">
                Edytuj dane bazowe template’u raportu. Wersje raportu i ich
                układ są zarządzane osobno.
              </p>
            </div>

            <ReportTemplateArchiveButton
              reportTemplateId={data.template.id}
              templateName={data.template.name}
            />
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
            <ReportTemplateEditForm template={data.template}
              questionnaires={data.questionnaires}
            />
          </div>
        </section>

        <ReportTemplateVersionCreateForm
          reportTemplateId={reportTemplateId}
          reportTemplateKind={data.template.kind}
          questionnaireVersions={data.availableQuestionnaireVersions}
        />

        <section className="rounded-[2rem] hv-brand-card">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <Layers3 size={20} />
              </div>

              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Wersje template’u
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Każda wersja template’u raportu jest powiązana z konkretną
                  wersją kwestionariusza.
                </p>
              </div>
            </div>

            <Badge className="w-fit rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              {visibleTemplateVersions.length} wersji
            </Badge>
          </div>

          <div className="px-5 pb-5 md:px-6 md:pb-6">
            {visibleTemplateVersions.length === 0 ? (
              <EmptyPanel>
                Brak wersji template’u. Utwórz pierwszą wersję raportu, aby
                można było przypiąć ją do wersji kwestionariusza.
              </EmptyPanel>
            ) : (
              <div className="grid gap-4">
                {visibleTemplateVersions.map((version) => (
                  <article
                    key={version.id}
                    className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                            {version.name}
                          </h3>

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

                          <Badge
                            variant="outline"
                            className="rounded-full border-black/10 bg-white/70 font-mono text-[#6b7280]"
                          >
                            {version.version}
                          </Badge>
                        </div>

                        <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                          <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                              Format
                            </div>
                            <div className="mt-1 font-medium text-[#171717]">
                              {version.pageSize} ·{" "}
                              {orientationLabel(version.orientation)}
                            </div>
                          </div>

                          <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                              Kwestionariusz
                            </div>
                            <div className="mt-1 font-medium text-[#171717]">
                              {version.questionnaireVersionName}
                            </div>
                            <div className="mt-0.5 text-xs text-[#6b7280]">
                              {version.questionnaireVersion}
                            </div>
                          </div>

                          <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                              Status
                            </div>
                            <div className="mt-1 font-medium text-[#171717]">
                              {statusLabel(version.status)}
                            </div>
                          </div>
                        </div>

                        {version.description ? (
                          <p className="mt-4 max-w-3xl text-sm leading-6 text-[#6b7280]">
                            {version.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <BrandButton
                          href={`/dashboard/report-templates/${data.template.id}/versions/${version.id}`}
                          variant="secondary"
                        >
                          Ustawienia
                        </BrandButton>

                        <BrandButton
                          href={`/dashboard/report-builder/${version.id}`}
                        >
                          Builder
                        </BrandButton>
                      </div>
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
