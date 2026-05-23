"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Building2, CheckCircle2, PlusCircle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createTenantAction,
  type CreateTenantActionState,
} from "../api/tenant.actions";

const initialCreateTenantActionState: CreateTenantActionState = {
  status: "idle",
  message: "",
};

export function CreateTenantForm() {
  const [state, formAction, isPending] = useActionState(
    createTenantAction,
    initialCreateTenantActionState,
  );

  return (
    <section className="rounded-[2rem] hv-brand-card">
      <form action={formAction} className="grid gap-6 p-5 md:p-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <PlusCircle size={20} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
              Nowy partner
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Utwórz partnera i przygotuj jego środowisko.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280]">
              System utworzy rekord partnera, przygotuje osobną bazę danych i
              wykona migracje. Jeśli podasz ownera, otrzyma on rolę właściciela
              partnera.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4">
            <div className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-[#0f766e]"
              />

              <p className="text-sm leading-6 text-[#0f766e]">
                Partner otrzymuje własny kontekst i osobną bazę danych. To
                wzmacnia izolację danych i ułatwia obsługę klientów enterprise.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name" className="text-[#171717]">
                Nazwa partnera
              </Label>

              <Input
                id="name"
                name="name"
                placeholder="ACME Consulting"
                required
                minLength={2}
                maxLength={160}
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-[#171717]">
                Slug
              </Label>

              <Input
                id="slug"
                name="slug"
                placeholder="acme"
                required
                minLength={2}
                maxLength={48}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                className="rounded-2xl border-black/10 bg-white font-mono text-sm"
              />

              <p className="text-xs leading-5 text-[#6b7280]">
                Małe litery, cyfry i myślniki. Przykład:{" "}
                <code>acme</code>.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ownerEmail" className="text-[#171717]">
                Owner partnera
              </Label>

              <Input
                id="ownerEmail"
                name="ownerEmail"
                type="email"
                placeholder="owner@firma.pl"
                className="rounded-2xl border-black/10 bg-white"
              />

              <p className="text-xs leading-5 text-[#6b7280]">
                Jeśli użytkownik nie istnieje, system utworzy konto i nada mu
                rolę TENANT_OWNER.
              </p>
            </div>
          </div>

          {state.status !== "idle" ? (
            <div
              className={[
                "mt-5 rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
                state.status === "success"
                  ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
                  : "border-red-200 bg-red-50 text-red-700",
              ].join(" ")}
            >
              <div className="flex gap-2">
                {state.status === "success" ? (
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                ) : null}

                <div>
                  <div>{state.message}</div>

                  {state.status === "success" && state.tenantSlug ? (
                    <Link
                      href={`/t/${state.tenantSlug}/dashboard`}
                      className="mt-2 inline-flex items-center gap-1 font-semibold underline underline-offset-4"
                    >
                      Przejdź do panelu partnera
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-[#6b7280]">
              <Building2 size={14} />
              Utworzenie partnera uruchamia provisioning środowiska.
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
            >
              {isPending ? "Tworzenie partnera..." : "Utwórz partnera"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}