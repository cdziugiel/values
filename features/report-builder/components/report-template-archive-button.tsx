"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import {
  archiveReportTemplateAction,
  type ReportTemplateAdminActionState,
} from "../api/report-template-admin.actions";

const initialState: ReportTemplateAdminActionState = {
  status: "idle",
  message: "",
};

export function ReportTemplateArchiveButton({
  reportTemplateId,
  templateName,
}: {
  reportTemplateId: string;
  templateName: string;
}) {
  const [state, formAction, isPending] = useActionState(
    archiveReportTemplateAction,
    initialState,
  );

  return (
    <div className="space-y-2">
      <form
        action={formAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            `Zarchiwizować template raportu "${templateName}"? Wszystkie jego wersje oraz aktywne przypięcia do kwestionariuszy zostaną dezaktywowane.`,
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input
          type="hidden"
          name="reportTemplateId"
          value={reportTemplateId}
        />

        <Button type="submit" variant="destructive" disabled={isPending}>
          {isPending ? "Archiwizowanie..." : "Archiwizuj template"}
        </Button>
      </form>

      {state.status === "error" ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}
    </div>
  );
}