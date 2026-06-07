// features/discount-codes/components/discount-code-create-form.tsx

"use client";

import { useActionState, useState } from "react";
import { PlusCircle, TicketPercent, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  createDiscountCodeAction,
  type CreateDiscountCodeFormState,
} from "../api/discount-code.actions";

const initialState: CreateDiscountCodeFormState = {
  status: "idle",
  message: "",
};

function Field({
  label,
  helper,
  children,
}: {
  label: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[#171717]">{label}</span>
      {children}
      {helper ? (
        <span className="block text-xs leading-5 text-[#6b7280]">{helper}</span>
      ) : null}
    </label>
  );
}

function ActionMessage({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message: string;
}) {
  if (status === "idle" || !message) return null;

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
        {status === "error" ? (
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        ) : (
          <TicketPercent size={16} className="mt-0.5 shrink-0" />
        )}

        <span>{message}</span>
      </div>
    </div>
  );
}

export function CreateDiscountCodeForm() {
  const [state, formAction, isPending] = useActionState(
    createDiscountCodeAction,
    initialState,
  );

  const [discountType, setDiscountType] = useState<"fixed_amount" | "percent">(
    "fixed_amount",
  );

  return (
    <section className="rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm">
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.12)] px-3 py-1 text-xs font-medium text-[#0f766e]">
          <TicketPercent size={13} />
          Nowy kod
        </div>

        <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-[#171717]">
          Utwórz kod rabatowy
        </h2>

        <p className="mt-1 text-sm leading-6 text-[#6b7280]">
          Kod może działać na odblokowanie raportu, zakup dostępów lub oba
          procesy. Rabat może zejść do 0 zł.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <ActionMessage status={state.status} message={state.message} />

        <Field label="Kod" helper="Np. HUMANET50, START20, RAPORT100.">
          <Input
            name="code"
            required
            minLength={3}
            maxLength={64}
            placeholder="HUMANET50"
            className="rounded-2xl border-black/10 bg-white"
          />
        </Field>

        <Field label="Nazwa">
          <Input
            name="name"
            required
            minLength={2}
            maxLength={160}
            placeholder="Promocja startowa"
            className="rounded-2xl border-black/10 bg-white"
          />
        </Field>

        <Field label="Opis">
          <Textarea
            name="description"
            placeholder="Krótki opis celu lub kampanii."
            className="min-h-24 rounded-2xl border-black/10 bg-white"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Status">
            <select
              name="status"
              defaultValue="active"
              className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm"
            >
              <option value="active">Aktywny</option>
              <option value="paused">Wstrzymany</option>
              <option value="archived">Archiwalny</option>
            </select>
          </Field>

          <Field label="Zakres">
            <select
              name="appliesTo"
              defaultValue="all_report_access"
              className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm"
            >
              <option value="all_report_access">Raporty i dostępy</option>
              <option value="report_unlock">Tylko odblokowanie raportu</option>
              <option value="report_access_purchase">
                Tylko zakup dostępów
              </option>
            </select>
          </Field>
        </div>

        <Field label="Typ rabatu">
          <select
            name="discountType"
            value={discountType}
            onChange={(event) =>
              setDiscountType(event.target.value as "fixed_amount" | "percent")
            }
            className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm"
          >
            <option value="fixed_amount">Kwota, np. 50 zł</option>
            <option value="percent">Procent, np. 20%</option>
          </select>
        </Field>

        {discountType === "fixed_amount" ? (
          <Field label="Kwota rabatu PLN">
            <Input
              name="discountValue"
              type="number"
              min="0.01"
              step="0.01"
              required
              placeholder="50.00"
              className="rounded-2xl border-black/10 bg-white"
            />
          </Field>
        ) : (
          <Field label="Procent rabatu" helper="Wpisz np. 20 dla 20%.">
            <Input
              name="discountPercent"
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              required
              placeholder="20"
              className="rounded-2xl border-black/10 bg-white"
            />
          </Field>
        )}

        <div className="rounded-[1.25rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.1)] p-4">
          <label className="flex items-start gap-3 text-sm leading-6 text-[#0f766e]">
            <input
              type="checkbox"
              name="allowZeroFinalPrice"
              defaultChecked
              className="mt-1"
            />
            <span>
              Pozwól, aby kod obniżył cenę do 0 zł. Wtedy dostęp zostanie
              utworzony bez przechodzenia przez płatność.
            </span>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Minimalna wartość zamówienia PLN">
            <Input
              name="minimumOrderValue"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="opcjonalnie"
              className="rounded-2xl border-black/10 bg-white"
            />
          </Field>

          <Field label="Maksymalny rabat PLN">
            <Input
              name="maximumDiscount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="opcjonalnie"
              className="rounded-2xl border-black/10 bg-white"
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Ważny od">
            <Input
              name="startsAt"
              type="datetime-local"
              className="rounded-2xl border-black/10 bg-white"
            />
          </Field>

          <Field label="Ważny do">
            <Input
              name="endsAt"
              type="datetime-local"
              className="rounded-2xl border-black/10 bg-white"
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Limit użyć">
            <Input
              name="maxRedemptions"
              type="number"
              min="1"
              step="1"
              placeholder="bez limitu"
              className="rounded-2xl border-black/10 bg-white"
            />
          </Field>

          <Field label="Limit / osobę">
            <Input
              name="maxRedemptionsPerUser"
              type="number"
              min="1"
              step="1"
              placeholder="bez limitu"
              className="rounded-2xl border-black/10 bg-white"
            />
          </Field>

          <Field label="Limit / partnera">
            <Input
              name="maxRedemptionsPerTenant"
              type="number"
              min="1"
              step="1"
              placeholder="bez limitu"
              className="rounded-2xl border-black/10 bg-white"
            />
          </Field>
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="w-full gap-2 rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
        >
          <PlusCircle size={16} />
          {isPending ? "Tworzenie..." : "Utwórz kod rabatowy"}
        </Button>
      </form>
    </section>
  );
}