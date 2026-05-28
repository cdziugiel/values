// features/report-templates/components/report-template-create-form.tsx

"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  PlusCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import {
  AGGREGATE_SCOPE_OPTIONS,
  REPORT_TEMPLATE_FAMILY_OPTIONS,
  resolveReportTemplateKindFromUi,
  isPersonalReportTemplateKind,
  type AggregateReportScope,
  type ReportTemplateFamily,
} from "../constants/report-template-kind-options";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  createReportTemplateAction,
  type ReportTemplateAdminActionState,
} from "../api/report-template-admin.actions";
const initialState: ReportTemplateAdminActionState = {
  status: "idle",
  message: "",
};


function isQuestionnaireRequired(kind: string) {
  return kind === "personal";
}

type ReportTemplateCreateFormProps = {
  questionnaires: {
    id: string;
    code: string;
    name: string;
    status: string;
  }[];
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

export function ReportTemplateCreateForm({
  questionnaires,
}: ReportTemplateCreateFormProps) {
  const [state, formAction, isPending] = useActionState(
    createReportTemplateAction,
    initialState,
  );
const [kind, setKind] = useState("personal");
const [family, setFamily] = useState<ReportTemplateFamily>("personal");
const [aggregateScope, setAggregateScope] =
  useState<AggregateReportScope>("project");

const resolvedKind = useMemo(
  () =>
    resolveReportTemplateKindFromUi({
      family,
      aggregateScope,
    }),
  [family, aggregateScope],
);

const requiresQuestionnaire = isPersonalReportTemplateKind(resolvedKind);


  return (
    <section className="rounded-[2rem] hv-brand-card">
      <form
        action={formAction}
        className="grid gap-6 p-5 md:p-6 lg:grid-cols-[0.85fr_1.15fr]"
      >
        <div className="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <PlusCircle size={20} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
              Nowy template raportu
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Utwórz bazową definicję raportu.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280]">
              Template raportu jest kontenerem dla wersji raportu. Konkretne
              układy, strony i konfiguracje edytujesz później w builderze.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4">
            <div className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-[#0f766e]"
              />

<p className="text-sm leading-6 text-[#0f766e]">
  Typ template’u określa, czy raport dotyczy jednej osoby, kilku raportów
  personalnych, agregatu projektu, organizacji, zespołu czy porównania.
  Kwestionariusz jest wymagany tylko dla raportów personalnych.
</p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          {
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <input type="hidden" name="kind" value={resolvedKind} />
<label className="space-y-2 md:col-span-2">
  <span className="text-sm font-medium text-[#171717]">
    Rodzaj raportu
  </span>

  <select
    value={family}
    onChange={(event) => {
      setFamily(event.target.value as ReportTemplateFamily);
    }}
    className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
  >
    {REPORT_TEMPLATE_FAMILY_OPTIONS.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label} — {option.description}
      </option>
    ))}
  </select>
</label>
{family === "aggregate" ? (
  <label className="space-y-2 md:col-span-2">
    <span className="text-sm font-medium text-[#171717]">
      Zakres raportu zbiorczego
    </span>

    <select
      value={aggregateScope}
      onChange={(event) =>
        setAggregateScope(event.target.value as AggregateReportScope)
      }
      className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
    >
      {AGGREGATE_SCOPE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label} — {option.description}
        </option>
      ))}
    </select>

    <span className="block text-xs leading-5 text-[#6b7280]">
      Typ techniczny:{" "}
      <span className="font-mono text-[#171717]">{resolvedKind}</span>
    </span>
  </label>
) : null}
  {requiresQuestionnaire ? (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#171717]">
        Kwestionariusz
      </span>

      <select
        name="questionnaireId"
        required
        className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
      >
        <option value="">Wybierz kwestionariusz</option>
        {questionnaires.map((questionnaire) => (
          <option key={questionnaire.id} value={questionnaire.id}>
            {questionnaire.name} ({questionnaire.code})
          </option>
        ))}
      </select>

      {questionnaires.length === 0 ? (
        <span className="block text-xs leading-5 text-red-600">
          Brak kwestionariuszy. Raport personalny wymaga przypisania
          kwestionariusza.
        </span>
      ) : null}
    </label>
  ) : (
    <input type="hidden" name="questionnaireId" value="" />
  )}

  <label className={requiresQuestionnaire ? "space-y-2" : "space-y-2 md:col-span-2"}>
    <span className="text-sm font-medium text-[#171717]">
      Kod
    </span>
    <Input
      name="code"
      required
placeholder={
  resolvedKind === "personal_composite"
    ? "FULL_PERSONAL_REPORT"
    : resolvedKind === "project_aggregate"
      ? "PROJECT_COLLECTIVE_REPORT"
      : resolvedKind === "organization_aggregate"
        ? "ORGANIZATION_COLLECTIVE_REPORT"
        : resolvedKind === "team_aggregate"
          ? "TEAM_COLLECTIVE_REPORT"
          : resolvedKind === "comparison"
            ? "COMPARISON_REPORT"
            : "PERSONAL_REPORT"
}
      className="rounded-2xl border-black/10 bg-white font-mono text-sm"
    />
  </label>
</div>

              <label className="mt-5 block space-y-2">
                <span className="text-sm font-medium text-[#171717]">
                  Nazwa
                </span>
                <Input
                  name="name"
                  required
                  placeholder="Raport HUMANET Values"
                  className="rounded-2xl border-black/10 bg-white"
                />
              </label>

              <label className="mt-5 block space-y-2">
                <span className="text-sm font-medium text-[#171717]">
                  Opis
                </span>
                <textarea
                  name="description"
                  className="min-h-24 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                  placeholder="Opis template’u raportu..."
                />
              </label>

              {state.status !== "idle" ? (
                <div className="mt-5">
                  <ActionMessage status={state.status} message={state.message} />
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <FileText size={14} />
                  Wersje i układ raportu utworzysz po zapisaniu template’u.
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                >
                  <PlusCircle size={16} />
                  {isPending ? "Tworzenie..." : "Utwórz template raportu"}
                </Button>
              </div>
            </>
          }
        </div>
      </form>
    </section>
  );
}
