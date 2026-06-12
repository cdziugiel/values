"use client";

import { useActionState } from "react";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  unlockComparisonSpecialReportAccessAction,
  type UnlockSpecialReportAccessState,
} from "../api/unlock-special-report-access.actions";

const initialState: UnlockSpecialReportAccessState = {
  status: "idle",
  message: "",
};

type UnlockSpecialReportAccessFormProps = {
  tenantSlug: string;
  productId: string;
  reportTemplateVersionId: string;
};

export function UnlockSpecialReportAccessForm({
  tenantSlug,
  productId,
  reportTemplateVersionId,
}: UnlockSpecialReportAccessFormProps) {
  const [state, formAction, isPending] = useActionState(
    unlockComparisonSpecialReportAccessAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="productId" value={productId} />
      <input
        type="hidden"
        name="reportTemplateVersionId"
        value={reportTemplateVersionId}
      />

      {state.status === "error" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {state.message}
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-[#171717] px-6 text-white hover:bg-[#2a2a2a]"
      >
        <CreditCard size={16} />
        {isPending ? "Odblokowuję..." : "Odblokuj raport porównawczy"}
      </Button>
    </form>
  );
}