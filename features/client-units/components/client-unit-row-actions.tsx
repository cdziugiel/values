// features/client-units/components/client-unit-row-actions.tsx

"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Archive,
  Building2,
  CheckCircle2,
  Save,
  Settings2,
  TriangleAlert,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  archiveClientUnitAction,
  type ClientUnitActionState,
  updateClientUnitAction,
} from "../api/client-unit.actions";
import { CLIENT_UNIT_TYPE_OPTIONS } from "../forms/client-unit.schema";
import type {
  ClientUnitListItem,
  ClientUnitOrganizationOption,
  ClientUnitParentOption,
} from "../types/client-unit.types";

type ClientUnitRowActionsProps = {
  tenantSlug: string;
  unit: ClientUnitListItem;
  canManage: boolean;
  organizations: ClientUnitOrganizationOption[];
  parentOptions: ClientUnitParentOption[];
};

const initialState: ClientUnitActionState = {
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
  if (status === "idle") {
    return null;
  }

  return (
    <div
      className={[
        "rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
        status === "success"
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <div className="flex gap-2">
        {status === "success" ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        ) : (
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        )}

        <span>{message}</span>
      </div>
    </div>
  );
}

function getTypeLabel(type: string) {
  return CLIENT_UNIT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function ClientUnitRowActions({
  tenantSlug,
  unit,
  canManage,
  organizations,
  parentOptions,
}: ClientUnitRowActionsProps) {
  const [open, setOpen] = useState(false);

  const [updateState, updateAction, isUpdating] = useActionState(
    updateClientUnitAction,
    initialState,
  );

  const [archiveState, archiveAction, isArchiving] = useActionState(
    archiveClientUnitAction,
    initialState,
  );

  const filteredParentOptions = useMemo(
    () =>
      parentOptions.filter(
        (option) =>
          option.id !== unit.id &&
          option.clientOrganizationId === unit.clientOrganizationId,
      ),
    [parentOptions, unit.clientOrganizationId, unit.id],
  );

  if (!canManage) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <Settings2 size={14} />
          Ustawienia
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(calc(100vw-2rem),520px)] rounded-[1.5rem] border-black/10 bg-white/95 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur"
      >
        <div className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                <Building2 size={13} />
                Jednostka organizacyjna
              </div>

              <h3 className="truncate text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                Ustawienia jednostki
              </h3>

              <p className="mt-1 truncate text-sm text-[#6b7280]">
                {unit.name}
              </p>
            </div>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 rounded-full text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#171717]"
              onClick={() => setOpen(false)}
            >
              <XCircle size={16} />
              <span className="sr-only">Zamknij</span>
            </Button>
          </div>

          <div className="grid gap-3 rounded-[1.25rem] border border-black/10 bg-white/70 p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[#6b7280]">Organizacja</span>
              <span className="font-medium text-[#171717]">
                {unit.clientOrganizationName}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[#6b7280]">Nadrzędna</span>
              <span className="font-medium text-[#171717]">
                {unit.parentName ?? "—"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[#6b7280]">Typ</span>
              <span className="font-medium text-[#171717]">
                {getTypeLabel(unit.type)}
              </span>
            </div>
          </div>

          <form action={updateAction} className="space-y-4">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <input type="hidden" name="clientUnitId" value={unit.id} />

            <div className="space-y-1.5">
              <label
                htmlFor={`client-unit-organization-${unit.id}`}
                className="text-sm font-medium text-[#171717]"
              >
                Organizacja
              </label>

              <select
                id={`client-unit-organization-${unit.id}`}
                name="clientOrganizationId"
                defaultValue={unit.clientOrganizationId}
                className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={`client-unit-parent-${unit.id}`}
                className="text-sm font-medium text-[#171717]"
              >
                Jednostka nadrzędna
              </label>

              <select
                id={`client-unit-parent-${unit.id}`}
                name="parentId"
                defaultValue={unit.parentId ?? ""}
                className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              >
                <option value="">Brak</option>

                {filteredParentOptions.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
              <div className="space-y-1.5">
                <label
                  htmlFor={`client-unit-name-${unit.id}`}
                  className="text-sm font-medium text-[#171717]"
                >
                  Nazwa
                </label>

                <Input
                  id={`client-unit-name-${unit.id}`}
                  name="name"
                  defaultValue={unit.name}
                  required
                  minLength={2}
                  maxLength={180}
                  className="rounded-2xl border-black/10 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`client-unit-type-${unit.id}`}
                  className="text-sm font-medium text-[#171717]"
                >
                  Typ
                </label>

                <select
                  id={`client-unit-type-${unit.id}`}
                  name="type"
                  defaultValue={unit.type}
                  className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                >
                  {CLIENT_UNIT_TYPE_OPTIONS.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ActionMessage
              status={updateState.status}
              message={updateState.message}
            />

            <div className="flex flex-col-reverse gap-2 border-t border-black/10 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-black/10 bg-white/70 text-[#171717]"
                onClick={() => setOpen(false)}
              >
                Anuluj
              </Button>

              <Button
                type="submit"
                disabled={isUpdating}
                className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
              >
                <Save size={14} />
                {isUpdating ? "Zapisywanie..." : "Zapisz zmiany"}
              </Button>
            </div>
          </form>

          <div className="border-t border-black/10 pt-4">
            <form
              action={archiveAction}
              onSubmit={(event) => {
                const confirmed = window.confirm(
                  `Zarchiwizować jednostkę "${unit.name}"?`,
                );

                if (!confirmed) {
                  event.preventDefault();
                }
              }}
              className="space-y-3"
            >
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
              <input type="hidden" name="clientUnitId" value={unit.id} />

              <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4">
                <div className="flex gap-3">
                  <Archive
                    size={17}
                    className="mt-0.5 shrink-0 text-red-700"
                  />

                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Archiwizacja jednostki
                    </p>

                    <p className="mt-1 text-xs leading-5 text-red-700">
                      Jednostka zostanie ukryta z aktywnych list, ale jej
                      historia pozostanie w systemie.
                    </p>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="sm"
                  variant="destructive"
                  disabled={isArchiving}
                  className="mt-3 rounded-full"
                >
                  <Archive size={14} />
                  {isArchiving ? "Archiwizacja..." : "Archiwizuj"}
                </Button>
              </div>

              <ActionMessage
                status={archiveState.status}
                message={archiveState.message}
              />
            </form>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}