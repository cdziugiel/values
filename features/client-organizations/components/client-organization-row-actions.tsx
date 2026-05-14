"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  archiveClientOrganizationAction,
  type ClientOrganizationActionState,
  updateClientOrganizationAction,
} from "../api/client-organization.actions";
import { CLIENT_ORGANIZATION_STATUS_OPTIONS } from "../forms/client-organization.schema";
import type { ClientOrganizationListItem } from "../types/client-organization.types";

type ClientOrganizationRowActionsProps = {
  tenantSlug: string;
  organization: ClientOrganizationListItem;
  canManage: boolean;
};

const initialState: ClientOrganizationActionState = {
  status: "idle",
  message: "",
};

export function ClientOrganizationRowActions({
  tenantSlug,
  organization,
  canManage,
}: ClientOrganizationRowActionsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [updateState, updateAction, isUpdating] = useActionState(
    updateClientOrganizationAction,
    initialState,
  );

  const [archiveState, archiveAction, isArchiving] = useActionState(
    archiveClientOrganizationAction,
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
    <div className="min-w-[320px] space-y-3 rounded-xl border bg-background p-3">
      <form action={updateAction} className="space-y-3">
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input
          type="hidden"
          name="clientOrganizationId"
          value={organization.id}
        />

        <div className="space-y-1">
          <label className="text-xs font-medium">Nazwa</label>
          <Input
            name="name"
            defaultValue={organization.name}
            required
            minLength={2}
            maxLength={180}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Branża</label>
          <Input
            name="industry"
            defaultValue={organization.industry ?? ""}
            maxLength={120}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Wielkość</label>
          <Input
            name="size"
            defaultValue={organization.size ?? ""}
            maxLength={80}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Status</label>
          <select
            name="status"
            defaultValue={organization.status}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {CLIENT_ORGANIZATION_STATUS_OPTIONS.map((status) => (
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
            `Zarchiwizować organizację "${organization.name}"?`,
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input
          type="hidden"
          name="clientOrganizationId"
          value={organization.id}
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