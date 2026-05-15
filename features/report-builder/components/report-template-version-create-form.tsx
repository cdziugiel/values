"use client";

import { useActionState } from "react";

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
  questionnaireVersions: {
    id: string;
    version: string;
    name: string;
    status: string;
  }[];
};

export function ReportTemplateVersionCreateForm({
  reportTemplateId,
  questionnaireVersions,
}: ReportTemplateVersionCreateFormProps) {
  const [state, formAction, isPending] = useActionState(
    createReportTemplateVersionAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border bg-card p-5">
      <input type="hidden" name="reportTemplateId" value={reportTemplateId} />

      <div>
        <h2 className="text-lg font-semibold">Nowa wersja template’u</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Wersja raportu jest przypięta do konkretnej wersji kwestionariusza.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 md:col-span-1">
          <span className="text-sm font-medium">Wersja kwestionariusza</span>
          <select
            name="questionnaireVersionId"
            required
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Wybierz wersję</option>
            {questionnaireVersions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.name} · {version.version} · {version.status}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Numer wersji raportu</span>
          <Input name="version" required placeholder="v1" />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Nazwa wersji</span>
          <Input name="name" required placeholder="Wersja bazowa" />
        </label>
      </div>

      <label className="space-y-2 block">
        <span className="text-sm font-medium">Opis</span>
        <textarea
          name="description"
          className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Opis wersji raportu..."
        />
      </label>

      {state.status !== "idle" ? (
        <p
          className={
            state.status === "success"
              ? "text-sm text-green-700"
              : "text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Tworzenie..." : "Utwórz wersję raportu"}
      </Button>
    </form>
  );
}