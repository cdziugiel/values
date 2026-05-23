"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  CheckCircle2,
  FileText,
  Link2,
  Lock,
  Pencil,
  ShieldCheck,
  TriangleAlert,
  Unlink,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  assignReportTemplateToQuestionnaireVersionAction,
  removeReportTemplateFromQuestionnaireVersionAction,
  type QuestionnaireReportTemplateActionState,
} from "../api/questionnaire-report-template.actions";

type ActiveBinding = {
  bindingId: string;

  reportTemplateId: string;
  reportTemplateCode: string;
  reportTemplateName: string;

  reportTemplateVersionId: string;
  reportTemplateVersion: string;
  reportTemplateVersionName: string;
  reportTemplateVersionStatus: string;
} | null;

type AvailableTemplateVersion = {
  reportTemplateId: string;
  reportTemplateCode: string;
  reportTemplateName: string;

  reportTemplateVersionId: string;
  reportTemplateVersion: string;
  reportTemplateVersionName: string;
  reportTemplateVersionStatus: string;
};

type QuestionnaireReportTemplateSectionProps = {
  questionnaireVersionId: string;
  activeBinding: ActiveBinding;
  availableTemplateVersions: AvailableTemplateVersion[];
  canEdit: boolean;
};

const initialState: QuestionnaireReportTemplateActionState = {
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

export function QuestionnaireReportTemplateSection({
  questionnaireVersionId,
  activeBinding,
  availableTemplateVersions,
  canEdit,
}: QuestionnaireReportTemplateSectionProps) {
  const [assignState, assignAction, isAssignPending] = useActionState(
    assignReportTemplateToQuestionnaireVersionAction,
    initialState,
  );

  const [removeState, removeAction, isRemovePending] = useActionState(
    removeReportTemplateFromQuestionnaireVersionAction,
    initialState,
  );

  return (
    <section className="group relative overflow-hidden rounded-[2rem] hv-brand-card p-6 transition duration-300 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
            <FileText size={13} />
            Raport
          </div>

          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
            Raport dla tej wersji kwestionariusza
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">
            Przypisz template raportu do wersji kwestionariusza. Raport będzie
            renderowany na podstawie zamrożonego snapshotu wyników sesji.
          </p>
        </div>

        {activeBinding ? (
          <Badge className="w-fit rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            Raport przypisany
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="w-fit rounded-full border-black/10 bg-white/70 text-[#6b7280]"
          >
            Brak raportu
          </Badge>
        )}
      </div>

      {activeBinding ? (
        <div className="mt-6 rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
                Aktywny template
              </p>

              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                {activeBinding.reportTemplateName}
              </h3>

              <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                {activeBinding.reportTemplateCode} · wersja{" "}
                {activeBinding.reportTemplateVersion} ·{" "}
                {activeBinding.reportTemplateVersionName}
              </p>

              <div className="mt-3">
                <Badge
                  variant="outline"
                  className="rounded-full border-black/10 bg-white/70 text-[#6b7280]"
                >
                  {activeBinding.reportTemplateVersionStatus}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
              >
                <Link
                  href={`/dashboard/report-builder/${activeBinding.reportTemplateVersionId}`}
                >
                  <Pencil size={14} />
                  Edytuj template
                </Link>
              </Button>

              {canEdit ? (
                <form action={removeAction}>
                  <input
                    type="hidden"
                    name="questionnaireVersionId"
                    value={questionnaireVersionId}
                  />

                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="rounded-full border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    disabled={isRemovePending}
                  >
                    <Unlink size={14} />
                    {isRemovePending ? "Odpinanie..." : "Odepnij"}
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-5 text-sm leading-6 text-[#6b7280]">
          Do tej wersji kwestionariusza nie przypisano jeszcze template’u
          raportu.
        </div>
      )}

      {canEdit ? (
        <form
          action={assignAction}
          className="mt-5 grid gap-3 rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm md:grid-cols-[1fr_auto]"
        >
          <input
            type="hidden"
            name="questionnaireVersionId"
            value={questionnaireVersionId}
          />

          <select
            name="reportTemplateVersionId"
            className="h-11 rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
            defaultValue={activeBinding?.reportTemplateVersionId ?? ""}
          >
            <option value="">Wybierz template raportu...</option>

            {availableTemplateVersions.map((templateVersion) => (
              <option
                key={templateVersion.reportTemplateVersionId}
                value={templateVersion.reportTemplateVersionId}
              >
                {templateVersion.reportTemplateName} ·{" "}
                {templateVersion.reportTemplateVersion} ·{" "}
                {templateVersion.reportTemplateVersionName} ·{" "}
                {templateVersion.reportTemplateVersionStatus}
              </option>
            ))}
          </select>

          <Button
            type="submit"
            disabled={isAssignPending || availableTemplateVersions.length === 0}
            className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
          >
            <Link2 size={16} />
            {isAssignPending ? "Przypisywanie..." : "Przypisz raport"}
          </Button>

          {availableTemplateVersions.length === 0 ? (
            <p className="text-sm leading-6 text-[#6b7280] md:col-span-2">
              Nie ma jeszcze żadnych wersji template’ów raportów.
            </p>
          ) : null}
        </form>
      ) : (
        <div className="mt-5 rounded-[1.5rem] border border-black/10 bg-white/60 p-5 text-sm leading-6 text-[#6b7280]">
          <div className="mb-1 flex items-center gap-2 font-semibold text-[#171717]">
            <Lock size={15} />
            Przypisanie zablokowane
          </div>
          Ta wersja kwestionariusza nie jest w trybie draft. Przypisanie raportu
          jest zablokowane, aby zachować stabilność opublikowanej wersji.
        </div>
      )}

      <div className="mt-5 space-y-3">
        <ActionMessage
          status={assignState.status}
          message={assignState.message}
        />

        <ActionMessage
          status={removeState.status}
          message={removeState.message}
        />
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-black/10 bg-white/60 p-4 text-sm leading-6 text-[#6b7280]">
        <div className="mb-1 flex items-center gap-2 font-semibold text-[#171717]">
          <ShieldCheck size={15} />
          Zasada odtwarzalności
        </div>
        Raport powinien być powiązany z konkretną wersją kwestionariusza, aby
        wynik sesji można było odtworzyć po zmianach w narzędziu.
      </div>
    </section>
  );
}