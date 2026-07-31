"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  CreditCard,
  KeyRound,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  ApplyDiscountCodeForm,
} from "@/features/discount-codes";

import {
  redeemComparisonSpecialReportAccessCodeAction,
  unlockComparisonSpecialReportAccessAction,
  type UnlockSpecialReportAccessState,
} from "@/features/report-access/api/unlock-special-report-access.actions";

const initialState:
  UnlockSpecialReportAccessState = {
    status: "idle",
    message: "",
  };

type UnlockSpecialReportAccessFormProps = {
  tenantSlug: string;
  productId: string;
  reportTemplateVersionId: string;
  originalAmountCents: number;
  currency: string;
};

function HiddenFields({
  tenantSlug,
  productId,
  reportTemplateVersionId,
}: {
  tenantSlug: string;
  productId: string;
  reportTemplateVersionId: string;
}) {
  return (
    <>
      <input
        type="hidden"
        name="tenantSlug"
        value={tenantSlug}
      />

      <input
        type="hidden"
        name="productId"
        value={productId}
      />

      <input
        type="hidden"
        name="reportTemplateVersionId"
        value={
          reportTemplateVersionId
        }
      />
    </>
  );
}

function ActionMessage({
  state,
}: {
  state:
    UnlockSpecialReportAccessState;
}) {
  if (
    state.status !== "error" ||
    !state.message
  ) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
      <div className="flex gap-2">
        <TriangleAlert
          size={16}
          className="mt-0.5 shrink-0"
        />

        <span>{state.message}</span>
      </div>
    </div>
  );
}

function formatMoney({
  amountCents,
  currency,
}: {
  amountCents: number;
  currency: string;
}) {
  return new Intl.NumberFormat(
    "pl-PL",
    {
      style: "currency",
      currency:
        currency || "PLN",
    },
  ).format(
    amountCents / 100,
  );
}

export function UnlockSpecialReportAccessForm({
  tenantSlug,
  productId,
  reportTemplateVersionId,
  originalAmountCents,
  currency,
}: UnlockSpecialReportAccessFormProps) {
  const [
    appliedDiscount,
    setAppliedDiscount,
  ] = useState<{
    discountCode: string;
    discountAmountCents: number;
    finalAmountCents: number;
    isFullyDiscounted: boolean;
  } | null>(null);

  const [
    codeState,
    codeAction,
    codePending,
  ] = useActionState(
    redeemComparisonSpecialReportAccessCodeAction,
    initialState,
  );

  const [
    paymentState,
    paymentAction,
    paymentPending,
  ] = useActionState(
    unlockComparisonSpecialReportAccessAction,
    initialState,
  );

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-[1.5rem] border border-black/10 bg-white/65 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <KeyRound size={18} />
          </div>

          <div>
            <h3 className="text-lg font-semibold tracking-[-0.025em] text-[#171717]">
              Mam kod dostępu
            </h3>

            <p className="mt-1 text-sm leading-6 text-[#6b7280]">
              Wpisz kod otrzymany od
              organizacji lub Partnera
              HUMANET.
            </p>
          </div>
        </div>

        <form
          action={codeAction}
          className="mt-5 space-y-4"
        >
          <HiddenFields
            tenantSlug={tenantSlug}
            productId={productId}
            reportTemplateVersionId={
              reportTemplateVersionId
            }
          />

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input
              name="accessCode"
              placeholder="HV-XXXX-XXXX-XXXX-XXXX"
              autoComplete="off"
              className="h-11 rounded-2xl font-mono uppercase"
              required
            />

            <Button
              type="submit"
              disabled={codePending}
              className="rounded-full bg-[#171717] px-6 text-white hover:bg-[#2a2a2a]"
            >
              <KeyRound size={16} />

              {codePending
                ? "Sprawdzanie..."
                : "Użyj kodu dostępu"}
            </Button>
          </div>

          <ActionMessage
            state={codeState}
          />
        </form>
      </section>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-black/10" />

        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8b9099]">
          lub
        </span>

        <div className="h-px flex-1 bg-black/10" />
      </div>

      <section className="rounded-[1.5rem] border border-black/10 bg-white/65 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <CreditCard size={18} />
          </div>

          <div>
            <h3 className="text-lg font-semibold tracking-[-0.025em] text-[#171717]">
              Kup dostęp
            </h3>

            <p className="mt-1 text-sm leading-6 text-[#6b7280]">
              Przed przejściem do
              płatności możesz zastosować
              kod rabatowy.
            </p>
          </div>
        </div>

        <form
          action={paymentAction}
          className="mt-5 space-y-4"
        >
          <HiddenFields
            tenantSlug={tenantSlug}
            productId={productId}
            reportTemplateVersionId={
              reportTemplateVersionId
            }
          />

          <input
            type="hidden"
            name="discountCode"
            value={
              appliedDiscount
                ?.discountCode ?? ""
            }
          />

          <ApplyDiscountCodeForm
            context="report_unlock"
            originalAmountCents={
              originalAmountCents
            }
            tenantId={null}
            assessmentSessionId={null}
            onApplied={
              setAppliedDiscount
            }
          />

          <Button
            type="submit"
            disabled={paymentPending}
            size="lg"
            className="w-full rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
          >
            <CreditCard size={16} />

            {paymentPending
              ? "Przetwarzanie..."
              : appliedDiscount
                    ?.isFullyDiscounted
                ? "Odblokuj raport"
                : "Przejdź do płatności"}
          </Button>

          <ActionMessage
            state={paymentState}
          />

          <p className="text-xs leading-5 text-[#6b7280]">
            Cena przed rabatem:{" "}
            {formatMoney({
              amountCents:
                originalAmountCents,

              currency,
            })}
          </p>
        </form>
      </section>
    </div>
  );
}