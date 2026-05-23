// features/report-access/components/report-access-orders-history.tsx

import {
  CheckCircle2,
  Clock3,
  CreditCard,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Ticket,
  TriangleAlert,
  XCircle,
} from "lucide-react";

type ReportAccessOrderHistoryItem = {
  itemId: string;
  productId: string;
  quantity: number;
  unitGross: string | number;
  totalGross: string | number;
  productCode: string;
  productName: string;
};

type ReportAccessOrderHistoryOrder = {
  orderId: string;
  status: string;
  buyerType: string;
  tenantSlug: string | null;

  currency: string;
  totalNet: string | number;
  totalVat: string | number;
  totalGross: string | number;

  paymentProvider: string | null;
  paidAt: string | Date | null;
  createdAt: string | Date;

  items: ReportAccessOrderHistoryItem[];
  projectId?: string | null;
  source?: string | null;
  placeholderPayment?: boolean;
  invoiceRequested?: boolean;
  billingSnapshot?: unknown;
  codeStats: {
    available: number;
    assigned: number;
    redeemed: number;
    expired: number;
    cancelled: number;
    total: number;
  };
};

type ReportAccessOrdersHistoryProps = {
  orders: ReportAccessOrderHistoryOrder[];
};

function formatDateTime(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

function getOrderStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "Szkic";
    case "pending_payment":
      return "Oczekuje na płatność";
    case "paid":
      return "Opłacone";
    case "failed":
      return "Nieudane";
    case "cancelled":
      return "Anulowane";
    case "refunded":
      return "Zwrócone";
    default:
      return status;
  }
}

function getOrderStatusClassName(status: string) {
  if (status === "paid") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "pending_payment") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "failed" || status === "cancelled" || status === "refunded") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-black/10 bg-white/70 text-[#6b7280]";
}

function getOrderStatusIcon(status: string) {
  if (status === "paid") {
    return <CheckCircle2 size={14} />;
  }

  if (status === "pending_payment") {
    return <Clock3 size={14} />;
  }

  if (status === "failed" || status === "cancelled" || status === "refunded") {
    return <XCircle size={14} />;
  }

  return <ReceiptText size={14} />;
}

function getSourceLabel(source: string | null | undefined) {
  switch (source) {
    case "placeholder_payment":
      return "Płatność testowa";
    case "purchase":
      return "Zakup";
    case "access_code":
      return "Kod dostępu";
    case "invitation":
      return "Zaproszenie";
    case "admin_grant":
      return "Nadane administracyjnie";
    default:
      return source ?? "—";
  }
}

function readBillingSnapshotValue(snapshot: unknown, key: string) {
  if (typeof snapshot !== "object" || snapshot === null || Array.isArray(snapshot)) {
    return null;
  }

  const value = (snapshot as Record<string, unknown>)[key];

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return null;
}

function OrderStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1rem] border border-black/10 bg-white/65 px-3 py-2">
      <div className="text-[11px] font-medium text-[#6b7280]">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tracking-[-0.03em] text-[#171717]">
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

export function ReportAccessOrdersHistory({
  orders,
}: ReportAccessOrdersHistoryProps) {
  return (
    <section className="space-y-5">
      <header className="rounded-[2rem] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              <ReceiptText size={20} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
                Historia
              </p>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                Zamówienia dostępów raportowych
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#6b7280]">
                Lista zamówień, które zasiliły pulę dostępów raportowych dla
                partnera. W tym widoku widzisz też statystyki wygenerowanych kodów.
              </p>
            </div>
          </div>

          <div className="w-fit rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
            {orders.length} zamówień
          </div>
        </div>
      </header>

      {orders.length === 0 ? (
        <EmptyPanel>
          Ten partner nie ma jeszcze zamówień dostępów raportowych.
        </EmptyPanel>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const buyerName =
              readBillingSnapshotValue(order.billingSnapshot, "buyerName") ??
              readBillingSnapshotValue(order.billingSnapshot, "companyName");

            const buyerEmail = readBillingSnapshotValue(
              order.billingSnapshot,
              "email",
            );

            return (
              <article
                key={order.orderId}
                className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                        Zamówienie
                      </h3>

                      <span className="rounded-full border border-black/10 bg-white/70 px-2.5 py-1 font-mono text-xs text-[#6b7280]">
                        {order.orderId}
                      </span>

                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                          getOrderStatusClassName(order.status),
                        ].join(" ")}
                      >
                        {getOrderStatusIcon(order.status)}
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#6b7280]">
                      <span>Utworzono: {formatDateTime(order.createdAt)}</span>
                      <span>Opłacono: {formatDateTime(order.paidAt)}</span>
                      <span>Źródło: {getSourceLabel(order.source)}</span>
                      {order.paymentProvider ? (
                        <span>Płatność: {order.paymentProvider}</span>
                      ) : null}
                      {order.invoiceRequested ? (
                        <span>Faktura: tak</span>
                      ) : null}
                    </div>

                    {(buyerName || buyerEmail) ? (
                      <div className="mt-3 rounded-[1.25rem] border border-black/10 bg-white/60 px-4 py-3 text-sm text-[#6b7280]">
                        <span className="font-medium text-[#171717]">
                          Kupujący:
                        </span>{" "}
                        {buyerName ?? "—"}
                        {buyerEmail ? ` · ${buyerEmail}` : ""}
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0 rounded-[1.5rem] border border-black/10 bg-white/70 p-4 text-right shadow-sm">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
                      Wartość brutto
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-[#171717]">
                      {formatMoney(order.totalGross, order.currency)}
                    </div>
                    <div className="mt-1 text-xs text-[#6b7280]">
                      netto {formatMoney(order.totalNet, order.currency)} · VAT{" "}
                      {formatMoney(order.totalVat, order.currency)}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-5">
                  <OrderStat label="Wszystkie" value={order.codeStats.total} />
                  <OrderStat label="Wolne" value={order.codeStats.available} />
                  <OrderStat label="Przypisane" value={order.codeStats.assigned} />
                  <OrderStat label="Użyte" value={order.codeStats.redeemed} />
                  <OrderStat
                    label="Niedostępne"
                    value={order.codeStats.expired + order.codeStats.cancelled}
                  />
                </div>

                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70">
                  <div className="border-b border-black/10 bg-[#f7f7f8] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                    Pozycje zamówienia
                  </div>

                  <div className="divide-y divide-black/10">
                    {order.items.map((item) => (
                      <div
                        key={item.itemId}
                        className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[1fr_auto_auto]"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold tracking-[-0.02em] text-[#171717]">
                            {item.productName}
                          </div>
                          <div className="mt-0.5 font-mono text-xs text-[#6b7280]">
                            {item.productCode}
                          </div>
                        </div>

                        <div className="text-[#6b7280]">
                          {item.quantity} ×{" "}
                          {formatMoney(item.unitGross, order.currency)}
                        </div>

                        <div className="font-semibold text-[#171717]">
                          {formatMoney(item.totalGross, order.currency)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {order.placeholderPayment ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                    <TriangleAlert size={13} />
                    Zamówienie testowe / placeholder
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
