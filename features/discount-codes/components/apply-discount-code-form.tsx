"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { validateDiscountCodeForCheckoutAction } from "../api/discount-code.actions";

type AppliedDiscount = {
  discountCode: string;
  discountCodeId: string;
  discountAmountCents: number;
  finalAmountCents: number;
  isFullyDiscounted: boolean;
};

type ApplyDiscountCodeFormProps = {
  context: "report_unlock" | "report_access_purchase";
  originalAmountCents: number;
  tenantId?: string | null;
  assessmentSessionId?: string | null;
  onApplied: (discount: AppliedDiscount | null) => void;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(cents / 100);
}

export function ApplyDiscountCodeForm({
  context,
  originalAmountCents,
  tenantId,
  assessmentSessionId,
  onApplied,
}: ApplyDiscountCodeFormProps) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApply() {
    setMessage(null);

    startTransition(async () => {
      const result = await validateDiscountCodeForCheckoutAction({
        code,
        context,
        originalAmountCents,
        tenantId,
        assessmentSessionId,
        currency: "PLN",
      });

      if (!result.ok) {
        onApplied(null);
        setMessage(result.message);
        return;
      }

      onApplied({
        discountCode: code,
        discountCodeId: result.discountCodeId,
        discountAmountCents: result.discountAmountCents,
        finalAmountCents: result.finalAmountCents,
        isFullyDiscounted: result.finalAmountCents === 0,
      });

      setMessage(
        result.finalAmountCents === 0
          ? "Kod pokrywa całą kwotę. Dostęp zostanie odblokowany bez płatności."
          : `Kod zastosowany. Nowa kwota: ${formatMoney(result.finalAmountCents)}.`,
      );
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Kod rabatowy"
          autoComplete="off"
        />

        <Button
          type="button"
          variant="secondary"
          disabled={isPending || code.trim().length < 3}
          onClick={handleApply}
        >
          {isPending ? "Sprawdzam..." : "Zastosuj"}
        </Button>
      </div>

      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}
    </div>
  );
}