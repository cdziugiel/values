"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    code: string;
    name: string;
    description: string | null;
    status: string;
  };
};

export function ReportTemplateEditForm({
  template,
}: ReportTemplateEditFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateReportTemplateAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input
        type="hidden"
        name="reportTemplateId"
        value={template.id}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2">
          <span className="text-sm font-medium">Kod</span>
          <Input name="code" defaultValue={template.code} required />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Nazwa</span>
          <Input name="name" defaultValue={template.name} required />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Status</span>
          <select
            name="status"
            defaultValue={template.status}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="draft">Roboczy</option>
            <option value="active">Aktywny</option>
            <option value="archived">Archiwalny</option>
          </select>
        </label>
      </div>

      <label className="space-y-2 block">
        <span className="text-sm font-medium">Opis</span>
        <textarea
          name="description"
          defaultValue={template.description ?? ""}
          className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
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
        {isPending ? "Zapisywanie..." : "Zapisz template"}
      </Button>
    </form>
  );
}