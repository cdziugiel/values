"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  grantPartnerReportAccessAction,
  type PartnerGrantReportAccessState,
} from "../api/partner-report-access.actions";

const initialState: PartnerGrantReportAccessState = {
  status: "idle",
  message: "",
};

type GrantPartnerReportAccessFormProps = {
  tenantSlug: string;
  assessmentProjectId: string;
  productId: string;
  reportTemplateVersionId: string;
  reportTemplateKind: string;
  subjectType: string;
  subjectId: string;
  disabled?: boolean;
};

export function GrantPartnerReportAccessForm({
  tenantSlug,
  assessmentProjectId,
  productId,
  reportTemplateVersionId,
  reportTemplateKind,
  subjectType,
  subjectId,
  disabled = false,
}: GrantPartnerReportAccessFormProps) {
  const [state, formAction, isPending] = useActionState(
    grantPartnerReportAccessAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input
        type="hidden"
        name="assessmentProjectId"
        value={assessmentProjectId}
      />
      <input type="hidden" name="productId" value={productId} />
      <input
        type="hidden"
        name="reportTemplateVersionId"
        value={reportTemplateVersionId}
      />
      <input type="hidden" name="reportTemplateKind" value={reportTemplateKind} />
      <input type="hidden" name="subjectType" value={subjectType} />
      <input type="hidden" name="subjectId" value={subjectId} />

      <Button
        type="submit"
        size="sm"
        disabled={disabled || isPending}
        className="rounded-full bg-[#171717] text-white shadow-sm hover:bg-[#2a2a2a]"
      >
        <KeyRound size={14} />
        {isPending ? "Aktywowanie..." : "Użyj dostępu"}
      </Button>

      {state.status !== "idle" && state.message ? (
        <p
          className={[
            "max-w-72 text-xs leading-5",
            state.status === "success" ? "text-[#0f766e]" : "text-red-700",
          ].join(" ")}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}