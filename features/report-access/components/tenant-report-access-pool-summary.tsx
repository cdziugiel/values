// features/report-access/components/tenant-report-access-pool-summary.tsx

import { CheckCircle2, PackageCheck, Ticket, TriangleAlert } from "lucide-react";

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

function percent(value: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
}

function PoolMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1.25rem] border border-black/10 bg-white/65 p-4">
      <div className="text-xs font-medium text-[#6b7280]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-[#171717]">
        {value}
      </div>
    </div>
  );
}

function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
      {children}
    </div>
  );
}

export function TenantReportAccessPoolSummary({
  pool,
}: TenantReportAccessPoolSummaryProps) {
  const totalCodes = pool.reduce((sum, item) => sum + item.total, 0);
  const availableCodes = pool.reduce((sum, item) => sum + item.available, 0);
  const redeemedCodes = pool.reduce((sum, item) => sum + item.redeemed, 0);

  return (
    <section className="space-y-5">
      <header className="rounded-[2rem] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              <PackageCheck size={20} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
                Pula dostępów
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                Dostępy raportowe partnera
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">
                Globalny stan dostępów raportowych zakupionych lub
                wygenerowanych dla tego partnera.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-80">
            <PoolMetric label="Wszystkie" value={totalCodes} />
            <PoolMetric label="Wolne" value={availableCodes} />
            <PoolMetric label="Użyte" value={redeemedCodes} />
          </div>
        </div>
      </header>

      {pool.length === 0 ? (
        <EmptyPanel>
          Partner nie ma jeszcze żadnych dostępów raportowych.
        </EmptyPanel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pool.map((item) => {
            const unavailable = item.expired + item.cancelled;
            const usedPercent = percent(item.redeemed, item.total);
            const availablePercent = percent(item.available, item.total);

            return (
              <article
                key={item.productId}
                className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-[#6b7280]">
                      {item.productCode}
                    </div>

                    <h3 className="mt-1 text-lg font-semibold leading-6 tracking-[-0.03em] text-[#171717]">
                      {item.productName}
                    </h3>

                    <p className="mt-1 text-sm text-[#6b7280]">
                      Cena: {formatMoney(item.priceGross, item.currency)}
                    </p>
                  </div>

                  <div
                    className={[
                      "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
                      item.available > 0
                        ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
                        : "border-amber-200 bg-amber-50 text-amber-800",
                    ].join(" ")}
                  >
                    {item.available > 0 ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <TriangleAlert size={13} />
                    )}
                    wolne: {item.available}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#6b7280]">
                      Wykorzystanie
                    </span>
                    <span className="font-semibold text-[#171717]">
                      {usedPercent}%
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf]"
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <PoolMetric label="Wszystkie" value={item.total} />
                  <PoolMetric label="Wolne" value={item.available} />
                  <PoolMetric label="Przypisane" value={item.assigned} />
                  <PoolMetric label="Użyte" value={item.redeemed} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#6b7280]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/70 px-2.5 py-1">
                    <Ticket size={12} />
                    wolne {availablePercent}%
                  </span>

                  <span className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1">
                    niedostępne: {unavailable}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
