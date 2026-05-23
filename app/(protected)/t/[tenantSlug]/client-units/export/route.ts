import { NextResponse } from "next/server";

import { listClientUnits } from "@/features/client-units/api/client-unit.queries";
import { clientUnitsToCsv } from "@/features/client-units/lib/client-unit-csv";
import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { tenantSlug } = await params;

  try {
    const ctx = await requireTenantContext({
      tenantSlug,
    });

    requirePermission(ctx, "client_unit:read");

    const db = await getTenantDb(ctx);
    const units = await listClientUnits(db);
    const csv = clientUnitsToCsv(units);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="jednostki-organizacyjne-${tenantSlug}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        message: "Nie udało się wyeksportować jednostek organizacyjnych.",
      },
      {
        status: 500,
      },
    );
  }
}