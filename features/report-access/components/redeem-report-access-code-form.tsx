// features/report-access/components/redeem-report-access-code-form.tsx

"use client";

import { useActionState } from "react";
import { CheckCircle2, KeyRound, ShieldCheck, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  redeemReportAccessCodeAction,
  type RedeemReportAccessCodeState,
} from "../api/report-access-code.actions";

const initialState: RedeemReportAccessCodeState = {
  status: "idle",
  message: "",
};

type RedeemReportAccessCodeFormProps = {
  tenantSlug: string;
  sessionId: string;
};

export function RedeemReportAccessCodeForm({
  tenantSlug,
  sessionId,
}: RedeemReportAccessCodeFormProps) {
  const [state, formAction, isPending] = useActionState(
    redeemReportAccessCodeAction,
    initialState,
  );

  return (
    <form action={formAction} className="rounded-[2rem] hv-brand-card p-5 md:p-6">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="sessionId" value={sessionId} />

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
            <KeyRound size={13} />
            Kod dostępu
          </div>

          <h3 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
            Odblokuj raport kodem
          </h3>

          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            Jeżeli masz kod dostępu otrzymany od Partnera, wprowadź to tutaj aby odblokować dostęp do raportu dla tej sesji.
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          <ShieldCheck size={19} />
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto] items-center">
        <Input
          name="accessCode"
          placeholder="HV-XXXX-XXXX-XXXX-XXXX"
          autoComplete="off"
          className="h-11 rounded-2xl border-black/10 bg-white font-mono text-sm uppercase tracking-[0.08em]"
          required
        />

        <Button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-[#171717] px-5 text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
        >
          <KeyRound size={16} />
          {isPending ? "Sprawdzanie..." : "Odblokuj raport"}
        </Button>
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
            ) : (
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            )}

            <span>{state.message}</span>
          </div>
        </div>
      ) : null}
    </form>
  );
}
