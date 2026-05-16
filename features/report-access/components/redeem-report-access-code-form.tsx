"use client";

import { useActionState } from "react";

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
    <form action={formAction} className="space-y-3 rounded-2xl border bg-card p-5">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="sessionId" value={sessionId} />

      <div>
        <h3 className="text-base font-semibold">Mam kod dostępu</h3>

        <p className="mt-1 text-sm text-muted-foreground">
          Wpisz kod, aby odblokować raport dla tej zakończonej sesji.
        </p>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <Input
          name="accessCode"
          placeholder="HV-XXXX-XXXX-XXXX-XXXX"
          autoComplete="off"
          className="font-mono"
          required
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Sprawdzanie..." : "Odblokuj kodem"}
        </Button>
      </div>

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