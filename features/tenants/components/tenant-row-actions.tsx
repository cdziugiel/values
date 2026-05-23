"use client";

import { useActionState, useState } from "react";
import { Archive, Pencil, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

function ActionMessage({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message: string;
}) {
  if (status === "idle" || !message) {
    return null;
  }

  return (
    <p
      className={[
        "rounded-2xl px-3 py-2 text-xs leading-5",
        status === "success"
          ? "bg-emerald-50 text-emerald-800"
          : "bg-red-50 text-red-800",
      ].join(" ")}
    >
      {message}
    </p>
  );
}

export function TenantRowActions({ tenant }: TenantRowActionsProps) {
  const [open, setOpen] = useState(false);

  const [updateState, updateFormAction, isUpdatePending] = useActionState(
    updateTenantAction,
    initialUpdateState,
  );

  const [archiveState, archiveFormAction, isArchivePending] = useActionState(
    archiveTenantAction,
    initialArchiveState,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <Pencil size={14} />
          Edytuj
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl rounded-[1.75rem] border-black/10 bg-white/95 p-0 shadow-[0_24px_72px_rgba(15,23,42,0.18)] backdrop-blur">
        <div className="border-b border-black/10 px-6 py-5">
          <DialogHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
              Edycja partnera
            </p>

            <DialogTitle className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
              {tenant.name}
            </DialogTitle>

            <DialogDescription className="font-mono text-xs text-[#6b7280]">
              {tenant.slug}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-5">
          <form action={updateFormAction} className="space-y-4">
            <input type="hidden" name="tenantId" value={tenant.id} />

            <div className="space-y-1.5">
              <Label htmlFor={`tenant-name-${tenant.id}`}>Nazwa</Label>
              <Input
                id={`tenant-name-${tenant.id}`}
                name="name"
                defaultValue={tenant.name}
                minLength={2}
                maxLength={160}
                required
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`tenant-status-${tenant.id}`}>Status</Label>

              <select
                id={`tenant-status-${tenant.id}`}
                name="status"
                defaultValue={tenant.status}
                className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              >
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="suspended">suspended</option>
                <option value="archived">archived</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`tenant-owner-${tenant.id}`}>Owner email</Label>
              <Input
                id={`tenant-owner-${tenant.id}`}
                name="ownerEmail"
                type="email"
                defaultValue={tenant.ownerEmail ?? ""}
                placeholder="owner@firma.pl"
                className="rounded-2xl border-black/10 bg-white"
              />
              <p className="text-xs leading-5 text-[#6b7280]">
                Ten użytkownik otrzyma rolę ownera partnera. Jeśli użytkownik
                jeszcze nie istnieje, system może go utworzyć zgodnie z logiką
                mutacji.
              </p>
            </div>

            <ActionMessage
              status={updateState.status}
              message={updateState.message}
            />

            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full border-black/10 bg-white/70"
                onClick={() => setOpen(false)}
              >
                <X size={14} />
                Zamknij
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={isUpdatePending}
                className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
              >
                {isUpdatePending ? (
                  "Zapisywanie..."
                ) : (
                  <>
                    <Save size={14} />
                    Zapisz zmiany
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="rounded-[1.25rem] border border-red-100 bg-red-50/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-red-900">
                  Archiwizacja partnera
                </p>
                <p className="mt-1 text-xs leading-5 text-red-800/80">
                  Partner zostanie oznaczony jako zarchiwizowany. Dane
                  tenantowej bazy nie zostaną usunięte.
                </p>
              </div>

              <form
                action={archiveFormAction}
                onSubmit={(event) => {
                  const confirmed = window.confirm(
                    `Zarchiwizować partnera "${tenant.name}"? Dane tenantowej bazy nie zostaną usunięte.`,
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
                  variant="ghost"
                  className="rounded-full px-3 text-red-700 hover:bg-red-100 hover:text-red-900"
                  disabled={isArchivePending}
                >
                  <Archive size={14} />
                  {isArchivePending ? "Archiwizacja..." : "Archiwizuj"}
                </Button>
              </form>
            </div>

            <div className="mt-3">
              <ActionMessage
                status={archiveState.status}
                message={archiveState.message}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}