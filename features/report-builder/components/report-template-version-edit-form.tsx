// features/report-builder/components/report-template-version-edit-form.tsx

"use client";

import { useActionState } from "react";
import {
  Archive,
  CheckCircle2,
  Code2,
  FileCode2,
  FileText,
  Globe2,
  Save,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  archiveReportTemplateVersionAction,
  publishReportTemplateVersionAction,
  updateReportTemplateVersionAction,
  type ReportTemplateAdminActionState,
} from "../api/report-template-admin.actions";

const initialState: ReportTemplateAdminActionState = {
  status: "idle",
  message: "",
};

function stringifyJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

type ReportTemplateVersionEditFormProps = {
version: {
  reportTemplateVersionId: string;
  reportTemplateId: string;
  reportTemplateKind?: string;
  questionnaireVersionId?: string | null;
  questionnaireVersion?: string | null;
  questionnaireVersionName?: string | null;
  questionnaireVersionStatus?: string | null;
  version: string;
  name: string;
  description: string | null;
  status: string;
  isDefault: boolean;
  globalCss: string | null;
  globalJs: string | null;
  pageSize: string;
  orientation: string;
  config: unknown;
  dataBindings: unknown;
};
};

function ActionMessage({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message: string;
}) {
  if (status === "idle") return null;

  return (
    <div
      className={[
        "rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
        status === "success"
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <div className="flex gap-2">
        {status === "success" ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        ) : (
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        )}

        <span className="whitespace-pre-wrap">{message}</span>
      </div>
    </div>
  );
}

function CodeTextarea({
  name,
  label,
  defaultValue,
  placeholder,
  minHeight = "min-h-40",
}: {
  name: string;
  label: string;
  defaultValue?: string;
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
        defaultValue={defaultValue ?? ""}
        className={`${minHeight} w-full rounded-2xl border border-black/10 bg-white px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40`}
        placeholder={placeholder}
        spellCheck={false}
      />
    </label>
  );
}

export function ReportTemplateVersionEditForm({
  version,
}: ReportTemplateVersionEditFormProps) {
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateReportTemplateVersionAction,
    initialState,
  );

  const [publishState, publishAction, isPublishPending] = useActionState(
    publishReportTemplateVersionAction,
    initialState,
  );

  const [archiveState, archiveAction, isArchivePending] = useActionState(
    archiveReportTemplateVersionAction,
    initialState,
  );

  return (
    <div className="space-y-6">
      <section className="group relative overflow-hidden rounded-[2rem] hv-brand-card p-6 transition duration-300 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

        <form action={updateAction} className="space-y-6">
          <input
            type="hidden"
            name="reportTemplateVersionId"
            value={version.reportTemplateVersionId}
          />

          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                <FileText size={13} />
                Metadane wersji
              </div>

              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                Ustawienia wersji raportu
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">
                Tutaj konfigurujesz nazwę, status, format strony oraz globalny
                kod używany przez wszystkie strony raportu.
              </p>
            </div>

            <div className="rounded-[1.25rem] border border-black/10 bg-white/70 px-4 py-3 text-sm text-[#6b7280] shadow-sm">
              <span className="font-semibold text-[#171717]">
                {version.version}
              </span>{" "}
              · {version.pageSize} ·{" "}
              {version.orientation === "portrait" ? "pionowo" : "poziomo"}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#171717]">
                  Numer wersji
                </span>

                <Input
                  name="version"
                  defaultValue={version.version}
                  required
                  className="rounded-2xl border-black/10 bg-white font-mono text-sm"
                />
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-[#171717]">
                  Nazwa
                </span>

                <Input
                  name="name"
                  defaultValue={version.name}
                  required
                  className="rounded-2xl border-black/10 bg-white"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#171717]">
                  Status
                </span>

                <select
                  name="status"
                  defaultValue={version.status}
                  className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                >
                  <option value="draft">Roboczy</option>
                  <option value="active">Aktywny</option>
                  <option value="archived">Archiwalny</option>
                </select>
              </label>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-[1.25rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4 text-sm">
              <input
                type="checkbox"
                name="isDefault"
                defaultChecked={version.isDefault}
                className="mt-1"
              />

              <span>
                <span className="font-semibold text-[#171717]">
                  Domyślna wersja dla tego template’u
                </span>

                <span className="mt-1 block text-xs leading-5 text-[#0f766e]">
                  Ta wersja będzie preferowana przy automatycznym wyborze
                  template’u raportu.
                </span>
              </span>
            </label>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium text-[#171717]">Opis</span>

              <textarea
                name="description"
                defaultValue={version.description ?? ""}
                className="min-h-24 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              />
            </label>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#171717]">
                  Rozmiar strony
                </span>

                <select
                  name="pageSize"
                  defaultValue={version.pageSize}
                  className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                >
                  <option value="A4">A4</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#171717]">
                  Orientacja
                </span>

                <select
                  name="orientation"
                  defaultValue={version.orientation}
                  className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                >
                  <option value="portrait">Pionowa</option>
                  <option value="landscape">Pozioma</option>
                </select>
              </label>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#171717]">
                <FileCode2 size={16} />
                Globalny kod
              </div>

              <CodeTextarea
                name="globalCss"
                label="Global CSS"
                defaultValue={version.globalCss ?? ""}
                minHeight="min-h-48"
                placeholder={`.report-page {\n  font-family: Inter, sans-serif;\n}`}
              />

              <div className="mt-4">
                <CodeTextarea
                  name="globalJs"
                  label="Global JS"
                  defaultValue={version.globalJs ?? ""}
                  minHeight="min-h-48"
                  placeholder={`console.log("report sandbox");`}
                />
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#171717]">
                <Globe2 size={16} />
                Konfiguracja danych
              </div>

              <CodeTextarea
                name="configText"
                label="Config JSON"
                defaultValue={stringifyJson(version.config)}
                minHeight="min-h-48"
              />

              <div className="mt-4">
                <CodeTextarea
                  name="dataBindingsText"
                  label="Data bindings JSON"
                  defaultValue={stringifyJson(version.dataBindings)}
                  minHeight="min-h-48"
                />
              </div>
            </div>
          </div>

          {updateState.status !== "idle" ? (
            <ActionMessage
              status={updateState.status}
              message={updateState.message}
            />
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs leading-5 text-[#6b7280]">
              <ShieldCheck size={14} />
              Zmiany metadanych nie zastępują edycji stron w builderze raportu.
            </div>

            <Button
              type="submit"
              disabled={isUpdatePending}
              className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
            >
              <Save size={16} />
              {isUpdatePending ? "Zapisywanie..." : "Zapisz wersję"}
            </Button>
          </div>
        </form>
      </section>

      <section className="group relative overflow-hidden rounded-[2rem] hv-brand-card p-6 transition duration-300 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
              <Sparkles size={13} />
              Publikacja
            </div>

            <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Publikacja i archiwizacja
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">
              Aktywna wersja może być przypinana do kwestionariuszy.
              Archiwizacja dezaktywuje jej istniejące przypięcia.
            </p>

            <div className="mt-4 space-y-3">
              <ActionMessage
                status={publishState.status}
                message={publishState.message}
              />

              <ActionMessage
                status={archiveState.status}
                message={archiveState.message}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <form action={publishAction}>
              <input
                type="hidden"
                name="reportTemplateVersionId"
                value={version.reportTemplateVersionId}
              />

              <Button
                type="submit"
                disabled={isPublishPending || version.status === "active"}
                className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
              >
                <Sparkles size={16} />
                {isPublishPending ? "Publikowanie..." : "Opublikuj"}
              </Button>
            </form>

            <form
              action={archiveAction}
              onSubmit={(event) => {
                const confirmed = window.confirm(
                  `Zarchiwizować wersję raportu "${version.name}"? Aktywne przypięcia do kwestionariuszy zostaną dezaktywowane.`,
                );

                if (!confirmed) {
                  event.preventDefault();
                }
              }}
            >
              <input
                type="hidden"
                name="reportTemplateVersionId"
                value={version.reportTemplateVersionId}
              />

              <Button
                type="submit"
                variant="outline"
                disabled={isArchivePending}
                className="rounded-full border-red-200 bg-red-50 text-red-700 shadow-sm hover:bg-red-100 hover:text-red-800"
              >
                <Archive size={16} />
                {isArchivePending ? "Archiwizowanie..." : "Archiwizuj"}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
