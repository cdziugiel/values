// features/report-templates/components/report-template-edit-form.tsx

"use client";

import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, Save, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


import {
  AGGREGATE_SCOPE_OPTIONS,
  REPORT_TEMPLATE_FAMILY_OPTIONS,
  getAggregateScopeFromKind,
  getReportTemplateFamilyFromKind,
  resolveReportTemplateKindFromUi,
  isPersonalReportTemplateKind,
  type AggregateReportScope,
  type ReportTemplateFamily,
} from "../constants/report-template-kind-options";

import {
  updateReportTemplateAction,
  type ReportTemplateAdminActionState,
} from "../api/report-template-admin.actions";

const initialState: ReportTemplateAdminActionState = {
  status: "idle",
  message: "",
};

type ReportTemplateEditFormProps = {
  template: {
    id: string;
    questionnaireId: string | null;
    kind: string;
    code: string;
    name: string;
    description: string | null;
    status: string;
  };
  questionnaires?: {
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

function isQuestionnaireRequired(kind: string) {
  return kind === "personal";
}

export function ReportTemplateEditForm({
  template,
  questionnaires = [],
}: ReportTemplateEditFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateReportTemplateAction,
    initialState,
  );
const [family, setFamily] = useState<ReportTemplateFamily>(
  getReportTemplateFamilyFromKind(template.kind),
);

const [aggregateScope, setAggregateScope] =
  useState<AggregateReportScope>(getAggregateScopeFromKind(template.kind));

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
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="reportTemplateId" value={template.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="kind" value={resolvedKind} />
<label className="space-y-2">
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
        {option.label}
      </option>
    ))}
  </select>
</label>

{family === "aggregate" ? (
  <label className="space-y-2">
    <span className="text-sm font-medium text-[#171717]">
      Zakres raportu zbiorczego
    </span>

    <select
      value={aggregateScope}
      onChange={(event) => {
        setAggregateScope(event.target.value as AggregateReportScope);
      }}
      className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
    >
      {AGGREGATE_SCOPE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
) : null}

        {requiresQuestionnaire ? (
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#171717]">
              Kwestionariusz
            </span>

            <select
              name="questionnaireId"
              defaultValue={template.questionnaireId ?? ""}
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
          </label>
        ) : (
          <input type="hidden" name="questionnaireId" value="" />
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[#171717]">Kod</span>
          <Input
            name="code"
            defaultValue={template.code}
            required
            className="rounded-2xl border-black/10 bg-white font-mono text-sm"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-[#171717]">Nazwa</span>
          <Input
            name="name"
            defaultValue={template.name}
            required
            className="rounded-2xl border-black/10 bg-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-[#171717]">Status</span>
          <select
            name="status"
            defaultValue={template.status}
            className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
          >
            <option value="draft">Roboczy</option>
            <option value="active">Aktywny</option>
            <option value="archived">Archiwalny</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-sm font-medium text-[#171717]">Opis</span>
        <textarea
          name="description"
          defaultValue={template.description ?? ""}
          className="min-h-24 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
        />
      </label>

      <ActionMessage status={state.status} message={state.message} />

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
        >
          <Save size={16} />
          {isPending ? "Zapisywanie..." : "Zapisz template"}
        </Button>
      </div>
    </form>
  );
}
