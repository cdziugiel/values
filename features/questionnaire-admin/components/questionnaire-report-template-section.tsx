"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FileText, Link2, Pencil, Unlink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  assignReportTemplateToQuestionnaireVersionAction,
  removeReportTemplateFromQuestionnaireVersionAction,
  type QuestionnaireReportTemplateActionState,
} from "../api/questionnaire-report-template.actions";

type ActiveBinding = {
  bindingId: string;

  reportTemplateId: string;
  reportTemplateCode: string;
  reportTemplateName: string;

  reportTemplateVersionId: string;
  reportTemplateVersion: string;
  reportTemplateVersionName: string;
  reportTemplateVersionStatus: string;
} | null;

type AvailableTemplateVersion = {
  reportTemplateId: string;
  reportTemplateCode: string;
  reportTemplateName: string;

  reportTemplateVersionId: string;
  reportTemplateVersion: string;
  reportTemplateVersionName: string;
  reportTemplateVersionStatus: string;
};

type QuestionnaireReportTemplateSectionProps = {
  questionnaireVersionId: string;
  activeBinding: ActiveBinding;
  availableTemplateVersions: AvailableTemplateVersion[];
  canEdit: boolean;
};

const initialState: QuestionnaireReportTemplateActionState = {
  status: "idle",
  message: "",
};

export function QuestionnaireReportTemplateSection({
  questionnaireVersionId,
  activeBinding,
  availableTemplateVersions,
  canEdit,
}: QuestionnaireReportTemplateSectionProps) {
  const [assignState, assignAction, isAssignPending] = useActionState(
    assignReportTemplateToQuestionnaireVersionAction,
    initialState,
  );

  const [removeState, removeAction, isRemovePending] = useActionState(
    removeReportTemplateFromQuestionnaireVersionAction,
    initialState,
  );

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-muted-foreground" />
            <h2 className="text-lg font-semibold">Raport dla kwestionariusza</h2>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Przypisz template raportu do tej wersji kwestionariusza. Raport
            będzie renderowany na podstawie zamrożonego snapshotu wyników sesji.
          </p>
        </div>

        {activeBinding ? (
          <Badge variant="secondary">Raport przypisany</Badge>
        ) : (
          <Badge variant="outline">Brak raportu</Badge>
        )}
      </div>

      {activeBinding ? (
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Aktywny template
              </div>

              <div className="mt-1 font-medium">
                {activeBinding.reportTemplateName}
              </div>

              <div className="mt-1 text-sm text-muted-foreground">
                {activeBinding.reportTemplateCode} · wersja{" "}
                {activeBinding.reportTemplateVersion} ·{" "}
                {activeBinding.reportTemplateVersionName}
              </div>

              <div className="mt-2">
                <Badge variant="outline">
                  {activeBinding.reportTemplateVersionStatus}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="gap-2">
                <Link
                  href={`/dashboard/report-builder/templates/${activeBinding.reportTemplateId}/versions/${activeBinding.reportTemplateVersionId}`}
                >
                  <Pencil size={14} />
                  Edytuj template
                </Link>
              </Button>

              {canEdit ? (
                <form action={removeAction}>
                  <input
                    type="hidden"
                    name="questionnaireVersionId"
                    value={questionnaireVersionId}
                  />

                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={isRemovePending}
                  >
                    <Unlink size={14} />
                    {isRemovePending ? "Odpinanie..." : "Odepnij"}
                  </Button>
                </form>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Do tej wersji kwestionariusza nie przypisano jeszcze template’u raportu.
        </div>
      )}

      {canEdit ? (
        <form
          action={assignAction}
          className="grid gap-3 rounded-xl border bg-background p-4 md:grid-cols-[1fr_auto]"
        >
          <input
            type="hidden"
            name="questionnaireVersionId"
            value={questionnaireVersionId}
          />

          <select
            name="reportTemplateVersionId"
            className="h-10 rounded-md border bg-background px-3 text-sm"
            defaultValue={activeBinding?.reportTemplateVersionId ?? ""}
          >
            <option value="">Wybierz template raportu...</option>

            {availableTemplateVersions.map((templateVersion) => (
              <option
                key={templateVersion.reportTemplateVersionId}
                value={templateVersion.reportTemplateVersionId}
              >
                {templateVersion.reportTemplateName} ·{" "}
                {templateVersion.reportTemplateVersion} ·{" "}
                {templateVersion.reportTemplateVersionName} ·{" "}
                {templateVersion.reportTemplateVersionStatus}
              </option>
            ))}
          </select>

          <Button
            type="submit"
            disabled={isAssignPending || availableTemplateVersions.length === 0}
            className="gap-2"
          >
            <Link2 size={16} />
            {isAssignPending ? "Przypisywanie..." : "Przypisz raport"}
          </Button>

          {availableTemplateVersions.length === 0 ? (
            <p className="md:col-span-2 text-sm text-muted-foreground">
              Nie ma jeszcze żadnych wersji template’ów raportów.
            </p>
          ) : null}
        </form>
      ) : (
        <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
          Ta wersja kwestionariusza nie jest w trybie draft. Przypisanie raportu
          jest zablokowane, aby zachować stabilność opublikowanej wersji.
        </div>
      )}

      {assignState.status !== "idle" ? (
        <p
          className={
            assignState.status === "success"
              ? "text-sm text-green-700"
              : "text-sm text-destructive"
          }
        >
          {assignState.message}
        </p>
      ) : null}

      {removeState.status !== "idle" ? (
        <p
          className={
            removeState.status === "success"
              ? "text-sm text-green-700"
              : "text-sm text-destructive"
          }
        >
          {removeState.message}
        </p>
      ) : null}
    </section>
  );
}