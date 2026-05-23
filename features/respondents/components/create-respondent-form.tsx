// features/respondents/components/create-respondent-form.tsx

"use client";

import { useActionState } from "react";
import {
  CheckCircle2,
  IdCard,
  PlusCircle,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createRespondentAction,
  type RespondentActionState,
} from "../api/respondent.actions";
import type {
  RespondentOrganizationOption,
  RespondentUnitOption,
} from "../types/respondent.types";

type CreateRespondentFormProps = {
  tenantSlug: string;
  canCreate: boolean;
  organizations: RespondentOrganizationOption[];
  units: RespondentUnitOption[];
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

export function CreateRespondentForm({
  tenantSlug,
  canCreate,
  organizations,
  units,
}: CreateRespondentFormProps) {
  const [state, formAction, isPending] = useActionState(
    createRespondentAction,
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
            <UserPlus size={20} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
              Nowy respondent
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Dodaj uczestnika badania.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280]">
              Dane identyfikujące respondenta są przechowywane oddzielnie od
              wyników. Organizacja i jednostka pomagają później prowadzić
              analizy na poziomie struktury klienta.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4">
            <div className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-[#0f766e]"
              />

              <p className="text-sm leading-6 text-[#0f766e]">
                Minimum identyfikacji to zwykle email albo kod zewnętrzny.
                Dane osobowe uzupełniaj tylko wtedy, gdy są potrzebne w procesie
                badania.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          <div className="grid gap-5 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="respondent-email" className="text-[#171717]">
                Email
              </Label>

              <Input
                id="respondent-email"
                name="email"
                type="email"
                placeholder="osoba@firma.pl"
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="respondent-external-code"
                className="text-[#171717]"
              >
                Kod zewnętrzny
              </Label>

              <Input
                id="respondent-external-code"
                name="externalCode"
                placeholder="EMP-001"
                maxLength={180}
                className="rounded-2xl border-black/10 bg-white font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="respondent-phone" className="text-[#171717]">
                Telefon
              </Label>

              <Input
                id="respondent-phone"
                name="phone"
                placeholder="+48..."
                maxLength={180}
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label
                htmlFor="respondent-first-name"
                className="text-[#171717]"
              >
                Imię
              </Label>

              <Input
                id="respondent-first-name"
                name="firstName"
                placeholder="Anna"
                maxLength={180}
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label
                htmlFor="respondent-last-name"
                className="text-[#171717]"
              >
                Nazwisko
              </Label>

              <Input
                id="respondent-last-name"
                name="lastName"
                placeholder="Kowalska"
                maxLength={180}
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label
                htmlFor="respondent-organization"
                className="text-[#171717]"
              >
                Organizacja
              </Label>

              <select
                id="respondent-organization"
                name="clientOrganizationId"
                className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                defaultValue=""
              >
                <option value="">Brak</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="respondent-unit" className="text-[#171717]">
                Jednostka
              </Label>

              <select
                id="respondent-unit"
                name="clientUnitId"
                className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                defaultValue=""
              >
                <option value="">Brak</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
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
              <IdCard size={14} />
              Respondent zostanie przypisany do partnera:{" "}
              <span className="font-mono text-[#171717]">{tenantSlug}</span>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
            >
              <PlusCircle size={16} />
              {isPending ? "Tworzenie..." : "Utwórz respondenta"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
