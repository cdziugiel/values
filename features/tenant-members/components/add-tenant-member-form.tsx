// features/tenant-members/components/add-tenant-member-form.tsx

"use client";

import { useActionState } from "react";
import { CheckCircle2, MailPlus, ShieldCheck, TriangleAlert, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  addTenantMemberAction,
  type TenantMemberActionState,
} from "../api/tenant-member.actions";
import { TENANT_MEMBER_ROLE_OPTIONS } from "../forms/tenant-member.schema";

type AddTenantMemberFormProps = {
  tenantSlug: string;
  canInvite: boolean;
};

const initialState: TenantMemberActionState = {
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

export function AddTenantMemberForm({
  tenantSlug,
  canInvite,
}: AddTenantMemberFormProps) {
  const [state, formAction, isPending] = useActionState(
    addTenantMemberAction,
    initialState,
  );

  if (!canInvite) {
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
              Nowy członek zespołu
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Dodaj użytkownika do partnera.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280]">
              Jeśli użytkownik nie istnieje, system utworzy konto. Logowanie
              nadal odbywa się przez magic link, więc nie musisz ustawiać hasła.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4">
            <div className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-[#0f766e]"
              />

              <p className="text-sm leading-6 text-[#0f766e]">
                Rola określa zakres dostępu w obrębie partnera. Status możesz
                później zmienić w ustawieniach członka zespołu.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="member-email" className="text-[#171717]">
                Email
              </Label>

              <Input
                id="member-email"
                name="email"
                type="email"
                placeholder="osoba@firma.pl"
                required
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-name" className="text-[#171717]">
                Nazwa / imię
              </Label>

              <Input
                id="member-name"
                name="name"
                placeholder="Jan Kowalski"
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-role" className="text-[#171717]">
                Rola
              </Label>

              <select
                id="member-role"
                name="role"
                defaultValue="TENANT_MEMBER"
                className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              >
                {TENANT_MEMBER_ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
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
              <MailPlus size={14} />
              Dostęp będzie przypisany do partnera:{" "}
              <span className="font-mono text-[#171717]">{tenantSlug}</span>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
            >
              <UserPlus size={16} />
              {isPending ? "Dodawanie..." : "Dodaj członka"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}