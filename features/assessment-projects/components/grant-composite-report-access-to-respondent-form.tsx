"use client";

import { useActionState } from "react";
import { KeyRound, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  grantCompositeReportAccessToRespondentAction,
  type PartnerGrantReportAccessState,
} from "../api/partner-report-access.actions";

const initialState: PartnerGrantReportAccessState = {
  status: "idle",
  message: "",
};

type GrantCompositeReportAccessToRespondentFormProps = {
  tenantSlug: string;
  assessmentProjectId: string;
  respondentId: string;
  productId: string;
  reportTemplateVersionId: string;
  disabled?: boolean;
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
    <p
      className={[
        "mt-2 max-w-96 text-xs leading-5",
        status === "success" ? "text-[#0f766e]" : "text-red-700",
      ].join(" ")}
    >
      {message}
    </p>
  );
}

export function GrantCompositeReportAccessToRespondentForm({
  tenantSlug,
  assessmentProjectId,
  respondentId,
  productId,
  reportTemplateVersionId,
  disabled = false,
}: GrantCompositeReportAccessToRespondentFormProps) {
  const [state, formAction, isPending] = useActionState(
    grantCompositeReportAccessToRespondentAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input
        type="hidden"
        name="assessmentProjectId"
        value={assessmentProjectId}
      />
      <input type="hidden" name="respondentId" value={respondentId} />
      <input type="hidden" name="productId" value={productId} />
      <input
        type="hidden"
        name="reportTemplateVersionId"
        value={reportTemplateVersionId}
      />

      <Button
        type="submit"
        size="sm"
        disabled={disabled || isPending}
        className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
      >
        <KeyRound size={14} />
        {isPending ? "Nadawanie..." : "Nadaj dostęp"}
      </Button>

      <ActionMessage status={state.status} message={state.message} />

      {disabled ? (
        <div className="mt-2 flex gap-2 text-xs leading-5 text-amber-800">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          Nie można nadać tego raportu.
        </div>
      ) : null}
    </form>
  );
}