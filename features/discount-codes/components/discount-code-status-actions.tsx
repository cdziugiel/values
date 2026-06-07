// features/discount-codes/components/discount-code-status-actions.tsx

"use client";

import { useActionState } from "react";
import { CheckCircle2, CirclePause, CircleSlash } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  updateDiscountCodeStatusAction,
  type UpdateDiscountCodeStatusState,
} from "../api/discount-code.actions";

const initialState: UpdateDiscountCodeStatusState = {
  status: "idle",
  message: "",
};

type DiscountCodeStatusActionsProps = {
  discountCodeId: string;
  currentStatus: "active" | "paused" | "archived";
};

function StatusButton({
  discountCodeId,
  status,
  children,
  variant = "secondary",
}: {
  discountCodeId: string;
  status: "active" | "paused" | "archived";
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive";
}) {
  const [_state, formAction, isPending] = useActionState(
    updateDiscountCodeStatusAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="discountCodeId" value={discountCodeId} />
      <input type="hidden" name="status" value={status} />

      <Button
        type="submit"
        size="sm"
        variant={variant}
        disabled={isPending}
        className="gap-2 rounded-full"
      >
        {children}
      </Button>
    </form>
  );
}

export function DiscountCodeStatusActions({
  discountCodeId,
  currentStatus,
}: DiscountCodeStatusActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus !== "active" ? (
        <StatusButton discountCodeId={discountCodeId} status="active">
          <CheckCircle2 size={14} />
          Aktywuj
        </StatusButton>
      ) : null}

      {currentStatus !== "paused" ? (
        <StatusButton discountCodeId={discountCodeId} status="paused">
          <CirclePause size={14} />
          Wstrzymaj
        </StatusButton>
      ) : null}

      {currentStatus !== "archived" ? (
        <StatusButton
          discountCodeId={discountCodeId}
          status="archived"
          variant="destructive"
        >
          <CircleSlash size={14} />
          Archiwizuj
        </StatusButton>
      ) : null}
    </div>
  );
}