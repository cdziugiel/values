// features/partner-assessment/components/grant-report-access-to-session-form.tsx

"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  FileText,
  KeyRound,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  grantReportAccessToCompletedSessionAction,
  type PartnerGrantReportAccessState,
} from "../api/partner-report-access.actions";

const initialState: PartnerGrantReportAccessState = {
  status: "idle",
  message: "",
};

type ReportAccessProductOption = {
  id: string;
  code: string;
  name: string;
  reportTemplateId: string;
  currency?: string | null;
  priceGross?: string | number | null;
  availableCount?: number | string | null;
};

type GrantReportAccessToSessionFormProps = {
  tenantSlug: string;
  sessionId: string;
  products: ReportAccessProductOption[];
};

function formatMoney(value: unknown, currency = "PLN") {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "—";
  }

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(numberValue);
}

function getAvailableCount(product: ReportAccessProductOption) {
  const count = Number(product.availableCount ?? 0);

  return Number.isFinite(count) ? count : 0;
}

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
        "max-w-96 text-right text-xs leading-5",
        status === "success" ? "text-[#0f766e]" : "text-red-700",
      ].join(" ")}
    >
      {message}
    </p>
  );
}

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-80 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
      <div className="flex gap-2">
        <TriangleAlert size={14} className="mt-0.5 shrink-0" />
        <span>{children}</span>
      </div>
    </div>
  );
}

export function GrantReportAccessToSessionForm({
  tenantSlug,
  sessionId,
  products,
}: GrantReportAccessToSessionFormProps) {
  const [state, formAction, isPending] = useActionState(
    grantReportAccessToCompletedSessionAction,
    initialState,
  );

  const availableProducts = useMemo(
    () => products.filter((product) => getAvailableCount(product) > 0),
    [products],
  );

  const [selectedProductId, setSelectedProductId] = useState(
    availableProducts[0]?.id ?? "",
  );

  const selectedProduct = useMemo(
    () =>
      availableProducts.find((product) => product.id === selectedProductId) ??
      null,
    [availableProducts, selectedProductId],
  );

  if (products.length === 0) {
    return <WarningBox>Brak aktywnego produktu dostępu do raportu.</WarningBox>;
  }

  if (availableProducts.length === 0) {
    return (
      <WarningBox>
        Brak wolnych dostępów w puli. Najpierw kup lub wygeneruj dostęp dla
        partnera.
      </WarningBox>
    );
  }

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex flex-wrap justify-end gap-2">
        <input type="hidden" name="tenantSlug" value={tenantSlug} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <input
          type="hidden"
          name="productId"
          value={selectedProduct?.id ?? ""}
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="max-w-72 justify-between gap-2 rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText size={14} className="shrink-0" />
                <span className="truncate">
                  {selectedProduct
                    ? selectedProduct.name
                    : "Wybierz typ raportu"}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[#6b7280]" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="end"
            className="w-[min(calc(100vw-2rem),420px)] rounded-[1.5rem] border-black/10 bg-white/95 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur"
          >
            <div className="space-y-1">
              {availableProducts.map((product) => {
                const selected = product.id === selectedProductId;
                const availableCount = getAvailableCount(product);

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedProductId(product.id)}
                    className={[
                      "w-full rounded-[1.25rem] border px-3 py-3 text-left text-sm transition",
                      selected
                        ? "border-[#171717] bg-[#171717] text-white shadow-sm"
                        : "border-black/10 bg-white/70 text-[#171717] hover:bg-white hover:shadow-sm",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">
                          {product.name}
                        </div>

                        <div
                          className={[
                            "mt-1 truncate font-mono text-xs",
                            selected ? "text-white/70" : "text-[#6b7280]",
                          ].join(" ")}
                        >
                          {product.code}
                        </div>
                      </div>

                      <div
                        className={[
                          "shrink-0 text-right text-xs",
                          selected ? "text-white/70" : "text-[#6b7280]",
                        ].join(" ")}
                      >
                        <div>
                          {formatMoney(
                            product.priceGross,
                            product.currency ?? "PLN",
                          )}
                        </div>
                        <div>wolne: {availableCount}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="submit"
          size="sm"
          disabled={isPending || !selectedProduct}
          className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
        >
          <KeyRound size={14} />
          {isPending ? "Nadawanie..." : "Nadaj dostęp"}
        </Button>
      </form>

      {selectedProduct ? (
        <div className="text-right text-xs text-[#6b7280]">
          Wolne: {getAvailableCount(selectedProduct)} ·{" "}
          {formatMoney(
            selectedProduct.priceGross,
            selectedProduct.currency ?? "PLN",
          )}
        </div>
      ) : null}

      <ActionMessage status={state.status} message={state.message} />
    </div>
  );
}
