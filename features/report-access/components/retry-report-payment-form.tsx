"use client";

import {
  useActionState,
} from "react";

import { Button } from "@/components/ui/button";

import {
  retryReportAccessPaymentAction,
  type RetryReportPaymentActionState,
} from "../api/report-access-payment-retry.actions";

const initialState: RetryReportPaymentActionState = {
  status: "idle",
  message: "",
};

export function RetryReportPaymentForm({
  orderId,
  label = "Spróbuj ponownie",
}: {
  orderId: string;
  label?: string;
}) {
  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    retryReportAccessPaymentAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="space-y-3"
    >
      <input
        type="hidden"
        name="orderId"
        value={orderId}
      />

      <Button
        type="submit"
        variant="outline"
        disabled={isPending}
      >
        {isPending
          ? "Przekierowywanie..."
          : label}
      </Button>

      {state.status === "error" ? (
        <p
          role="alert"
          className="text-sm text-destructive"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}