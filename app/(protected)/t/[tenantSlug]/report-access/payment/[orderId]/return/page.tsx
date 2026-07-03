import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";

import { reportAccessOrders } from "@/drizzle/schema";

import {
  TenantPaymentReturnStatus,
} from "@/features/report-access/components/tenant-payment-return-status";

import { controlDb } from "@/server/db/control-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    tenantSlug: string;
    orderId: string;
  }>;
};

export default async function TenantPaymentReturnPage({
  params,
}: PageProps) {
  const { tenantSlug, orderId } = await params;

  const ctx =
    await requireTenantContext({
      tenantSlug,
    });

  const order =
    await controlDb.query.reportAccessOrders.findFirst({
      where: and(
        eq(reportAccessOrders.id, orderId),

        eq(
          reportAccessOrders.buyerType,
          "tenant",
        ),

        eq(
          reportAccessOrders.tenantSlug,
          ctx.tenantSlug,
        ),

        eq(
          reportAccessOrders.tenantId,
          ctx.tenantId,
        ),

        eq(
          reportAccessOrders.buyerUserId,
          ctx.userId,
        ),

        isNull(reportAccessOrders.deletedAt),
      ),

      columns: {
        id: true,
        status: true,
      },
    });

  if (!order) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center px-6">
      <div className="w-full rounded-2xl border bg-card p-8 shadow-sm">
        <TenantPaymentReturnStatus
          orderId={order.id}
          tenantSlug={ctx.tenantSlug}
          initialStatus={order.status}
        />
      </div>
    </main>
  );
}