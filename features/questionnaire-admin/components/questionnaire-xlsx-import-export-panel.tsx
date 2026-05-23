"use client";

import { useActionState } from "react";
import { CheckCircle2, Download, FileSpreadsheet, TriangleAlert, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  importQuestionnaireVersionXlsxAction,
  type QuestionnaireAdminActionState,
} from "../api/questionnaire-admin.actions";

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
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
        "mt-5 rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
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

        <span>{message}</span>
      </div>
    </div>
  );
}

export function QuestionnaireXlsxImportExportPanel({
  versionId,
}: {
  versionId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    importQuestionnaireVersionXlsxAction,
    initialState,
  );

  return (
    <section className="group relative overflow-hidden rounded-[2rem] hv-brand-card p-6 transition duration-300 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
            <FileSpreadsheet size={13} />
            XLSX
          </div>

          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
            Import i eksport struktury.
          </h2>

          <p className="mt-3 text-sm leading-6 text-[#6b7280]">
            Eksportuje i importuje strukturę wersji: strony, itemy, wymiary
            oraz przypisania scoringowe.
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <a href={`/dashboard/questionnaires/editor/${versionId}/export-xlsx`}>
            <Download size={16} />
            Eksportuj XLSX
          </a>
        </Button>
      </div>

      <form
        action={formAction}
        className="mt-6 rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm"
      >
        <input type="hidden" name="versionId" value={versionId} />

        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-1.5">
            <label
              htmlFor={`xlsx-file-${versionId}`}
              className="text-sm font-medium text-[#171717]"
            >
              Plik XLSX do importu
            </label>

            <input
              id={`xlsx-file-${versionId}`}
              type="file"
              name="file"
              accept=".xlsx"
              className="block w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm text-[#171717] file:mr-4 file:rounded-full file:border-0 file:bg-[#f3f4f6] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#171717] hover:file:bg-[#e5e7eb]"
              required
            />

            <p className="text-xs leading-5 text-[#6b7280]">
              Import nadpisze strukturę wersji zgodnie z logiką akcji
              serwerowej. Przed importem warto wykonać eksport bieżącej wersji.
            </p>
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
          >
            <Upload size={16} />
            {isPending ? "Importowanie..." : "Importuj XLSX"}
          </Button>
        </div>

        <ActionMessage status={state.status} message={state.message} />
      </form>
    </section>
  );
}