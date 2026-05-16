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

function getOrderStatusClass(status: string) {
    if (status === "paid") {
        return "border-green-200 bg-green-50 text-green-800";
    }

    if (status === "pending_payment") {
        return "border-amber-200 bg-amber-50 text-amber-900";
    }

    if (status === "cancelled" || status === "failed" || status === "refunded") {
        return "border-muted bg-muted text-muted-foreground";
    }

    return "border bg-background text-muted-foreground";
}

export function ReportAccessOrdersHistory({
    orders,
}: ReportAccessOrdersHistoryProps) {
    return (
        <section className="space-y-4">
            <div>
                <h2 className="text-xl font-semibold">Historia zamówień dostępów</h2>

                <p className="mt-1 text-sm text-muted-foreground">
                    Lista zamówień, które zasiliły pulę dostępów raportowych dla tego
                    projektu. Na razie są to zamówienia placeholder.
                </p>
            </div>

            {orders.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
                    Ten projekt nie ma jeszcze zamówień dostępów raportowych.
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-muted/40">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Zamówienie
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Produkty
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Wartość
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Kody
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Data
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order.orderId} className="border-t align-top">
                                        <td className="px-4 py-3">
                                            <div className="font-mono text-xs">
                                                {order.orderId}
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                Provider: {order.paymentProvider ?? "—"}
                                            </div>
                                            <div className="mt-1 text-xs text-muted-foreground">
  Zakres: {order.projectId ? `projekt ${order.projectId}` : "tenant"}
</div>

{order.invoiceRequested ? (
  <div className="mt-1 text-xs text-muted-foreground">
    Faktura: tak
  </div>
) : (
  <div className="mt-1 text-xs text-muted-foreground">
    Faktura: nie
  </div>
)}
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="space-y-2">
                                                {order.items.map((item) => (
                                                    <div key={item.itemId}>
                                                        <div className="font-medium">
                                                            {item.productName}
                                                        </div>

                                                        <div className="text-xs text-muted-foreground">
                                                            {item.productCode} · ilość: {item.quantity} ·{" "}
                                                            {formatMoney(
                                                                item.totalGross,
                                                                order.currency,
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getOrderStatusClass(
                                                    order.status,
                                                )}`}
                                            >
                                                {getOrderStatusLabel(order.status)}
                                            </span>

                                            {order.paidAt ? (
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    Opłacono: {formatDateTime(order.paidAt)}
                                                </div>
                                            ) : null}
                                        </td>

                                        <td className="px-4 py-3 text-right">
                                            <div className="font-semibold">
                                                {formatMoney(order.totalGross, order.currency)}
                                            </div>

                                            <div className="mt-1 text-xs text-muted-foreground">
                                                netto: {formatMoney(order.totalNet, order.currency)}
                                            </div>

                                            <div className="text-xs text-muted-foreground">
                                                VAT: {formatMoney(order.totalVat, order.currency)}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3">
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                                <div>łącznie: {order.codeStats.total}</div>
                                                <div>wolne: {order.codeStats.available}</div>
                                                <div>przypisane: {order.codeStats.assigned}</div>
                                                <div>zużyte: {order.codeStats.redeemed}</div>
                                                <div>wygasłe: {order.codeStats.expired}</div>
                                                <div>anulowane: {order.codeStats.cancelled}</div>
                                            </div>
                                        </td>

                                        <td className="px-4 py-3">
                                            {formatDateTime(order.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </section>
    );
}