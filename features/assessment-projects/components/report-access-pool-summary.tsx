// features/partner-assessment/components/report-access-pool-summary.tsx

import { AlertTriangle, CheckCircle2, KeyRound, PackageCheck } from "lucide-react";

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

function percent(value: number, total: number) {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
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

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-3 shadow-sm">
      <div className="text-xs font-medium text-[#6b7280]">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#171717]">
        {value}
      </div>
    </div>
  );
}

export function ReportAccessPoolSummary({
  products,
}: ReportAccessPoolSummaryProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
        Brak aktywnych produktów dostępu do raportów.
      </div>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {products.map((product) => {
        const available = numberValue(product.availableCount);
        const assigned = numberValue(product.assignedCount);
        const redeemed = numberValue(product.redeemedCount);
        const expired = numberValue(product.expiredCount);
        const cancelled = numberValue(product.cancelledCount);
        const total = numberValue(product.totalCount);
        const unavailable = expired + cancelled;
        const useRate = percent(redeemed, total);

        return (
          <article
            key={product.id}
            className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-[#8b9099]">
                  {product.code}
                </p>

                <h3 className="mt-1 text-lg font-semibold leading-6 tracking-[-0.03em] text-[#171717]">
                  {product.name}
                </h3>

                <p className="mt-2 text-xs text-[#6b7280]">
                  Cena:{" "}
                  <span className="font-semibold text-[#171717]">
                    {formatMoney(product.priceGross, product.currency ?? "PLN")}
                  </span>
                </p>
              </div>

              <div
                className={[
                  "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium",
                  available > 0
                    ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
                    : "border-amber-200 bg-amber-50 text-amber-800",
                ].join(" ")}
              >
                {available > 0 ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                wolne: {available}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <MiniMetric label="Wszystkie" value={total} />
              <MiniMetric label="Wykorzystane" value={redeemed} />
              <MiniMetric label="Przypisane" value={assigned} />
              <MiniMetric label="Niedostępne" value={unavailable} />
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-medium text-[#6b7280]">Wykorzystanie</span>
                <span className="font-semibold text-[#171717]">{useRate}%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf]"
                  style={{ width: `${Math.max(0, Math.min(100, useRate))}%` }}
                />
              </div>
            </div>

            {available === 0 ? (
              <div className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                <div className="mb-1 flex items-center gap-2 font-semibold text-amber-900">
                  <KeyRound size={14} />
                  Brak wolnych dostępów
                </div>
                Aby nadać raport kolejnym respondentom, trzeba dokupić lub
                wygenerować pulę dostępów.
              </div>
            ) : (
              <div className="mt-5 rounded-[1.25rem] border border-black/10 bg-white/60 p-4 text-xs leading-5 text-[#6b7280]">
                <div className="mb-1 flex items-center gap-2 font-semibold text-[#171717]">
                  <PackageCheck size={14} />
                  Pula gotowa do użycia
                </div>
                Dostępy możesz nadawać respondentom z poziomu listy sesji.
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
