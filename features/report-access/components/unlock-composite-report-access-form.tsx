"use client";

import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  CheckCircle2,
  CreditCard,
  KeyRound,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  ApplyDiscountCodeForm,
} from "@/features/discount-codes";

import {
  type ReportAccessActionState,
} from "../api/report-access.actions";

import {
  redeemCompositeReportAccessCodeAction,
  unlockCompositeReportAccessAction,
} from "../api/report-access-composite.actions";

const initialState: ReportAccessActionState = {
  status: "idle",
  message: "",
};

type SelectionMode =
  | "latest_completed"
  | "same_project"
  | "manual";

type SourceCandidate = {
  slot: string;
  label: string;
  questionnaireName: string;
  questionnaireId: string;
  questionnaireCode: string;
  required: boolean;

  candidates: {
    tenantSlug: string;

    assessmentSessionId: string;
    assessmentProjectId:
      | string
      | null;

    assessmentProjectName:
      | string
      | null;

    projectQuestionnaireId:
      | string
      | null;

    questionnaireId: string;

    questionnaireVersionId:
      | string
      | null;

    snapshotId: string;

    completedAt:
      | string
      | Date
      | null;
  }[];
};

type Props = {
  tenantSlugs: string[];
  reportTemplateVersionId: string;
  sourceCandidates: SourceCandidate[];

  originalAmountCents: number;
  currency: string;
};

function buildCandidateKey(
  candidate: {
    tenantSlug: string;
    assessmentSessionId: string;
    projectQuestionnaireId:
      | string
      | null;
  },
) {
  return [
    candidate.tenantSlug,
    candidate.assessmentSessionId,
    candidate.projectQuestionnaireId ??
      "",
  ].join(":");
}

function formatMoney({
  cents,
  currency,
}: {
  cents: number;
  currency: string;
}) {
  return new Intl.NumberFormat(
    "pl-PL",
    {
      style: "currency",
      currency:
        currency || "PLN",
    },
  ).format(cents / 100);
}

function ActionMessage({
  state,
}: {
  state: ReportAccessActionState;
}) {
  if (
    state.status === "idle" ||
    !state.message
  ) {
    return null;
  }

  const success =
    state.status === "success";

  return (
    <div
      className={[
        "rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
        success
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <div className="flex gap-2">
        {success ? (
          <CheckCircle2
            size={16}
            className="mt-0.5 shrink-0"
          />
        ) : (
          <TriangleAlert
            size={16}
            className="mt-0.5 shrink-0"
          />
        )}

        <span>{state.message}</span>
      </div>
    </div>
  );
}

function CompositeHiddenFields({
  tenantSlugs,
  reportTemplateVersionId,
  selectionMode,
  manualSelection,
}: {
  tenantSlugs: string[];
  reportTemplateVersionId: string;
  selectionMode: SelectionMode;
  manualSelection: string;
}) {
  return (
    <>
      <input
        type="hidden"
        name="tenantSlug"
        value={
          tenantSlugs[0] ?? ""
        }
      />

      {tenantSlugs.map(
        (tenantSlug) => (
          <input
            key={tenantSlug}
            type="hidden"
            name="tenantSlugs"
            value={tenantSlug}
          />
        ),
      )}

      <input
        type="hidden"
        name="reportTemplateVersionId"
        value={
          reportTemplateVersionId
        }
      />

      <input
        type="hidden"
        name="selectionMode"
        value={selectionMode}
      />

      <input
        type="hidden"
        name="manualSelection"
        value={manualSelection}
      />
    </>
  );
}

export function UnlockCompositeReportAccessForm({
  tenantSlugs,
  reportTemplateVersionId,
  sourceCandidates,
  originalAmountCents,
  currency,
}: Props) {
  const [
    selectionMode,
    setSelectionMode,
  ] = useState<SelectionMode>(
    "latest_completed",
  );

  const [
    manualBySlot,
    setManualBySlot,
  ] = useState<
    Record<string, string>
  >({});

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
    purchaseState,
    purchaseAction,
    purchasePending,
  ] = useActionState(
    unlockCompositeReportAccessAction,
    initialState,
  );

  const [
    codeState,
    codeAction,
    codePending,
  ] = useActionState(
    redeemCompositeReportAccessCodeAction,
    initialState,
  );

  const manualSelection =
    useMemo(() => {
      const bySlot: Record<
        string,
        {
          tenantSlug: string;
          assessmentSessionId: string;
          projectQuestionnaireId:
            | string
            | null;

          questionnaireVersionId:
            | string
            | null;
        }
      > = {};

      for (
        const source of
        sourceCandidates
      ) {
        const selectedKey =
          manualBySlot[source.slot];

        if (!selectedKey) {
          continue;
        }

        const candidate =
          source.candidates.find(
            (item) =>
              buildCandidateKey(
                item,
              ) === selectedKey,
          );

        if (!candidate) {
          continue;
        }

        bySlot[source.slot] = {
          tenantSlug:
            candidate.tenantSlug,

          assessmentSessionId:
            candidate
              .assessmentSessionId,

          projectQuestionnaireId:
            candidate
              .projectQuestionnaireId,

          questionnaireVersionId:
            candidate
              .questionnaireVersionId,
        };
      }

      return JSON.stringify({
        bySlot,
      });
    }, [
      manualBySlot,
      sourceCandidates,
    ]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] hv-brand-card p-6 md:p-8">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
          Wybierz dane źródłowe raportu
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">
          Ten sam wybór zostanie użyty
          niezależnie od tego, czy
          odblokujesz raport kodem
          dostępu, kodem rabatowym czy
          płatnością online.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            {
              value:
                "latest_completed",
              label:
                "Najnowsze ukończone",

              description:
                "Wybiera najnowszy ukończony wynik dla każdego źródła.",
            },
            {
              value:
                "same_project",

              label:
                "Ten sam projekt",

              description:
                "Preferuje wyniki pochodzące z jednego projektu.",
            },
            {
              value: "manual",

              label:
                "Wybierz ręcznie",

              description:
                "Pozwala wskazać konkretną sesję dla każdego źródła.",
            },
          ].map((option) => {
            const active =
              selectionMode ===
              option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setSelectionMode(
                    option.value as SelectionMode,
                  )
                }
                className={[
                  "rounded-2xl border p-4 text-left transition",
                  active
                    ? "border-[#2dd4bf] bg-[rgba(45,212,191,0.14)] shadow-sm"
                    : "border-black/10 bg-white hover:bg-[#f9fafb]",
                ].join(" ")}
              >
                <div className="text-sm font-semibold text-[#171717]">
                  {option.label}
                </div>

                <div className="mt-1 text-xs leading-5 text-[#6b7280]">
                  {option.description}
                </div>
              </button>
            );
          })}
        </div>

        {selectionMode ===
        "manual" ? (
          <div className="mt-5 space-y-4 rounded-[1.5rem] border border-black/10 bg-white/70 p-4">
            {sourceCandidates.map(
              (source) => (
                <label
                  key={source.slot}
                  className="block space-y-2"
                >
                  <span className="text-sm font-medium text-[#374151]">
                    {source.label ||
                      source.questionnaireName}

                    {source.required
                      ? " *"
                      : ""}
                  </span>

                  <select
                    value={
                      manualBySlot[
                        source.slot
                      ] ?? ""
                    }
                    onChange={(
                      event,
                    ) =>
                      setManualBySlot(
                        (current) => ({
                          ...current,

                          [source.slot]:
                            event.target
                              .value,
                        }),
                      )
                    }
                    className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                  >
                    <option value="">
                      Wybierz wynik
                    </option>

                    {source.candidates.map(
                      (candidate) => {
                        const key =
                          buildCandidateKey(
                            candidate,
                          );

                        return (
                          <option
                            key={key}
                            value={key}
                          >
                            {candidate
                              .assessmentProjectName ??
                              "Badanie publiczne"}{" "}
                            ·{" "}
                            {
                              candidate.tenantSlug
                            }{" "}
                            ·{" "}
                            {candidate.completedAt
                              ? new Date(
                                  candidate.completedAt,
                                ).toLocaleString(
                                  "pl-PL",
                                )
                              : "bez daty"}
                          </option>
                        );
                      },
                    )}
                  </select>
                </label>
              ),
            )}
          </div>
        ) : null}
      </section>

      <section className="rounded-[2rem] hv-brand-card p-6 md:p-8">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <KeyRound size={19} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
              Kod dostępu
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Odblokuj posiadanym kodem
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#6b7280]">
              Użyj kodu dostępu
              otrzymanego od organizacji,
              partnera albo w ramach
              zakupionej puli.
            </p>
          </div>
        </div>

        <form
          action={codeAction}
          className="mt-5 space-y-4"
        >
          <CompositeHiddenFields
            tenantSlugs={tenantSlugs}
            reportTemplateVersionId={
              reportTemplateVersionId
            }
            selectionMode={
              selectionMode
            }
            manualSelection={
              manualSelection
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

      <section className="rounded-[2rem] hv-brand-card p-6 md:p-8">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <CreditCard size={19} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
              Zakup raportu
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Przejdź do bezpiecznej
              płatności
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#6b7280]">
              Kod rabatowy możesz
              zastosować przed przejściem
              do Przelewy24.
            </p>

            <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#171717]">
              <ShieldCheck
                size={16}
                className="text-[#0f766e]"
              />

              Cena:{" "}
              {formatMoney({
                cents:
                  originalAmountCents,

                currency,
              })}
            </div>
          </div>
        </div>

        <form
          action={purchaseAction}
          className="mt-5 space-y-4"
        >
          <CompositeHiddenFields
            tenantSlugs={tenantSlugs}
            reportTemplateVersionId={
              reportTemplateVersionId
            }
            selectionMode={
              selectionMode
            }
            manualSelection={
              manualSelection
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
            disabled={
              purchasePending
            }
            size="lg"
            className="w-full rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
          >
            <CreditCard size={16} />

            {purchasePending
              ? "Przetwarzanie..."
              : appliedDiscount
                    ?.isFullyDiscounted
                ? "Odblokuj raport"
                : "Przejdź do płatności"}
          </Button>

          <ActionMessage
            state={purchaseState}
          />
        </form>
      </section>
    </div>
  );
}
