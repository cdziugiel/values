"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  unlockReportWithPlaceholderPaymentAction,
  type ReportAccessActionState,
} from "../api/report-access.actions";

const initialState: ReportAccessActionState = {
  status: "idle",
  message: "",
};

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
    <form action={formAction} className="mt-5 space-y-3">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="sessionId" value={sessionId} />

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending
          ? "Odblokowywanie raportu..."
          : "Przejdź przez placeholder płatności i odblokuj raport"}
      </Button>

      {state.status !== "idle" ? (
        <p
          className={
            state.status === "success"
              ? "text-sm text-green-700"
              : "text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}