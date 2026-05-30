// features/respondents/components/respondent-row-actions.tsx

"use client";

import { useActionState, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Save,
  Settings2,
  TriangleAlert,
  UserRound,
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
  archiveRespondentAction,
  type RespondentActionState,
  updateRespondentAction,
} from "../api/respondent.actions";
import type {
  RespondentListItem,
  RespondentOrganizationOption,
  RespondentUnitOption,
} from "../types/respondent.types";

type RespondentRowActionsProps = {
  tenantSlug: string;
  respondent: RespondentListItem;
  organizations: RespondentOrganizationOption[];
  units: RespondentUnitOption[];
  canManage: boolean;
};

const initialState: RespondentActionState = {
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

function getRespondentDisplayName(respondent: RespondentListItem) {
  const fullName = [respondent.firstName, respondent.lastName]
    .filter(Boolean)
    .join(" ");

  return fullName || respondent.email || respondent.externalCode || respondent.id;
}

export function RespondentRowActions({
  tenantSlug,
  respondent,
  organizations,
  units,
  canManage,
}: RespondentRowActionsProps) {
  const [open, setOpen] = useState(false);

  const [updateState, updateAction, isUpdating] = useActionState(
    updateRespondentAction,
    initialState,
  );

  const [archiveState, archiveAction, isArchiving] = useActionState(
    archiveRespondentAction,
    initialState,
  );

  const filteredUnits = useMemo(() => {
    if (!respondent.clientOrganizationId) {
      return units;
    }

    return units.filter(
      (unit) => unit.clientOrganizationId === respondent.clientOrganizationId,
    );
  }, [respondent.clientOrganizationId, units]);

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
        className="w-[min(calc(100vw-2rem),560px)] rounded-[1.5rem] border-black/10 bg-white/95 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur"
      >
        <div className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                <UserRound size={13} />
                Respondent
              </div>

              <h3 className="truncate text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                Ustawienia respondenta
              </h3>

              <p className="mt-1 truncate text-sm text-[#6b7280]">
                {getRespondentDisplayName(respondent)}
              </p>

              {respondent.email ? (
                <p className="mt-0.5 truncate font-mono text-xs text-[#8b9099]">
                  {respondent.email}
                </p>
              ) : null}
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
                {respondent.clientOrganizationName ?? "—"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[#6b7280]">Jednostka</span>
              <span className="font-medium text-[#171717]">
                {respondent.clientUnitName ?? "—"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[#6b7280]">Rola w jednostce</span>
              <span className="font-medium text-[#171717]">
                {respondent.clientUnitRole ?? "member"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[#6b7280]">Perspektywa raportowa</span>
              <span className="font-medium text-[#171717]">
                {respondent.isLeader ? "Lider" : "Zespół"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-[#6b7280]">Kod zewnętrzny</span>
              <span className="font-mono text-xs font-medium text-[#171717]">
                {respondent.externalCode ?? "—"}
              </span>
            </div>
          </div>

          <form action={updateAction} className="space-y-4">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <input type="hidden" name="respondentId" value={respondent.id} />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor={`respondent-email-${respondent.id}`}
                  className="text-sm font-medium text-[#171717]"
                >
                  Email
                </label>

                <Input
                  id={`respondent-email-${respondent.id}`}
                  name="email"
                  type="email"
                  defaultValue={respondent.email ?? ""}
                  className="rounded-2xl border-black/10 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`respondent-external-code-${respondent.id}`}
                  className="text-sm font-medium text-[#171717]"
                >
                  Kod zewnętrzny
                </label>

                <Input
                  id={`respondent-external-code-${respondent.id}`}
                  name="externalCode"
                  defaultValue={respondent.externalCode ?? ""}
                  maxLength={180}
                  className="rounded-2xl border-black/10 bg-white font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`respondent-first-name-${respondent.id}`}
                  className="text-sm font-medium text-[#171717]"
                >
                  Imię
                </label>

                <Input
                  id={`respondent-first-name-${respondent.id}`}
                  name="firstName"
                  defaultValue={respondent.firstName ?? ""}
                  maxLength={180}
                  className="rounded-2xl border-black/10 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`respondent-last-name-${respondent.id}`}
                  className="text-sm font-medium text-[#171717]"
                >
                  Nazwisko
                </label>

                <Input
                  id={`respondent-last-name-${respondent.id}`}
                  name="lastName"
                  defaultValue={respondent.lastName ?? ""}
                  maxLength={180}
                  className="rounded-2xl border-black/10 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`respondent-phone-${respondent.id}`}
                  className="text-sm font-medium text-[#171717]"
                >
                  Telefon
                </label>

                <Input
                  id={`respondent-phone-${respondent.id}`}
                  name="phone"
                  defaultValue={respondent.phone ?? ""}
                  maxLength={180}
                  className="rounded-2xl border-black/10 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`respondent-organization-${respondent.id}`}
                  className="text-sm font-medium text-[#171717]"
                >
                  Organizacja
                </label>

                <select
                  id={`respondent-organization-${respondent.id}`}
                  name="clientOrganizationId"
                  defaultValue={respondent.clientOrganizationId ?? ""}
                  className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                >
                  <option value="">Brak</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor={`respondent-unit-${respondent.id}`}
                  className="text-sm font-medium text-[#171717]"
                >
                  Jednostka
                </label>

                <select
                  id={`respondent-unit-${respondent.id}`}
                  name="clientUnitId"
                  defaultValue={respondent.clientUnitId ?? ""}
                  className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                >
                  <option value="">Brak</option>
                  {filteredUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={`respondent-unit-role-${respondent.id}`}
                  className="text-sm font-medium text-[#171717]"
                >
                  Rola w jednostce
                </label>

                <Input
                  id={`respondent-unit-role-${respondent.id}`}
                  name="clientUnitRole"
                  defaultValue={respondent.clientUnitRole ?? "member"}
                  maxLength={80}
                  className="rounded-2xl border-black/10 bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white/70 p-3 text-sm">
                  <input
                    type="checkbox"
                    name="isLeader"
                    value="true"
                    defaultChecked={respondent.isLeader}
                    className="mt-1 h-4 w-4 rounded border-black/20"
                  />

                  <span>
                    <span className="block font-medium text-[#171717]">
                      Lider / zwierzchnik
                    </span>
                    <span className="mt-1 block leading-5 text-[#6b7280]">
                      Uwzględnij tę osobę w raportach po stronie lidera.
                    </span>
                  </span>
                </label>
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
                  `Zarchiwizować respondenta ${respondent.email ?? respondent.externalCode ?? respondent.id
                  }?`,
                );

                if (!confirmed) {
                  event.preventDefault();
                }
              }}
              className="space-y-3"
            >
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
              <input type="hidden" name="respondentId" value={respondent.id} />

              <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4">
                <div className="flex gap-3">
                  <Archive
                    size={17}
                    className="mt-0.5 shrink-0 text-red-700"
                  />

                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Archiwizacja respondenta
                    </p>

                    <p className="mt-1 text-xs leading-5 text-red-700">
                      Respondent zostanie ukryty z aktywnych list, ale jego
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
