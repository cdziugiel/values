"use client";

import { useActionState, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

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
    return (
      <div className="max-w-64 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Brak aktywnego produktu dostępu do raportu.
      </div>
    );
  }

  if (availableProducts.length === 0) {
    return (
      <div className="max-w-72 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Brak wolnych dostępów w puli. Najpierw kup lub wygeneruj dostęp dla
        tenanta.
      </div>
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
              className="max-w-72 justify-between gap-2"
            >
              <span className="truncate">
                {selectedProduct
                  ? selectedProduct.name
                  : "Wybierz typ raportu"}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0" />
            </Button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-96 p-2">
            <div className="space-y-1">
              {availableProducts.map((product) => {
                const selected = product.id === selectedProductId;
                const availableCount = getAvailableCount(product);

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setSelectedProductId(product.id)}
                    className={
                      selected
                        ? "w-full rounded-md border bg-primary px-3 py-2 text-left text-sm text-primary-foreground"
                        : "w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-muted"
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {product.name}
                        </div>

                        <div
                          className={
                            selected
                              ? "mt-1 truncate text-xs text-primary-foreground/80"
                              : "mt-1 truncate text-xs text-muted-foreground"
                          }
                        >
                          {product.code}
                        </div>
                      </div>

                      <div
                        className={
                          selected
                            ? "shrink-0 text-right text-xs text-primary-foreground/80"
                            : "shrink-0 text-right text-xs text-muted-foreground"
                        }
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
        >
          {isPending ? "Nadawanie..." : "Nadaj dostęp"}
        </Button>
      </form>

      {selectedProduct ? (
        <div className="text-right text-xs text-muted-foreground">
          Wolne dostępy: {getAvailableCount(selectedProduct)} ·{" "}
          {formatMoney(
            selectedProduct.priceGross,
            selectedProduct.currency ?? "PLN",
          )}
        </div>
      ) : null}

      {state.status !== "idle" ? (
        <p
          className={
            state.status === "success"
              ? "max-w-96 text-right text-xs text-green-700"
              : "max-w-96 text-right text-xs text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}