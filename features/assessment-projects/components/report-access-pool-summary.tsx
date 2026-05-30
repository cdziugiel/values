import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  PackageCheck,
} from "lucide-react";

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
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return "—";
  }

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(parsed);
}

function CompactMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[0.68rem] font-medium uppercase tracking-[0.12em] text-[#8b9099]">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-[#171717]">{value}</div>
    </div>
  );
}

function AvailabilityBadge({ available }: { available: number }) {
  const hasAvailable = available > 0;

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        hasAvailable
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-amber-200 bg-amber-50 text-amber-800",
      ].join(" ")}
    >
      {hasAvailable ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
      {hasAvailable ? `Wolne: ${available}` : "Brak wolnych"}
    </span>
  );
}

export function ReportAccessPoolSummary({
  products,
}: ReportAccessPoolSummaryProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 px-5 py-4 text-sm leading-6 text-[#6b7280] shadow-sm backdrop-blur">
        Brak aktywnych produktów dostępu do raportów.
      </div>
    );
  }

  const totalAvailable = products.reduce(
    (sum, product) => sum + numberValue(product.availableCount),
    0,
  );

  const totalAll = products.reduce(
    (sum, product) => sum + numberValue(product.totalCount),
    0,
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 rounded-[1.5rem]  px-5 py-4  md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#171717]">
            <PackageCheck size={16} className="text-[#0f766e]" />
            Pula dostępów
          </div>

        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-[#171717]">
            Produkty: {products.length}
          </span>

          <span className="inline-flex items-center rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
            Wolne: {totalAvailable}
          </span>

          <span className="inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-medium text-[#6b7280]">
            Wszystkie: {totalAll}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-sm">
        <div className="hidden grid-cols-[minmax(220px,1.4fr)_120px_90px_90px_90px_120px] gap-4 border-b border-black/10 bg-[#f7f7f8] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280] lg:grid">
          <div>Produkt</div>
          <div>Cena</div>
          <div>Wolne</div>
          <div>Użyte</div>
          <div>Razem</div>
          <div>Wykorzystanie</div>
        </div>

        <div className="divide-y divide-black/10">
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
                className="grid gap-4 bg-white px-4 py-4 transition hover:bg-[#fbfbfc] lg:grid-cols-[minmax(220px,1.4fr)_120px_90px_90px_90px_120px] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-sm font-semibold leading-5 text-[#171717]">
                      {product.name}
                    </h3>

                    <AvailabilityBadge available={available} />
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-[#6b7280]">
                    <span className="font-mono">{product.code}</span>

                    {assigned > 0 ? <span>Przypisane: {assigned}</span> : null}
                    {unavailable > 0 ? (
                      <span>Niedostępne: {unavailable}</span>
                    ) : null}
                  </div>

                  {available === 0 ? (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                      <KeyRound size={13} />
                      Dokup lub wygeneruj pulę dostępów
                    </div>
                  ) : null}
                </div>

                <div className="text-sm font-medium text-[#171717]">
                  {formatMoney(product.priceGross, product.currency ?? "PLN")}
                </div>

                <CompactMetric label="Wolne" value={available} />
                <CompactMetric label="Użyte" value={redeemed} />
                <CompactMetric label="Razem" value={total} />

                <div className="min-w-0">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#6b7280]">
                      {useRate}%
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf]"
                      style={{
                        width: `${Math.max(0, Math.min(100, useRate))}%`,
                      }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}