"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    archiveTenantAction,
    type ArchiveTenantActionState,
    updateTenantAction,
    type UpdateTenantActionState,
} from "../api/tenant.actions";

type TenantRowActionsProps = {
    tenant: {
        id: string;
        name: string;
        slug: string;
        status: string;
        ownerEmail: string | null;
    };
};

const initialUpdateState: UpdateTenantActionState = {
    status: "idle",
    message: "",
};

const initialArchiveState: ArchiveTenantActionState = {
    status: "idle",
    message: "",
};

export function TenantRowActions({ tenant }: TenantRowActionsProps) {
    const [isEditing, setIsEditing] = useState(false);

    const [updateState, updateFormAction, isUpdatePending] = useActionState(
        updateTenantAction,
        initialUpdateState,
    );

    const [archiveState, archiveFormAction, isArchivePending] = useActionState(
        archiveTenantAction,
        initialArchiveState,
    );

    if (isEditing) {
        return (
            <div className="min-w-[280px] space-y-3 rounded-xl border bg-background p-3">
                <form action={updateFormAction} className="space-y-3">
                    <input type="hidden" name="tenantId" value={tenant.id} />

                    <div className="space-y-1">
                        <Label htmlFor={`tenant-name-${tenant.id}`}>Nazwa</Label>
                        <Input
                            id={`tenant-name-${tenant.id}`}
                            name="name"
                            defaultValue={tenant.name}
                            minLength={2}
                            maxLength={160}
                            required
                        />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor={`tenant-status-${tenant.id}`}>Status</Label>
                        <select
                            id={`tenant-status-${tenant.id}`}
                            name="status"
                            defaultValue={tenant.status}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                            <option value="suspended">suspended</option>
                            <option value="archived">archived</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={`tenant-owner-${tenant.id}`}>Owner email</Label>
                        <Input
                            id={`tenant-owner-${tenant.id}`}
                            name="ownerEmail"
                            type="email"
                            defaultValue={tenant.ownerEmail ?? ""}
                            placeholder="owner@firma.pl"
                        />
                    </div>
                    {updateState.status === "error" ? (
                        <p className="text-xs text-destructive">{updateState.message}</p>
                    ) : null}

                    {updateState.status === "success" ? (
                        <p className="text-xs text-green-700">{updateState.message}</p>
                    ) : null}

                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={isUpdatePending}>
                            {isUpdatePending ? "Zapis..." : "Zapisz"}
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
                    action={archiveFormAction}
                    onSubmit={(event) => {
                        const confirmed = window.confirm(
                            `Zarchiwizować tenanta "${tenant.name}"? Dane tenantowej bazy nie zostaną usunięte.`,
                        );

                        if (!confirmed) {
                            event.preventDefault();
                        }
                    }}
                >
                    <input type="hidden" name="tenantId" value={tenant.id} />

                    <Button
                        type="submit"
                        size="sm"
                        variant="destructive"
                        disabled={isArchivePending}
                    >
                        {isArchivePending ? "Archiwizacja..." : "Archiwizuj"}
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

    return (
        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
            Edytuj
        </Button>
    );
}