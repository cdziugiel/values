// features/report-builder/components/report-template-version-editor.tsx

"use client";

import { useActionState, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Eye,
  FileCode2,
  FileText,
  LayoutTemplate,
  Plus,
  Save,
  Settings2,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  archiveReportTemplatePageAction,
  createReportTemplatePageAction,
  reorderReportTemplatePageAction,
  updateReportTemplatePageAction,
  updateReportTemplateVersionAction,
  type ReportBuilderActionState,
} from "../api/report-builder.actions";

import { ReportA4PreviewFrame } from "./report-a4-preview-frame";
import { PersonalCompositeSourcesPanel } from "./personal-composite-sources-panel";


const initialState: ReportBuilderActionState = {
  status: "idle",
  message: "",
};

type ReportTemplateVersionEditorProps = {
  reportTemplateVersion: any;
};

function stringifyJson(value: unknown, fallback: unknown) {
  try {
    return JSON.stringify(value ?? fallback, null, 2);
  } catch {
    return JSON.stringify(fallback, null, 2);
  }
}

function getPageSizeClass({
  pageSize,
  orientation,
}: {
  pageSize?: string | null;
  orientation?: string | null;
}) {
  if (pageSize !== "A4") {
    return "A4 portrait";
  }

  return orientation === "landscape" ? "A4 landscape" : "A4 portrait";
}

function ActionMessage({
  status,
  message,
  compact = false,
}: {
  status: "idle" | "success" | "error";
  message: string;
  compact?: boolean;
}) {
  if (status === "idle") return null;

  return (
    <div
      className={[
        compact
          ? "rounded-xl px-3 py-2 text-xs leading-5"
          : "rounded-[1.25rem] px-4 py-3 text-sm leading-6",
        "border",
        status === "success"
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <div className="flex gap-2">
        {status === "success" ? (
          <CheckCircle2 size={compact ? 14 : 16} className="mt-0.5 shrink-0" />
        ) : (
          <TriangleAlert size={compact ? 14 : 16} className="mt-0.5 shrink-0" />
        )}

        <span className="whitespace-pre-wrap">{message}</span>
      </div>
    </div>
  );
}

function CodeTextarea({
  name,
  label,
  value,
  defaultValue,
  onChange,
  placeholder,
  minHeight = "min-h-44",
}: {
  name: string;
  label: string;
  value?: string;
  defaultValue?: string;
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  minHeight?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-2 text-sm font-medium text-[#171717]">
        <Code2 size={14} className="text-[#8b9099]" />
        {label}
      </span>

      <textarea
        name={name}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={onChange}
        className={`${minHeight} w-full rounded-2xl border border-black/10 bg-white px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40`}
        spellCheck={false}
        placeholder={placeholder}
      />
    </label>
  );
}function MetricCard({
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
        <div className="min-w-0 flex-1">
          <p
            title={label}
            className="max-w-full truncate text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]"
          >
            {label}
          </p>

          <div
            title={typeof value === "string" ? value : undefined}
            className="mt-2 min-w-0 truncate text-lg font-semibold tracking-[-0.02em] text-[#171717]"
          >
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
function ReportTemplateVersionSettingsForm({
  reportTemplateVersion,
}: {
  reportTemplateVersion: any;
}) {
  const [state, formAction, isPending] = useActionState(
    updateReportTemplateVersionAction,
    initialState,
  );

  const [configText, setConfigText] = useState(
    stringifyJson(reportTemplateVersion.config, {}),
  );

  const [dataBindingsText, setDataBindingsText] = useState(
    stringifyJson(reportTemplateVersion.dataBindings, {}),
  );

  const [showConfigDetails, setShowConfigDetails] = useState(false);

  return (
    <section className="group relative overflow-hidden rounded-[2rem] hv-brand-card transition duration-300 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <button
        type="button"
        onClick={() => setShowConfigDetails((previous) => !previous)}
        className="flex w-full items-start justify-between gap-4 p-5 text-left transition hover:bg-white/40 md:p-6"
      >
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <Settings2 size={20} />
          </div>

          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
              Ustawienia globalne
            </div>

            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Ustawienia wersji raportu
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">
              Globalny CSS/JS działa na wszystkich stronach raportu. Kod JS
              będzie wykonywany dopiero w sandboxowanym podglądzie.
            </p>
          </div>
        </div>

        <span className="mt-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/70 text-[#6b7280]">
          {showConfigDetails ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
      </button>

      {showConfigDetails ? (
        <form action={formAction} className="space-y-5 border-t border-black/10 bg-white/35 p-5 md:p-6">
          <input
            type="hidden"
            name="reportTemplateVersionId"
            value={reportTemplateVersion.id}
          />

          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-2 md:col-span-1">
              <span className="text-sm font-medium text-[#171717]">Nazwa</span>
              <Input
                name="name"
                defaultValue={reportTemplateVersion.name}
                required
                className="rounded-2xl border-black/10 bg-white"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-[#171717]">Opis</span>
              <Input
                name="description"
                defaultValue={reportTemplateVersion.description ?? ""}
                placeholder="Opis wersji"
                className="rounded-2xl border-black/10 bg-white"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[#171717]">
                Orientacja
              </span>

              <select
                name="orientation"
                className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                defaultValue={reportTemplateVersion.orientation ?? "portrait"}
              >
                <option value="portrait">A4 pionowo</option>
                <option value="landscape">A4 poziomo</option>
              </select>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <CodeTextarea
                name="globalCss"
                label="Global CSS"
                defaultValue={reportTemplateVersion.globalCss ?? ""}
                minHeight="min-h-48"
                placeholder={".report-page-content { padding: 32px; }"}
              />
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <CodeTextarea
                name="globalJs"
                label="Global JS"
                defaultValue={reportTemplateVersion.globalJs ?? ""}
                minHeight="min-h-48"
                placeholder={"console.log('report context', window.__REPORT__);"}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <CodeTextarea
                name="config"
                label="Config JSON"
                value={configText}
                onChange={(event) => setConfigText(event.target.value)}
                minHeight="min-h-44"
              />
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <CodeTextarea
                name="dataBindings"
                label="Data bindings JSON"
                value={dataBindingsText}
                onChange={(event) => setDataBindingsText(event.target.value)}
                minHeight="min-h-44"
                placeholder={'{ "primaryScore": "scores.vMEME.TRADITION" }'}
              />
            </div>
          </div>

          <ActionMessage status={state.status} message={state.message} />

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
            >
              <Save size={16} />
              {isPending ? "Zapisywanie..." : "Zapisz ustawienia raportu"}
            </Button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

function CreateReportTemplatePageForm({
  reportTemplateVersionId,
}: {
  reportTemplateVersionId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createReportTemplatePageAction,
    initialState,
  );

  return (
    <section className="rounded-[2rem] hv-brand-card">
      <form action={formAction} className="p-5 md:p-6">
        <input
          type="hidden"
          name="reportTemplateVersionId"
          value={reportTemplateVersionId}
        />

        <div className="mb-4 flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <Plus size={20} />
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
              Dodaj stronę raportu
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
              Każda strona jest osobnym arkuszem A4 z własnym HTML, CSS, JS i
              opcjonalnymi wiązaniami komponentów.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#171717]">
              Tytuł strony
            </span>

            <Input
              name="title"
              placeholder="Np. Strona tytułowa"
              required
              className="rounded-2xl border-black/10 bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#171717]">Opis</span>

            <Input
              name="description"
              placeholder="Opcjonalny opis techniczny"
              className="rounded-2xl border-black/10 bg-white"
            />
          </label>

          <Button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
          >
            <Plus size={16} />
            {isPending ? "Dodawanie..." : "Dodaj stronę"}
          </Button>
        </div>

        {state.status !== "idle" ? (
          <div className="mt-4">
            <ActionMessage status={state.status} message={state.message} />
          </div>
        ) : null}
      </form>
    </section>
  );
}

function ReorderReportTemplatePageButtons({ pageId }: { pageId: string }) {
  const [_upState, upAction, isUpPending] = useActionState(
    reorderReportTemplatePageAction,
    initialState,
  );

  const [_downState, downAction, isDownPending] = useActionState(
    reorderReportTemplatePageAction,
    initialState,
  );

  return (
    <div className="flex gap-1">
      <form action={upAction}>
        <input type="hidden" name="reportTemplatePageId" value={pageId} />
        <input type="hidden" name="direction" value="up" />

        <Button
          type="submit"
          size="icon"
          variant="outline"
          disabled={isUpPending}
          className="h-9 w-9 rounded-full border-black/10 bg-white/70 text-[#171717] hover:bg-white"
          title="Przesuń wyżej"
        >
          <ArrowUp size={14} />
          <span className="sr-only">Przesuń wyżej</span>
        </Button>
      </form>

      <form action={downAction}>
        <input type="hidden" name="reportTemplatePageId" value={pageId} />
        <input type="hidden" name="direction" value="down" />

        <Button
          type="submit"
          size="icon"
          variant="outline"
          disabled={isDownPending}
          className="h-9 w-9 rounded-full border-black/10 bg-white/70 text-[#171717] hover:bg-white"
          title="Przesuń niżej"
        >
          <ArrowDown size={14} />
          <span className="sr-only">Przesuń niżej</span>
        </Button>
      </form>
    </div>
  );
}

function ArchiveReportTemplatePageButton({ page }: { page: any }) {
  const [state, formAction, isPending] = useActionState(
    archiveReportTemplatePageAction,
    initialState,
  );

  return (
    <div className="space-y-2">
      <form
        action={formAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            `Usunąć stronę raportu "${page.title}"?`,
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="reportTemplatePageId" value={page.id} />

        <Button
          type="submit"
          size="sm"
          variant="outline"
          disabled={isPending}
          className="rounded-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
        >
          <Trash2 size={14} />
          {isPending ? "Usuwanie..." : "Usuń"}
        </Button>
      </form>

      <ActionMessage status={state.status} message={state.message} compact />
    </div>
  );
}

function ReportTemplatePageEditor({
  page,
  reportTemplateVersion,
  selected,
  onSelect,
}: {
  page: any;
  reportTemplateVersion: any;
  selected: boolean;
  onSelect: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updateReportTemplatePageAction,
    initialState,
  );

  const [visibilityConditionText, setVisibilityConditionText] = useState(
    stringifyJson(page.visibilityCondition, null),
  );

  const [componentBindingsText, setComponentBindingsText] = useState(
    stringifyJson(page.componentBindings, []),
  );

  const [configText, setConfigText] = useState(stringifyJson(page.config, {}));
  const [previewWidth, setPreviewWidth] = useState(620);

  return (
    <article className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 shadow-sm backdrop-blur transition duration-300 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/70"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/70 text-[#6b7280]">
              {selected ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </span>

            <span className="font-semibold tracking-[-0.02em] text-[#171717]">
              {page.title}
            </span>

            <span className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1 font-mono text-xs text-[#6b7280]">
              {page.code}
            </span>

            <span className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1 text-xs text-[#6b7280]">
              kolejność: {page.orderIndex}
            </span>
          </div>

          {page.description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#6b7280]">
              {page.description}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-xs font-medium text-[#6b7280]">
          {selected ? "Zwiń" : "Edytuj"}
        </div>
      </button>

      {selected ? (
        <div className="border-t border-black/10 bg-white/35 p-5">
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="reportTemplatePageId" value={page.id} />

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                name="code"
                defaultValue={page.code}
                required
                className="rounded-2xl border-black/10 bg-white font-mono text-sm"
              />

              <Input
                name="title"
                defaultValue={page.title}
                required
                className="rounded-2xl border-black/10 bg-white"
              />

              <Input
                name="description"
                defaultValue={page.description ?? ""}
                placeholder="Opis techniczny"
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div
              className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_var(--preview-width)]"
              style={
                {
                  "--preview-width": `${previewWidth}px`,
                } as CSSProperties
              }
            >
              <div className="space-y-5">
                <div className="p-2">
                  <CodeTextarea
                    name="html"
                    label="HTML strony"
                    defaultValue={page.html ?? ""}
                    minHeight="min-h-72"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-2">
                    <CodeTextarea
                      name="css"
                      label="CSS strony"
                      defaultValue={page.css ?? ""}
                      minHeight="min-h-56"
                    />
                  </div>

                  <div className="p-2">
                    <CodeTextarea
                      name="js"
                      label="JS strony"
                      defaultValue={page.js ?? ""}
                      minHeight="min-h-56"
                      placeholder="console.log(window.__REPORT__);"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-2">
                    <CodeTextarea
                      name="visibilityCondition"
                      label="Warunek widoczności JSON"
                      value={visibilityConditionText}
                      onChange={(event) =>
                        setVisibilityConditionText(event.target.value)
                      }
                      minHeight="min-h-44"
                      placeholder={
                        '{ "type": "score", "category": "vMEME", "code": "TRADITION", "metric": "weightedMeanScore", "operator": "gte", "value": 2 }'
                      }
                    />
                  </div>

                  <div className="p-2">
                    <CodeTextarea
                      name="componentBindings"
                      label="Component bindings JSON"
                      value={componentBindingsText}
                      onChange={(event) =>
                        setComponentBindingsText(event.target.value)
                      }
                      minHeight="min-h-44"
                      placeholder={
                        '[{ "slot": "chart-1", "component": "DimensionBarChart", "props": { "category": "vMEME" } }]'
                      }
                    />
                  </div>

                  <div className="p-2">
                    <CodeTextarea
                      name="config"
                      label="Config JSON"
                      value={configText}
                      onChange={(event) => setConfigText(event.target.value)}
                      minHeight="min-h-44"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#171717]">
                      <Eye size={16} />
                      Podgląd A4
                    </div>

                    <select
                      value={previewWidth}
                      onChange={(event) =>
                        setPreviewWidth(Number(event.target.value))
                      }
                      className="h-9 rounded-2xl border border-black/10 bg-white px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                    >
                      <option value={420}>Wąski · 420 px</option>
                      <option value={520}>Średni · 520 px</option>
                      <option value={620}>Duży · 620 px</option>
                      <option value={760}>Pełniejszy · 760 px</option>
                      <option value={900}>Szeroki · 900 px</option>
                    </select>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-[#6b7280]">
                    Zwiększ szerokość, jeśli chcesz widzieć całą stronę A4
                    bardziej czytelnie.
                  </p>
                </div>

                <ReportA4PreviewFrame
                  page={page}
                  reportTemplateVersion={reportTemplateVersion}
                  pageSizeClass={getPageSizeClass({
                    pageSize: reportTemplateVersion.pageSize,
                    orientation: reportTemplateVersion.orientation,
                  })}
                />
              </div>
            </div>

            <ActionMessage status={state.status} message={state.message} />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                disabled={isPending}
                className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
              >
                <Save size={16} />
                {isPending ? "Zapisywanie..." : "Zapisz stronę"}
              </Button>
            </div>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-black/10 pt-4">
            <ReorderReportTemplatePageButtons pageId={page.id} />

            <ArchiveReportTemplatePageButton page={page} />
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function ReportTemplateVersionEditor({
  reportTemplateVersion,
}: ReportTemplateVersionEditorProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    reportTemplateVersion.pages?.[0]?.id ?? null,
  );

  const pages = useMemo(
    () =>
      [...(reportTemplateVersion.pages ?? [])].sort(
        (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
      ),
    [reportTemplateVersion.pages],
  );

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <LayoutTemplate size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Builder raportu
                </span>
              </div>

              <h1 className="text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                {reportTemplateVersion.name}
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Edytuj strony A4, globalne ustawienia, HTML/CSS/JS, warunki
                widoczności i wiązania komponentów raportowych.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <FileText size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    Strony raportu
                  </p>
                  <p className="mt-0.5 text-sm text-[#6b7280]">
                    {pages.length} arkuszy A4
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-4 md:p-8">
            <MetricCard
              label="Szablon"
              value={reportTemplateVersion.reportTemplateCode}
              icon={<LayoutTemplate size={18} />}
            />

            <MetricCard
              label="Status"
              value={reportTemplateVersion.status}
              icon={<Settings2 size={18} />}
            />

            <MetricCard
              label="Format"
              value={`${reportTemplateVersion.pageSize ?? "A4"} · ${
                reportTemplateVersion.orientation ?? "portrait"
              }`}
              icon={<FileCode2 size={18} />}
            />

            <MetricCard
              label="Strony"
              value={pages.length}
              icon={<FileText size={18} />}
            />
          </div>
        </section>
{reportTemplateVersion.reportTemplateKind === "personal_composite" ? (
  <PersonalCompositeSourcesPanel
    reportTemplateVersionId={reportTemplateVersion.id}
    dataBindings={reportTemplateVersion.dataBindings}
    availableQuestionnaires={
      reportTemplateVersion.availableQuestionnaires ?? []
    }
  />
) : null}
        <ReportTemplateVersionSettingsForm
          reportTemplateVersion={reportTemplateVersion}
        />

        <CreateReportTemplatePageForm
          reportTemplateVersionId={reportTemplateVersion.id}
        />

        <section className="space-y-5">
          <div className="rounded-[2rem] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <FileText size={20} />
              </div>

              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                  Strony raportu
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">
                  Każda strona jest edytowana jako osobny arkusz A4. Możesz
                  używać HTML, CSS, JS oraz wiązać sloty z komponentami
                  aplikacji.
                </p>
              </div>
            </div>
          </div>

          {pages.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
              Ten raport nie ma jeszcze stron.
            </div>
          ) : (
            <div className="space-y-4">
              {pages.map((page) => (
                <ReportTemplatePageEditor
                  key={page.id}
                  page={page}
                  reportTemplateVersion={reportTemplateVersion}
                  selected={selectedPageId === page.id}
                  onSelect={() =>
                    setSelectedPageId((previous) =>
                      previous === page.id ? null : page.id,
                    )
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
