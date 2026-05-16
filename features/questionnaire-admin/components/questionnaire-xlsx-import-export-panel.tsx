// features/questionnaire-admin/components/questionnaire-xlsx-import-export-panel.tsx

"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
    importQuestionnaireVersionXlsxAction,
    type QuestionnaireAdminActionState,
} from "../api/questionnaire-admin.actions";

const initialState: QuestionnaireAdminActionState = {
    status: "idle",
    message: "",
};

export function QuestionnaireXlsxImportExportPanel({
    versionId,
}: {
    versionId: string;
}) {
    const [state, formAction, isPending] = useActionState(
        importQuestionnaireVersionXlsxAction,
        initialState,
    );

    return (
        <div className="space-y-3 rounded-xl border bg-card p-4">
            <div>
                <h3 className="text-sm font-medium">Import / export XLSX</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                    Eksportuje i importuje strukturę wersji: strony, itemy, wymiary oraz przypisania scoringowe.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                    <a href={`/dashboard/questionnaires/editor/${versionId}/export-xlsx`}>
                        Eksportuj XLSX
                    </a>
                </Button>

                <form action={formAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="versionId" value={versionId} />

                    <input
                        type="file"
                        name="file"
                        accept=".xlsx"
                        className="text-sm"
                        required
                    />

                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Importowanie..." : "Importuj XLSX"}
                    </Button>
                </form>
            </div>

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
        </div>
    );
}