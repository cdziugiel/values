// features/report-templates/components/report-template-archive-button.tsx

"use client";

import { useActionState } from "react";
import { Archive, TriangleAlert } from "lucide-react";

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
    <div className="space-y-3">
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

        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          className="rounded-full border-red-200 bg-red-50 text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-100 hover:text-red-800"
        >
          <Archive size={14} />
          {isPending ? "Archiwizowanie..." : "Archiwizuj template"}
        </Button>
      </form>

      {state.status === "error" ? (
        <div className="rounded-[1rem] border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
          <div className="flex gap-2">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            <span>{state.message}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
