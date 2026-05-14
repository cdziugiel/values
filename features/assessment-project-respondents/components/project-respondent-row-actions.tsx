"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";

import {
  archiveAssessmentProjectRespondentAction,
  type AssessmentProjectRespondentActionState,
  updateAssessmentProjectRespondentAction,
} from "../api/assessment-project-respondent.actions";
import { ASSESSMENT_PROJECT_RESPONDENT_STATUS_OPTIONS } from "../forms/assessment-project-respondent.schema";
import type { AssessmentProjectRespondentListItem } from "../types/assessment-project-respondent.types";

type ProjectRespondentRowActionsProps = {
  tenantSlug: string;
  participant: AssessmentProjectRespondentListItem;
  canManage: boolean;
};

const initialState: AssessmentProjectRespondentActionState = {
  status: "idle",
  message: "",
};

export function ProjectRespondentRowActions({
  tenantSlug,
  participant,
  canManage,
}: ProjectRespondentRowActionsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [updateState, updateAction, isUpdating] = useActionState(
    updateAssessmentProjectRespondentAction,
    initialState,
  );

  const [archiveState, archiveAction, isArchiving] = useActionState(
    archiveAssessmentProjectRespondentAction,
    initialState,
  );

  if (!canManage) {
    return null;
  }

  if (!isEditing) {
    return (
      <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
        Edytuj
      </Button>
    );
  }

  return (
    <div className="min-w-[260px] space-y-3 rounded-xl border bg-background p-3">
      <form action={updateAction} className="space-y-3">
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input
          type="hidden"
          name="projectRespondentId"
          value={participant.id}
        />
        <input
          type="hidden"
          name="assessmentProjectId"
          value={participant.assessmentProjectId}
        />

        <div className="space-y-1">
          <label className="text-xs font-medium">Status</label>
          <select
            name="status"
            defaultValue={participant.status}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {ASSESSMENT_PROJECT_RESPONDENT_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        {updateState.status === "error" ? (
          <p className="text-xs text-destructive">{updateState.message}</p>
        ) : null}

        {updateState.status === "success" ? (
          <p className="text-xs text-green-700">{updateState.message}</p>
        ) : null}

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isUpdating}>
            {isUpdating ? "Zapis..." : "Zapisz"}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(false)}
          >
            Anuluj
          </Button>
        </div>
      </form>

      <form
        action={archiveAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            `Zarchiwizować uczestnika projektu?`,
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input
          type="hidden"
          name="projectRespondentId"
          value={participant.id}
        />
        <input
          type="hidden"
          name="assessmentProjectId"
          value={participant.assessmentProjectId}
        />

        <Button
          type="submit"
          size="sm"
          variant="destructive"
          disabled={isArchiving}
        >
          {isArchiving ? "Archiwizacja..." : "Archiwizuj"}
        </Button>

        {archiveState.status === "error" ? (
          <p className="mt-2 text-xs text-destructive">
            {archiveState.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}