import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";

import {
  reportAccessOrders,
} from "@/drizzle/schema";

import { controlDb } from "@/server/db/control-db";
import { requireSession } from "@/server/auth/require-session";

import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export default async function PaymentReturnPage({
  params,
}: PageProps) {
  const session = await requireSession();
  const { orderId } = await params;

  const order =
    await controlDb.query.reportAccessOrders.findFirst({
      where: and(
        eq(reportAccessOrders.id, orderId),
        eq(
          reportAccessOrders.buyerUserId,
          session.user.id,
        ),
        isNull(reportAccessOrders.deletedAt),
      ),
    });

  if (!order) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6">
        <section className="w-full rounded-2xl border bg-card p-8">
          <h1 className="text-2xl font-semibold">
            Nie znaleziono płatności
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            Zamówienie nie istnieje albo nie należy do Twojego konta.
          </p>

          <Button asChild className="mt-6">
            <Link href="/my/assessment">
              Wróć do badań
            </Link>
          </Button>
        </section>
      </main>
    );
  }

  const isPaid = order.status === "paid";
  const isFailed =
    order.status === "failed" ||
    order.status === "cancelled";

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6">
      <section className="w-full rounded-2xl border bg-card p-8">
        <h1 className="text-2xl font-semibold">
          {isPaid
            ? "Płatność została potwierdzona"
            : isFailed
              ? "Płatność nie została zakończona"
              : "Oczekujemy na potwierdzenie płatności"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {isPaid
            ? "Dostęp do zakupionego raportu został aktywowany."
            : isFailed
              ? "Nie udało się potwierdzić płatności. Możesz wrócić do raportów i rozpocząć płatność ponownie."
              : "Przelewy24 przekierowało Cię z powrotem do HUMANET. Dostęp zostanie aktywowany po otrzymaniu i zweryfikowaniu potwierdzenia płatności."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/my/assessment">
              Przejdź do badań i raportów
            </Link>
          </Button>

          {!isPaid && (
            <Button asChild variant="outline">
              <Link
                href={`/my/payments/${order.id}/return`}
              >
                Sprawdź ponownie
              </Link>
            </Button>
          )}
        </div>
      </section>
    </main>
  );
}