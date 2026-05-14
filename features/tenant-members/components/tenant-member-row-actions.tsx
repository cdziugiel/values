"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  archiveTenantMemberAction,
  type TenantMemberActionState,
  updateTenantMemberAction,
} from "../api/tenant-member.actions";
import {
  TENANT_MEMBER_ROLE_OPTIONS,
  TENANT_MEMBER_STATUS_OPTIONS,
} from "../forms/tenant-member.schema";
import type { TenantMemberListItem } from "../types/tenant-member.types";

type TenantMemberRowActionsProps = {
  tenantSlug: string;
  member: TenantMemberListItem;
  canManage: boolean;
};

const initialState: TenantMemberActionState = {
  status: "idle",
  message: "",
};

export function TenantMemberRowActions({
  tenantSlug,
  member,
  canManage,
}: TenantMemberRowActionsProps) {
  const [isEditing, setIsEditing] = useState(false);

  const [updateState, updateAction, isUpdating] = useActionState(
    updateTenantMemberAction,
    initialState,
  );

  const [archiveState, archiveAction, isArchiving] = useActionState(
    archiveTenantMemberAction,
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
        <input type="hidden" name="membershipId" value={member.membershipId} />

        <div className="space-y-1">
          <label className="text-xs font-medium">Rola</label>
          <select
            name="role"
            defaultValue={member.role}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {TENANT_MEMBER_ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium">Status</label>
          <select
            name="status"
            defaultValue={member.status}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {TENANT_MEMBER_STATUS_OPTIONS.map((status) => (
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
            `Zarchiwizować dostęp użytkownika ${member.email}?`,
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input type="hidden" name="membershipId" value={member.membershipId} />

        <Button
          type="submit"
          size="sm"
          variant="destructive"
          disabled={isArchiving}
        >
          {isArchiving ? "Archiwizacja..." : "Archiwizuj dostęp"}
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