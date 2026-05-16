"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import {
  unlockReportAccessPlaceholderAction,
  type UnlockReportAccessActionState,
} from "../api/report-access-purchase.actions";

const initialState: UnlockReportAccessActionState = {
  status: "idle",
  message: "",
};

export function UnlockReportAccessPlaceholderForm({
  tenantSlug,
  sessionId,
}: {
  tenantSlug: string;
  sessionId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    unlockReportAccessPlaceholderAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-5 space-y-4">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="sessionId" value={sessionId} />

      {state.status !== "idle" ? (
        <div
          className={
            state.status === "success"
              ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {state.message}
        </div>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending
          ? "Odblokowywanie raportu..."
          : "Symuluj płatność i odblokuj raport"}
      </Button>
    </form>
  );
}