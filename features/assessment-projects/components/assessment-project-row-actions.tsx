"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  archiveAssessmentProjectAction,
  type AssessmentProjectActionState,
  updateAssessmentProjectAction,
} from "../api/assessment-project.actions";
import { ASSESSMENT_PROJECT_STATUS_OPTIONS } from "../forms/assessment-project.schema";
import type {
  AssessmentProjectListItem,
  AssessmentProjectOrganizationOption,
} from "../types/assessment-project.types";

type AssessmentProjectRowActionsProps = {
  tenantSlug: string;
  project: AssessmentProjectListItem;
  organizations: AssessmentProjectOrganizationOption[];
  canManage: boolean;
};

const initialState: AssessmentProjectActionState = {
  status: "idle",
  message: "",
};

function toDateInputValue(value: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function AssessmentProjectRowActions({
  tenantSlug,
  project,
  organizations,
  canManage,
}: AssessmentProjectRowActionsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [updateState, updateAction, isUpdating] = useActionState(
    updateAssessmentProjectAction,
    initialState,
  );

  const [archiveState, archiveAction, isArchiving] = useActionState(
    archiveAssessmentProjectAction,
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
    <div className="min-w-[360px] space-y-3 rounded-xl border bg-background p-3">
      <form action={updateAction} className="space-y-3">
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input
          type="hidden"
          name="assessmentProjectId"
          value={project.id}
        />

        <div className="space-y-1">
          <label className="text-xs font-medium">Nazwa</label>
          <Input
            name="name"
            defaultValue={project.name}
            required
            minLength={2}
            maxLength={180}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Organizacja</label>
          <select
            name="clientOrganizationId"
            defaultValue={project.clientOrganizationId ?? ""}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Brak przypisania</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Status</label>
          <select
            name="status"
            defaultValue={project.status}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {ASSESSMENT_PROJECT_STATUS_OPTIONS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium">Start</label>
            <Input
              name="startsAt"
              type="date"
              defaultValue={toDateInputValue(project.startsAt)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Koniec</label>
            <Input
              name="endsAt"
              type="date"
              defaultValue={toDateInputValue(project.endsAt)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Opis</label>
          <textarea
            name="description"
            defaultValue={project.description ?? ""}
            maxLength={2000}
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
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
            `Zarchiwizować projekt "${project.name}"?`,
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input
          type="hidden"
          name="assessmentProjectId"
          value={project.id}
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