// features/client-organizations/components/create-client-organization-form.tsx

"use client";

import { useActionState } from "react";
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
  createClientOrganizationAction,
  type ClientOrganizationActionState,
} from "../api/client-organization.actions";

type CreateClientOrganizationFormProps = {
  tenantSlug: string;
  canCreate: boolean;
};

const initialState: ClientOrganizationActionState = {
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

export function CreateClientOrganizationForm({
  tenantSlug,
  canCreate,
}: CreateClientOrganizationFormProps) {
  const [state, formAction, isPending] = useActionState(
    createClientOrganizationAction,
    initialState,
  );

  if (!canCreate) {
    return null;
  }

  return (
    <section className="rounded-[2rem] hv-brand-card">
      <form
        action={formAction}
        className="grid gap-6 p-5 md:p-6 lg:grid-cols-[0.85fr_1.15fr]"
      >
        <input type="hidden" name="tenantSlug" value={tenantSlug} />

        <div className="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <PlusCircle size={20} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
              Nowa organizacja klienta
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Dodaj organizację, dla której będą prowadzone badania.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280]">
              Do organizacji przypiszesz projekty badawcze, zespoły,
              i respondentów.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4">
            <div className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-[#0f766e]"
              />

              <p className="text-sm leading-6 text-[#0f766e]">
                Dobra nazwa organizacji ułatwia późniejsze filtrowanie projektów,
                respondentów i wyników w raportach.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="client-org-name" className="text-[#171717]">
                Nazwa organizacji
              </Label>

              <Input
                id="client-org-name"
                name="name"
                placeholder="ACME Sp. z o.o."
                required
                minLength={2}
                maxLength={180}
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="client-org-industry" className="text-[#171717]">
                Branża
              </Label>

              <Input
                id="client-org-industry"
                name="industry"
                placeholder="Produkcja / HR / Energetyka"
                maxLength={120}
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-org-size" className="text-[#171717]">
                Wielkość
              </Label>

              <Input
                id="client-org-size"
                name="size"
                placeholder="np. 50-250"
                maxLength={80}
                className="rounded-2xl border-black/10 bg-white"
              />
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
              Organizacja zostanie przypisana do partnera:{" "}
              <span className="font-mono text-[#171717]">{tenantSlug}</span>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
            >
              <Building2 size={16} />
              {isPending ? "Tworzenie..." : "Utwórz organizację"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}