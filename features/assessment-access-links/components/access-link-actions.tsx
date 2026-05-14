"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import {
  createAssessmentAccessLinkAction,
  revokeAssessmentAccessLinkAction,
  type AssessmentAccessLinkActionState,
} from "../api/assessment-access-link.actions";

type AccessLinkActionsProps = {
  tenantSlug: string;
  assessmentProjectId: string;
  projectRespondentId: string;
  activeAccessLinkId?: string | null;
  canManage: boolean;
};

const initialState: AssessmentAccessLinkActionState = {
  status: "idle",
  message: "",
};

export function AccessLinkActions({
  tenantSlug,
  assessmentProjectId,
  projectRespondentId,
  activeAccessLinkId,
  canManage,
}: AccessLinkActionsProps) {
  const [createState, createAction, isCreating] = useActionState(
    createAssessmentAccessLinkAction,
    initialState,
  );

  const [revokeState, revokeAction, isRevoking] = useActionState(
    revokeAssessmentAccessLinkAction,
    initialState,
  );

  if (!canManage) {
    return null;
  }

  return (
    <div className="space-y-2">
      <form action={createAction}>
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input
          type="hidden"
          name="assessmentProjectId"
          value={assessmentProjectId}
        />
        <input
          type="hidden"
          name="projectRespondentId"
          value={projectRespondentId}
        />

        <Button type="submit" size="sm" variant="outline" disabled={isCreating}>
          {isCreating
            ? "Generowanie..."
            : activeAccessLinkId
              ? "Wygeneruj nowy link"
              : "Wygeneruj link"}
        </Button>
      </form>

      {activeAccessLinkId ? (
        <form
          action={revokeAction}
          onSubmit={(event) => {
            const confirmed = window.confirm(
              "Unieważnić aktywny link do badania?",
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
            value={assessmentProjectId}
          />
          <input type="hidden" name="accessLinkId" value={activeAccessLinkId} />

          <Button
            type="submit"
            size="sm"
            variant="destructive"
            disabled={isRevoking}
          >
            {isRevoking ? "Unieważnianie..." : "Unieważnij link"}
          </Button>
        </form>
      ) : null}

      {createState.status !== "idle" ? (
        <div
          className={
            createState.status === "success"
              ? "max-w-[420px] rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800"
              : "max-w-[420px] rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          }
        >
          <div>{createState.message}</div>

          {createState.url ? (
            <div className="mt-2 break-all font-mono">
              {createState.url}
            </div>
          ) : null}
        </div>
      ) : null}

      {revokeState.status !== "idle" ? (
        <p
          className={
            revokeState.status === "success"
              ? "max-w-[420px] text-xs text-green-700"
              : "max-w-[420px] text-xs text-destructive"
          }
        >
          {revokeState.message}
        </p>
      ) : null}
    </div>
  );
}