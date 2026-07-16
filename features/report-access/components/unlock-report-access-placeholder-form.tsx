// features/report-access/components/unlock-report-access-placeholder-form.tsx

"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, CreditCard, TriangleAlert } from "lucide-react";
import { ApplyDiscountCodeForm } from "@/features/discount-codes";
import { Button } from "@/components/ui/button";

import {
  unlockReportAccessPlaceholderAction,
  type UnlockReportAccessActionState,
} from "../api/report-access-purchase.actions";

const initialState: UnlockReportAccessActionState = {
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


function buildUnlockReportPermalink({
  tenantSlug,
  sessionId,
  mode,
  productId,
  reportTemplateVersionId,
  projectQuestionnaireId,
  questionnaireVersionId,
}: {
  tenantSlug: string;
  sessionId: string;
  mode?: "standard" | "comparison";
  productId?: string | null;
  reportTemplateVersionId?: string | null;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {
  const params = new URLSearchParams({
    tenant: tenantSlug,
  });

  if (mode && mode !== "standard") {
    params.set("mode", mode);
  }

  if (productId) {
    params.set("product", productId);
  }

  if (reportTemplateVersionId) {
    params.set("reportTemplateVersionId", reportTemplateVersionId);
  }

  if (projectQuestionnaireId) {
    params.set("projectQuestionnaireId", projectQuestionnaireId);
  }

  if (questionnaireVersionId) {
    params.set("questionnaireVersionId", questionnaireVersionId);
  }

  return `/my/assessment/sessions/${sessionId}/unlock-report?${params.toString()}`;
}



export function UnlockReportAccessPlaceholderForm({
  tenantSlug,
  sessionId,
  originalAmountCents,
  currency,
  mode = "standard",
  productId = null,
  reportTemplateVersionId = null,
  projectQuestionnaireId = null,
  questionnaireVersionId = null,
}: {
  tenantSlug: string;
  sessionId: string;
  originalAmountCents: number;
  currency: string;
  mode?: "standard" | "comparison";
  productId?: string | null;
  reportTemplateVersionId?: string | null;
  projectQuestionnaireId?: string | null;
  questionnaireVersionId?: string | null;
}) {

  
const actionPermalink = buildUnlockReportPermalink({
  tenantSlug,
  sessionId,
  mode,
  productId,
  reportTemplateVersionId,
  projectQuestionnaireId,
  questionnaireVersionId,
});
console.log("UNLOCK_REPORT_CLIENT_FORM_PROPS", {
  tenantSlug,
  sessionId,
  mode,
  productId,
  reportTemplateVersionId,
  projectQuestionnaireId,
  questionnaireVersionId,
  actionPermalink,
});
const [state, formAction, isPending] = useActionState(
  unlockReportAccessPlaceholderAction,
  initialState,
  actionPermalink,
);
const [appliedDiscount, setAppliedDiscount] = useState<{
  discountCode: string;
  discountAmountCents: number;
  finalAmountCents: number;
  isFullyDiscounted: boolean;
} | null>(null);
  return (
    <form
  action={formAction}
  className="mt-5 space-y-4"
  onSubmit={(event) => {
    const form = event.currentTarget;
    const data = new FormData(form);

    console.log("UNLOCK_REPORT_FORM_SUBMIT_VALUES", {
      tenantSlug: data.get("tenantSlug"),
      sessionId: data.get("sessionId"),
      mode: data.get("mode"),
      productId: data.get("productId"),
      reportTemplateVersionId: data.get("reportTemplateVersionId"),
      projectQuestionnaireId: data.get("projectQuestionnaireId"),
      questionnaireVersionId: data.get("questionnaireVersionId"),
      discountCode: data.get("discountCode"),
    });
  }}
>
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="mode" value={mode} />
      <input
  type="hidden"
  name="projectQuestionnaireId"
  value={projectQuestionnaireId ?? ""}
/>

<input
  type="hidden"
  name="questionnaireVersionId"
  value={questionnaireVersionId ?? ""}
/>

{productId ? (
  <input type="hidden" name="productId" value={productId} />
) : null}

{reportTemplateVersionId ? (
  <input
    type="hidden"
    name="reportTemplateVersionId"
    value={reportTemplateVersionId}
  />
) : null}
      <input
        type="hidden"
        name="discountCode"
        value={appliedDiscount?.discountCode ?? ""}
      />
      <ApplyDiscountCodeForm
        context="report_unlock"
        originalAmountCents={originalAmountCents}
        tenantId={null}
        assessmentSessionId={sessionId}
        onApplied={setAppliedDiscount}
      />
      <Button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] sm:w-auto"
      >
        <CreditCard size={16} />
        {isPending
          ? "Przetwarzanie..."
          : appliedDiscount?.isFullyDiscounted
            ? "Odblokuj raport"
            : "Przejdź do płatności"}
      </Button>

      <ActionMessage status={state.status} message={state.message} />
    </form>
  );
}
