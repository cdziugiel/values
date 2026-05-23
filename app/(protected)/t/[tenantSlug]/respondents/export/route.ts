import { NextResponse } from "next/server";

import { listRespondents } from "@/features/respondents/api/respondent.queries";
import { respondentsToCsv } from "@/features/respondents/lib/respondent-csv";
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

    requirePermission(ctx, "respondent:read");

    const db = await getTenantDb(ctx);
    const respondents = await listRespondents(db);
    const csv = respondentsToCsv(respondents);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="respondenci-${tenantSlug}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        message: "Nie udało się wyeksportować respondentów.",
      },
      {
        status: 500,
      },
    );
  }
}