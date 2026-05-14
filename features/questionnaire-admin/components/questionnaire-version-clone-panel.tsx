"use client";

import { useActionState, useMemo } from "react";

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
    <section className="rounded-2xl border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">
          Utwórz nową wersję na podstawie tej
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Skopiuje strony, itemy, wymiary oraz przypisania scoringowe do nowej
          wersji roboczej. Obecna wersja pozostanie bez zmian.
        </p>
      </div>

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="sourceVersionId" value={sourceVersionId} />

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Oznaczenie nowej wersji
            </label>
            <Input
              name="version"
              defaultValue={suggestedVersion}
              placeholder="np. 1.1"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Nazwa nowej wersji
            </label>
            <Input
              name="name"
              defaultValue={suggestedName}
              placeholder="Nazwa wersji"
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Opis
          </label>
          <Input
            name="description"
            placeholder="Krótki opis zmian planowanych w tej wersji"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Tworzenie..." : "Utwórz wersję roboczą"}
          </Button>

          <span className="text-xs text-muted-foreground">
            Źródło: {sourceVersion} · status: {sourceStatus}
          </span>
        </div>
      </form>

      {state.status !== "idle" ? (
        <div
          className={
            state.status === "success"
              ? "mt-4 whitespace-pre-wrap rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
              : "mt-4 whitespace-pre-wrap rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {state.message}
        </div>
      ) : null}
    </section>
  );
}