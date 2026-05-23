"use client";

import { useActionState } from "react";
import { CheckCircle2, FileText, PlusCircle, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createQuestionnaireAction,
  type QuestionnaireAdminActionState,
} from "../api/questionnaire-admin.actions";

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

export function CreateQuestionnaireForm() {
  const [state, formAction, isPending] = useActionState(
    createQuestionnaireAction,
    initialState,
  );

  return (
    <section className="rounded-[2rem] hv-brand-card">
      <form
        action={formAction}
        className="grid gap-6 p-5 md:p-6 lg:grid-cols-[0.85fr_1.15fr]"
      >
        <div className="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <PlusCircle size={20} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
              Nowe narzędzie
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Utwórz bazową definicję kwestionariusza.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280]">
              Tutaj powstaje główny rekord narzędzia. Strony, itemy, skale i
              konfigurację odpowiedzi dodasz później w konkretnej wersji.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4">
            <div className="flex gap-3">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-[#0f766e]"
              />

              <p className="text-sm leading-6 text-[#0f766e]">
                Definicja kwestionariusza jest kontenerem. Wersje zachowują
                odtwarzalność badań i raportów.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="questionnaire-code" className="text-[#171717]">
                Kod
              </Label>

              <Input
                id="questionnaire-code"
                name="code"
                placeholder="HUMANET_VALUES"
                required
                className="rounded-2xl border-black/10 bg-white font-mono text-sm"
              />

              <p className="text-xs leading-5 text-[#6b7280]">
                Stabilny identyfikator techniczny, np. HUMANET_VALUES.
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="questionnaire-name" className="text-[#171717]">
                Nazwa
              </Label>

              <Input
                id="questionnaire-name"
                name="name"
                placeholder="HUMANET Values"
                required
                className="rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label
                htmlFor="questionnaire-description"
                className="text-[#171717]"
              >
                Opis
              </Label>

              <textarea
                id="questionnaire-description"
                name="description"
                className="min-h-24 w-full rounded-2xl border border-black/10 bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                placeholder="Krótki opis przeznaczenia kwestionariusza"
              />
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
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                ) : null}

                <span>{state.message}</span>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-[#6b7280]">
              <FileText size={14} />
              Itemy dodasz po utworzeniu wersji.
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
            >
              <PlusCircle size={16} />
              {isPending ? "Tworzenie..." : "Utwórz kwestionariusz"}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}