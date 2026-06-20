// features/report-access/components/unlock-composite-report-access-placeholder-form.tsx
"use client";

import { useActionState, useMemo, useState } from "react";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  type ReportAccessActionState,
  unlockCompositeReportWithPlaceholderPaymentAction,
} from "../api/report-access.actions";

const initialState: ReportAccessActionState = {
  status: "idle",
  message: "",
};

type SourceCandidate = {
  slot: string;
  label: string;
  questionnaireName: string;
  questionnaireId: string;
  questionnaireCode: string;
  required: boolean;

  candidates: {
    tenantSlug: string;

    assessmentSessionId: string;
    assessmentProjectId: string | null;
    assessmentProjectName: string | null;

    projectQuestionnaireId: string | null;
    questionnaireId: string;
    questionnaireVersionId: string | null;

    snapshotId: string;

    completedAt: string | Date | null;
  }[];
};

type UnlockCompositeReportAccessPlaceholderFormProps = {
  tenantSlugs: string[];
  reportTemplateVersionId: string;
  sourceCandidates: SourceCandidate[];
};

function buildCandidateKey(candidate: {
  tenantSlug: string;
  assessmentSessionId: string;
  projectQuestionnaireId: string | null;
}) {
  return [
    candidate.tenantSlug,
    candidate.assessmentSessionId,
    candidate.projectQuestionnaireId ?? "",
  ].join(":");
}



export function UnlockCompositeReportAccessPlaceholderForm({
  tenantSlugs,
  reportTemplateVersionId,
  sourceCandidates,
}: UnlockCompositeReportAccessPlaceholderFormProps) {
  const [selectionMode, setSelectionMode] = useState<
    "latest_completed" | "same_project" | "manual"
  >("latest_completed");
  console.log("UnlockCompositeReportAccessPlaceholderForm", tenantSlugs)

  const [manualBySlot, setManualBySlot] = useState<Record<string, string>>({});

  const [state, formAction, isPending] = useActionState(
    unlockCompositeReportWithPlaceholderPaymentAction,
    initialState,
  );

const manualSelection = useMemo(() => {
  const bySlot: Record<
    string,
    {
      tenantSlug: string;
      assessmentSessionId: string;
      projectQuestionnaireId: string | null;
      questionnaireVersionId: string | null;
    }
  > = {};

  for (const source of sourceCandidates) {
    const selectedKey = manualBySlot[source.slot];

    if (!selectedKey) continue;

    const candidate = source.candidates.find(
      (item) => buildCandidateKey(item) === selectedKey,
    );

    if (!candidate) continue;

    bySlot[source.slot] = {
      tenantSlug: candidate.tenantSlug,
      assessmentSessionId: candidate.assessmentSessionId,
      projectQuestionnaireId:
        candidate.projectQuestionnaireId,
      questionnaireVersionId:
        candidate.questionnaireVersionId,
    };
  }

  return { bySlot };
}, [manualBySlot, sourceCandidates]);

  return (
    <form action={formAction} className="mt-6 space-y-5">
<input
  type="hidden"
  name="tenantSlug"
  value={tenantSlugs[0] ?? ""}
/>

{tenantSlugs.map((tenantSlug) => (
  <input
    key={tenantSlug}
    type="hidden"
    name="tenantSlugs"
    value={tenantSlug}
  />
))}
      <input
        type="hidden"
        name="reportTemplateVersionId"
        value={reportTemplateVersionId}
      />
      <input type="hidden" name="selectionMode" value={selectionMode} />
      <input
        type="hidden"
        name="manualSelection"
        value={JSON.stringify(manualSelection)}
      />

      <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
        <p className="text-sm font-semibold text-[#171717]">
          Wybór danych źródłowych raportu
        </p>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {[
            {
              value: "latest_completed",
              label: "Najnowsze ukończone",
              description:
                "Domyślnie wybiera najnowszą ukończoną sesję dla każdego kwestionariusza.",
            },
            {
              value: "same_project",
              label: "Ten sam projekt",
              description:
                "Wybiera źródła z jednego wspólnego projektu, jeśli taki zestaw istnieje.",
            },
            {
              value: "manual",
              label: "Ręcznie",
              description:
                "Pozwala wskazać konkretną sesję dla każdego źródła raportu.",
            },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectionMode(option.value as any)}
              className={
                selectionMode === option.value
                  ? "rounded-2xl border border-[#2dd4bf] bg-[rgba(45,212,191,0.14)] p-4 text-left shadow-sm"
                  : "rounded-2xl border border-black/10 bg-white p-4 text-left hover:bg-[#f9fafb]"
              }
            >
              <div className="text-sm font-semibold text-[#171717]">
                {option.label}
              </div>
              <div className="mt-1 text-xs leading-5 text-[#6b7280]">
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectionMode === "manual" ? (
        <div className="space-y-3 rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
          <p className="text-sm font-semibold text-[#171717]">
            Wybierz sesje źródłowe
          </p>

          {sourceCandidates.map((source) => (
            <label key={source.slot} className="block space-y-2">
              <span className="text-sm text-[#374151]">
                {source.label || source.questionnaireName}
              </span>

              <select
                value={manualBySlot[source.slot] ?? ""}
                onChange={(event) =>
                  setManualBySlot((current) => ({
                    ...current,
                    [source.slot]: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              >
                <option value="">Wybierz sesję</option>

{source.candidates.map((candidate) => {
  const candidateKey = buildCandidateKey(candidate);

  return (
    <option
      key={candidateKey}
      value={candidateKey}
    >
      {candidate.assessmentProjectName ?? "Badanie publiczne"} ·{" "}
      {candidate.tenantSlug} ·{" "}
      {candidate.completedAt
        ? new Date(candidate.completedAt).toLocaleString("pl-PL")
        : "bez daty ukończenia"}
    </option>
  );
})}
              </select>
            </label>
          ))}
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {state.message}
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
      >
        <CreditCard size={16} />
        {isPending ? "Odblokowywanie..." : "Kup i odblokuj raport złożony"}
      </Button>
    </form>
  );
}