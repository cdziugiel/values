type TenantReportAccessPoolItem = {
  productId: string;
  productCode: string;
  productName: string;
  currency: string;
  priceGross: string | number;

  available: number;
  assigned: number;
  redeemed: number;
  expired: number;
  cancelled: number;
  total: number;
};

type TenantReportAccessPoolSummaryProps = {
  pool: TenantReportAccessPoolItem[];
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

export function TenantReportAccessPoolSummary({
  pool,
}: TenantReportAccessPoolSummaryProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Pula dostępów tenanta</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Globalny stan dostępów raportowych zakupionych lub wygenerowanych dla
          tego tenanta.
        </p>
      </div>

      {pool.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
          Tenant nie ma jeszcze żadnych dostępów raportowych.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pool.map((item) => (
            <div key={item.productId} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    {item.productCode}
                  </div>
                  <h3 className="mt-1 font-semibold">{item.productName}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cena: {formatMoney(item.priceGross, item.currency)}
                  </p>
                </div>

                <div
                  className={
                    item.available > 0
                      ? "rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-800"
                      : "rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900"
                  }
                >
                  wolne: {item.available}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Wszystkie</div>
                  <div className="mt-1 text-xl font-semibold">{item.total}</div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">
                    Wykorzystane
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {item.redeemed}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">
                    Przypisane
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {item.assigned}
                  </div>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">
                    Niedostępne
                  </div>
                  <div className="mt-1 text-xl font-semibold">
                    {item.expired + item.cancelled}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}