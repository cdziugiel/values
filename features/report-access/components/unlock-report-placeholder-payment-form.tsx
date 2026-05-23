// features/report-access/components/unlock-report-placeholder-payment-form.tsx

"use client";

import { useActionState } from "react";
import { CheckCircle2, CreditCard, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  unlockReportWithPlaceholderPaymentAction,
  type ReportAccessActionState,
} from "../api/report-access.actions";

const initialState: ReportAccessActionState = {
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
  if (status === "idle") return null;

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

export function UnlockReportPlaceholderPaymentForm({
  tenantSlug,
  sessionId,
}: {
  tenantSlug: string;
  sessionId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    unlockReportWithPlaceholderPaymentAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="sessionId" value={sessionId} />

      <Button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
      >
        <CreditCard size={16} />
        {isPending
          ? "Odblokowywanie raportu..."
          : "Przejdź przez placeholder płatności i odblokuj raport"}
      </Button>

      <ActionMessage status={state.status} message={state.message} />
    </form>
  );
}
