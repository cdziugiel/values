"use client";

import { useActionState, useMemo } from "react";
import { CheckCircle2, CopyPlus, FileText, GitBranch, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  cloneQuestionnaireVersionAction,
  type QuestionnaireAdminActionState,
} from "../api/questionnaire-admin.actions";

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

type QuestionnaireVersionClonePanelProps = {
  sourceVersionId: string;
  sourceVersion: string;
  sourceName: string;
  sourceStatus: string;
};

function buildSuggestedVersion(sourceVersion: string) {
  const trimmed = sourceVersion.trim();

  const numeric = Number(trimmed);

  if (Number.isFinite(numeric)) {
    return String(Number((numeric + 0.1).toFixed(1)));
  }

  const match = trimmed.match(/^(.*?)(\d+)$/);

  if (match) {
    const prefix = match[1] ?? "";
    const numberPart = match[2] ?? "0";
    const nextNumber = Number(numberPart) + 1;

    return `${prefix}${String(nextNumber).padStart(numberPart.length, "0")}`;
  }

  return `${trimmed}-copy`;
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

        <span className="whitespace-pre-wrap">{message}</span>
      </div>
    </div>
  );
}

export function QuestionnaireVersionClonePanel({
  sourceVersionId,
  sourceVersion,
  sourceName,
  sourceStatus,
}: QuestionnaireVersionClonePanelProps) {
  const [state, formAction, isPending] = useActionState(
    cloneQuestionnaireVersionAction,
    initialState,
  );

  const suggestedVersion = useMemo(
    () => buildSuggestedVersion(sourceVersion),
    [sourceVersion],
  );

  const suggestedName = useMemo(() => {
    if (sourceName.toLowerCase().includes("kopia")) {
      return sourceName;
    }

    return `${sourceName} — nowa wersja`;
  }, [sourceName]);

  return (
    <section className="group relative overflow-hidden rounded-[2rem] hv-brand-card p-6 transition duration-300 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <form action={formAction} className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <input type="hidden" name="sourceVersionId" value={sourceVersionId} />

        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
            <GitBranch size={13} />
            Nowa wersja robocza
          </div>

          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
            Utwórz wersję na podstawie tej.
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280]">
            Skopiuje strony, itemy, wymiary oraz przypisania scoringowe do
            nowej wersji roboczej. Obecna wersja pozostanie bez zmian.
          </p>

          <div className="mt-5 rounded-[1.25rem] border border-black/10 bg-white/60 p-4 text-sm leading-6 text-[#6b7280]">
            <div className="mb-1 flex items-center gap-2 font-semibold text-[#171717]">
              <FileText size={15} />
              Źródło
            </div>
            Wersja {sourceVersion} · status: {sourceStatus}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#171717]">
                Oznaczenie nowej wersji
              </label>

              <Input
                name="version"
                defaultValue={suggestedVersion}
                placeholder="np. 1.1"
                required
                className="rounded-2xl border-black/10 bg-white font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#171717]">
                Nazwa nowej wersji
              </label>

              <Input
                name="name"
                defaultValue={suggestedName}
                placeholder="Nazwa wersji"
                required
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <label className="text-sm font-medium text-[#171717]">Opis</label>

            <Input
              name="description"
              placeholder="Krótki opis zmian planowanych w tej wersji"
              className="rounded-2xl border-black/10 bg-white"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-5 text-[#6b7280]">
              Nowa wersja zostanie utworzona jako robocza.
            </p>

            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
            >
              <CopyPlus size={16} />
              {isPending ? "Tworzenie..." : "Utwórz wersję roboczą"}
            </Button>
          </div>

          <ActionMessage status={state.status} message={state.message} />
        </div>
      </form>
    </section>
  );
}