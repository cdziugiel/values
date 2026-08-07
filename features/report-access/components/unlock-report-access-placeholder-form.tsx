// features/report-access/components/unlock-report-access-placeholder-form.tsx

"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, CreditCard, TriangleAlert } from "lucide-react";
import { ApplyDiscountCodeForm } from "@/features/discount-codes";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/features/consent";
// @humanet-marketing-patched:unlock-form
// @humanet-marketing-patched:unlock-form-v2

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
  purchaseIntentId = null,
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
  purchaseIntentId?: string | null;
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
  onSubmit={() => {
    trackEvent("begin_checkout", {
      product_code: purchaseIntentId ? "marketing_offer" : "report",
      surface: "values_checkout",
    });
  }}
>
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="mode" value={mode} />
      {purchaseIntentId ? (
        <input
          type="hidden"
          name="purchaseIntentId"
          value={purchaseIntentId}
        />
      ) : null}
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
      {purchaseIntentId ? (
        <label className="flex items-start gap-3 rounded-[1.25rem] border border-black/10 bg-white/70 p-4 text-sm leading-6 text-[#4b5563]">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="mt-1 h-5 w-5 shrink-0 accent-teal-700"
          />
          <span>
            Akceptuję{" "}
            <a
              href="/legal/regulamin"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#171717] underline underline-offset-4"
            >
              Regulamin HUMANET VALUES
            </a>
            . Informacje o przetwarzaniu danych znajdziesz w{" "}
            <a
              href="/legal/polityka-prywatnosci"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#171717] underline underline-offset-4"
            >
              Polityce prywatności
            </a>
            .
          </span>
        </label>
      ) : null}
      <Button
        type="submit"
        disabled={isPending}
        size="lg"
        className="w-full rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] "
      >
        <CreditCard size={16} />
        {isPending
          ? "Przetwarzanie..."
          : appliedDiscount?.isFullyDiscounted
            ? "Odblokuj raport"
            : purchaseIntentId
              ? "Kupuję i płacę"
              : "Przejdź do płatności"}
      </Button>

      <ActionMessage status={state.status} message={state.message} />
    </form>
  );
}
