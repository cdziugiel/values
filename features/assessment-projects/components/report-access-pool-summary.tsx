type ReportAccessPoolProduct = {
  id: string;
  code: string;
  name: string;
  currency?: string | null;
  priceGross?: string | number | null;

  availableCount?: number | string | null;
  assignedCount?: number | string | null;
  redeemedCount?: number | string | null;
  expiredCount?: number | string | null;
  cancelledCount?: number | string | null;
  totalCount?: number | string | null;
};

type ReportAccessPoolSummaryProps = {
  products: ReportAccessPoolProduct[];
};

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}

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

export function ReportAccessPoolSummary({
  products,
}: ReportAccessPoolSummaryProps) {
  return (
    <section className="space-y-4">

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
          Brak aktywnych produktów dostępu do raportów.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const available = numberValue(product.availableCount);
            const assigned = numberValue(product.assignedCount);
            const redeemed = numberValue(product.redeemedCount);
            const expired = numberValue(product.expiredCount);
            const cancelled = numberValue(product.cancelledCount);
            const total = numberValue(product.totalCount);

            return (
              <div
                key={product.id}
                className="rounded-2xl border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase text-muted-foreground">
                      {product.code}
                    </div>

                    <h3 className="mt-1 font-semibold leading-6">
                      {product.name}
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Cena produktu:{" "}
                      {formatMoney(
                        product.priceGross,
                        product.currency ?? "PLN",
                      )}
                    </p>
                  </div>

                  <div
                    className={
                      available > 0
                        ? "rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-800"
                        : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900"
                    }
                  >
                    wolne: {available}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">
                      Wszystkie
                    </div>
                    <div className="mt-1 text-xl font-semibold">{total}</div>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">
                      Wykorzystane
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {redeemed}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">
                      Przypisane
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {assigned}
                    </div>
                  </div>

                  <div className="rounded-xl border bg-muted/20 p-3">
                    <div className="text-xs text-muted-foreground">
                      Niedostępne
                    </div>
                    <div className="mt-1 text-xl font-semibold">
                      {expired + cancelled}
                    </div>
                  </div>
                </div>

                {available === 0 ? (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    Brak wolnych dostępów. Aby nadać raport kolejnym
                    respondentom, trzeba dokupić lub wygenerować pulę dostępów.
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}