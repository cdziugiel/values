"use client";

import { useActionState } from "react";

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

type ReportTemplateCreateFormProps = {
  questionnaires: {
    id: string;
    code: string;
    name: string;
    status: string;
  }[];
};

export function ReportTemplateCreateForm({
  questionnaires,
}: ReportTemplateCreateFormProps) {
  const [state, formAction, isPending] = useActionState(
    createReportTemplateAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border bg-card p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Kwestionariusz</span>
          <select
            name="questionnaireId"
            required
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Wybierz kwestionariusz</option>
            {questionnaires.map((questionnaire) => (
              <option key={questionnaire.id} value={questionnaire.id}>
                {questionnaire.name} ({questionnaire.code})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Kod</span>
          <Input
            name="code"
            required
            placeholder="HUMANET_VALUES_DEFAULT"
          />
        </label>
      </div>

      <label className="space-y-2 block">
        <span className="text-sm font-medium">Nazwa</span>
        <Input
          name="name"
          required
          placeholder="Raport HUMANET Values"
        />
      </label>

      <label className="space-y-2 block">
        <span className="text-sm font-medium">Opis</span>
        <textarea
          name="description"
          className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Opis template’u raportu..."
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
        {isPending ? "Tworzenie..." : "Utwórz template raportu"}
      </Button>
    </form>
  );
}