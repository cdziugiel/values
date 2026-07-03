import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { reportAccessOrders } from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";
import { requireSession } from "@/server/auth/require-session";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: RouteProps,
) {
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

      columns: {
        id: true,
        status: true,
        tenantSlug: true,
        buyerType: true,
        paidAt: true,
      },
    });

  if (!order || order.buyerType !== "tenant") {
    return NextResponse.json(
      {
        ok: false,
        message: "Nie znaleziono zamówienia.",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      orderId: order.id,
      status: order.status,
      paidAt:
        order.paidAt?.toISOString() ?? null,
    },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate",
      },
    },
  );
}