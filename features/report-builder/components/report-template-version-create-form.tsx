// features/report-builder/components/report-template-version-create-form.tsx

"use client";

import { useActionState } from "react";
import {
  CheckCircle2,
  FileText,
  Layers3,
  PlusCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  createReportTemplateVersionAction,
  type ReportTemplateAdminActionState,
} from "../api/report-template-admin.actions";



const initialState: ReportTemplateAdminActionState = {
  status: "idle",
  message: "",
};

type ReportTemplateVersionCreateFormProps = {
  reportTemplateId: string;
  reportTemplateKind: string;
  questionnaireVersions: {
    id: string;
    version: string;
    name: string;
    status: string;
  }[];
};

function isQuestionnaireVersionRequired(kind: string) {
  return kind === "personal";
}

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

        <span>{message}</span>
      </div>
    </div>
  );
}



export function ReportTemplateVersionCreateForm({
  reportTemplateId,
  reportTemplateKind,
  questionnaireVersions,
}: ReportTemplateVersionCreateFormProps) {
  const [state, formAction, isPending] = useActionState(
    createReportTemplateVersionAction,
    initialState,
  );
  const requiresQuestionnaireVersion =
    isQuestionnaireVersionRequired(reportTemplateKind);
  return (
    <section className="rounded-[2rem] hv-brand-card">
      <form
        action={formAction}
        className="grid gap-6 p-5 md:p-6 lg:grid-cols-[0.85fr_1.15fr]"
      >
        <input type="hidden" name="reportTemplateId" value={reportTemplateId} />

        <div className="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <PlusCircle size={20} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
              Nowa wersja raportu
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Utwórz wersję template’u raportu.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280]">
              Dla raportów personalnych wersja raportu jest przypięta do konkretnej
              wersji kwestionariusza. Raporty złożone, agregowane i porównawcze mogą
              korzystać z konfiguracji źródeł danych w builderze.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4">
            <div className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-[#0f766e]"
              />

              <p className="text-sm leading-6 text-[#0f766e]">
                Najpierw utwórz wersję, a następnie przejdź do buildera, gdzie
                zdefiniujesz strony A4, HTML, CSS, JS i wiązania danych.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          {requiresQuestionnaireVersion && questionnaireVersions.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-5 text-sm leading-6 text-[#6b7280]">
              Brak wersji kwestionariuszy, do których można przypisać wersję raportu.
              Raport personalny wymaga wersji kwestionariusza.
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-3">
                {requiresQuestionnaireVersion ? (
                  <label className="space-y-2 md:col-span-3">
                    <span className="text-sm font-medium text-[#171717]">
                      Wersja kwestionariusza
                    </span>

                    <select
                      name="questionnaireVersionId"
                      required
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                    >
                      <option value="">Wybierz wersję</option>
                      {questionnaireVersions.map((version) => (
                        <option key={version.id} value={version.id}>
                          {version.name} · {version.version} · {version.status}
                        </option>
                      ))}
                    </select>
                  </label>) : ""}

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[#171717]">
                    Numer wersji raportu
                  </span>

                  <Input
                    name="version"
                    required
                    placeholder="v1"
                    className="rounded-2xl border-black/10 bg-white font-mono text-sm"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-[#171717]">
                    Nazwa wersji
                  </span>

                  <Input
                    name="name"
                    required
                    placeholder="Wersja bazowa"
                    className="rounded-2xl border-black/10 bg-white"
                  />
                </label>

                <label className="block space-y-2 md:col-span-3">
                  <span className="text-sm font-medium text-[#171717]">
                    Opis
                  </span>

                  <textarea
                    name="description"
                    className="min-h-24 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                    placeholder="Opis wersji raportu..."
                  />
                </label>
              </div>

              {state.status !== "idle" ? (
                <div className="mt-5">
                  <ActionMessage status={state.status} message={state.message} />
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <FileText size={14} />
                  Builder stron A4 będzie dostępny po utworzeniu wersji.
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                >
                  <Layers3 size={16} />
                  {isPending ? "Tworzenie..." : "Utwórz wersję raportu"}
                </Button>
              </div>
            </>
          )}
        </div>
      </form>
    </section>
  );
}
