// features/client-units/components/create-client-unit-form.tsx

"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Building2,
  CheckCircle2,
  Layers3,
  PlusCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createClientUnitAction,
  type ClientUnitActionState,
} from "../api/client-unit.actions";
import { CLIENT_UNIT_TYPE_OPTIONS } from "../forms/client-unit.schema";
import type {
  ClientUnitOrganizationOption,
  ClientUnitParentOption,
} from "../types/client-unit.types";

type CreateClientUnitFormProps = {
  tenantSlug: string;
  canCreate: boolean;
  organizations: ClientUnitOrganizationOption[];
  parentOptions: ClientUnitParentOption[];
};

const initialState: ClientUnitActionState = {
  status: "idle",
  message: "",
  formVersion: 0,
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

export function CreateClientUnitForm({
  tenantSlug,
  canCreate,
  organizations,
  parentOptions,
}: CreateClientUnitFormProps) {
  const [state, formAction, isPending] = useActionState(
    createClientUnitAction,
    initialState,
  );
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    organizations[0]?.id ?? "",
  );

  const [selectedParentId, setSelectedParentId] = useState("");

  const availableParentOptions = useMemo(
    () =>
      parentOptions.filter(
        (unit) =>
          unit.clientOrganizationId === selectedOrganizationId,
      ),
    [parentOptions, selectedOrganizationId],
  );
useEffect(() => {
  if (state.status === "success") {
    setSelectedParentId("");
  }
}, [state.formVersion, state.status]);
  function handleOrganizationChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    setSelectedOrganizationId(event.target.value);

    // Rodzic wybrany dla poprzedniej organizacji nie może pozostać w formularzu.
    setSelectedParentId("");
  }
  if (!canCreate) {
    return null;
  }

  return (
    <section className="rounded-[2rem] hv-brand-card">
      <form
        action={formAction}
        key={state.formVersion}
        className="grid gap-6 p-5 md:p-6 lg:grid-cols-[0.85fr_1.15fr]"
      >
        <input type="hidden" name="tenantSlug" value={tenantSlug} />

        <div className="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <PlusCircle size={20} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
              Nowa jednostka
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Dodaj dział, zespół lub inną część organizacji.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280]">
              Jednostki organizacyjne pozwalają odwzorować strukturę klienta:
              działy, piony, zespoły, lokalizacje lub inne obszary, które będą
              używane w projektach i raportach.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4">
            <div className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-[#0f766e]"
              />

              <p className="text-sm leading-6 text-[#0f766e]">
                Hierarchia jednostek pomaga później analizować wyniki na
                poziomie całej organizacji, działów i mniejszych zespołów.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          {organizations.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-5 text-sm leading-6 text-[#6b7280]">
              Najpierw utwórz organizację klienta. Jednostka organizacyjna musi
              być przypisana do konkretnej organizacji.
            </div>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="client-unit-org" className="text-[#171717]">
                    Organizacja
                  </Label>

<select
  id="client-unit-org"
  name="clientOrganizationId"
  value={selectedOrganizationId}
  onChange={(event) => {
    setSelectedOrganizationId(event.target.value);
    setSelectedParentId("");
  }}
  className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
  required
>
  {organizations.map((organization) => (
    <option key={organization.id} value={organization.id}>
      {organization.name}
    </option>
  ))}
</select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-unit-parent" className="text-[#171717]">
                    Jednostka nadrzędna
                  </Label>

<select
  id="client-unit-parent"
  name="parentId"
  value={selectedParentId}
  onChange={(event) => setSelectedParentId(event.target.value)}
  disabled={!selectedOrganizationId}
  className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-[#9ca3af] focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
>
  <option value="">Brak</option>

  {availableParentOptions.map((unit) => (
    <option key={unit.id} value={unit.id}>
      {unit.name}
    </option>
  ))}
</select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-unit-name" className="text-[#171717]">
                    Nazwa jednostki
                  </Label>

                  <Input
                    id="client-unit-name"
                    name="name"
                    placeholder="HR / Produkcja / Zarząd"
                    required
                    minLength={2}
                    maxLength={180}
                    className="rounded-2xl border-black/10 bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-unit-type" className="text-[#171717]">
                    Typ
                  </Label>

                  <select
                    id="client-unit-type"
                    name="type"
                    className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                    defaultValue="department"
                  >
                    {CLIENT_UNIT_TYPE_OPTIONS.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {state.status !== "idle" ? (
                <div className="mt-5">
                  <ActionMessage status={state.status} message={state.message} />
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <Layers3 size={14} />
                  Jednostka zostanie przypisana do partnera:{" "}
                  <span className="font-mono text-[#171717]">{tenantSlug}</span>
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                >
                  <Building2 size={16} />
                  {isPending ? "Tworzenie..." : "Utwórz jednostkę"}
                </Button>
              </div>
            </>
          )}
        </div>
      </form>
    </section>
  );
}