import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Layers3,
  Lock,
  Pencil,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { PageHeader } from "@/shared/ui";

import { getQuestionnaireVersionEditorData } from "../api/questionnaire-admin.queries";
import { getQuestionnaireReportTemplateAdminData } from "../api/questionnaire-report-template.queries";
import { QuestionnaireReportTemplateSection } from "../components/questionnaire-report-template-section";
import { QuestionnaireDimensionsEditor } from "./questionnaire-dimensions-editor";
import { QuestionnairePagesEditor } from "./questionnaire-pages-editor";
import { QuestionnaireVersionClonePanel } from "./questionnaire-version-clone-panel";
import { QuestionnaireVersionPublishPanel } from "./questionnaire-version-publish-panel";
import { QuestionnaireXlsxImportExportPanel } from "./questionnaire-xlsx-import-export-panel";

type QuestionnaireVersionEditorPageProps = {
  versionId: string;
};

function getStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Robocza";
    case "active":
      return "Opublikowana";
    case "archived":
      return "Archiwalna";
    default:
      return status;
  }
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

function ReadOnlyPanel() {
  return (
    <section className="rounded-[2rem] hv-brand-card p-6 md:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          <Lock size={20} />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
            Tryb tylko do odczytu
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
            Ta wersja nie jest już edytowalna.
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">
            Opublikowane lub archiwalne wersje powinny być traktowane jako
            stabilne. Aby wprowadzić zmiany, utwórz nową wersję roboczą na
            podstawie tej wersji.
          </p>
        </div>
      </div>
    </section>
  );
}

export async function QuestionnaireVersionEditorPage({
  versionId,
}: QuestionnaireVersionEditorPageProps) {
  await requireSuperAdmin();

  const data = await getQuestionnaireVersionEditorData(versionId);

  if (!data) {
    return (
      <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <PageHeader
            title="Nie znaleziono wersji"
            description="Wersja kwestionariusza nie istnieje albo została usunięta."
          />

          <BrandButton href="/dashboard/questionnaires" variant="secondary">
            <ArrowLeft size={16} />
            Wróć do kwestionariuszy
          </BrandButton>
        </div>
      </div>
    );
  }

  const isDraft = data.version.status === "draft";

  const reportTemplateData = await getQuestionnaireReportTemplateAdminData({
    questionnaireVersionId: versionId,
  });

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <PageHeader
          title="Edytor wersji"
          description="Zarządzanie strukturą kwestionariusza: stronami, itemami, wymiarami, scoringiem, publikacją i integracją z raportem."
          actions={
            <BrandButton href="/dashboard/questionnaires" variant="secondary">
              <ArrowLeft size={16} />
              Wróć do listy
            </BrandButton>
          }
        />

        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <ShieldCheck size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Wersja kwestionariusza
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                  {data.version.name}
                </h1>

                <Badge
                  variant="outline"
                  className={`rounded-full ${getStatusBadgeClassName(
                    data.version.status,
                  )}`}
                >
                  {getStatusLabel(data.version.status)}
                </Badge>
              </div>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Wersja {data.version.version}.{" "}
                {isDraft
                  ? "Możesz edytować strukturę, importować dane i przygotować wersję do publikacji."
                  : "Ta wersja jest stabilna lub archiwalna, dlatego edycja struktury jest zablokowana."}
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  {isDraft ? <Pencil size={20} /> : <Lock size={20} />}
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    Tryb pracy
                  </p>
                  <p className="mt-0.5 text-sm text-[#6b7280]">
                    {isDraft ? "Edycja aktywna" : "Tylko odczyt"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-4 md:p-8">
            <MetricCard
              label="Wersja"
              value={data.version.version}
              icon={<Layers3 size={18} />}
            />

            <MetricCard
              label="Strony"
              value={data.pages.length}
              icon={<FileText size={18} />}
            />

            <MetricCard
              label="Itemy"
              value={data.items.length}
              icon={<CheckCircle2 size={18} />}
            />

            <MetricCard
              label="Wymiary"
              value={data.dimensions.length}
              icon={<Layers3 size={18} />}
            />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <QuestionnaireVersionPublishPanel
            versionId={versionId}
            status={data.version.status}
          />

          <QuestionnaireXlsxImportExportPanel versionId={versionId} />
        </section>

        {data.version.status !== "draft" ? (
          <QuestionnaireVersionClonePanel
            sourceVersionId={versionId}
            sourceVersion={data.version.version}
            sourceName={data.version.name}
            sourceStatus={data.version.status}
          />
        ) : null}

        <QuestionnaireReportTemplateSection
          questionnaireVersionId={versionId}
          activeBinding={reportTemplateData.activeBinding}
          availableTemplateVersions={reportTemplateData.availableTemplateVersions}
          canEdit={isDraft}
        />

        {isDraft ? (
          <>
            <QuestionnaireDimensionsEditor
              versionId={versionId}
              dimensions={data.dimensions}
            />

            <QuestionnairePagesEditor
              versionId={data.version.id}
              pages={data.pages}
              dimensions={data.dimensions}
              items={data.items}
            />
          </>
        ) : (
          <ReadOnlyPanel />
        )}
      </div>
    </div>
  );
}