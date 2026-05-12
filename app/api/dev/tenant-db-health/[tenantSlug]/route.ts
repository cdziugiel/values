import { count } from "drizzle-orm";

import { clientOrganizations } from "@/drizzle/schema/tenant-schema";
import { getTenantDb } from "@/server/db/tenant-db";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

type TenantDbHealthRouteProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
};

export async function GET(_request: Request, { params }: TenantDbHealthRouteProps) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const { tenantSlug } = await params;

    const ctx = await requireTenantContext({
      tenantSlug,
    });

    const db = await getTenantDb(ctx);

    const [result] = await db
      .select({
        clientOrganizationsCount: count(),
      })
      .from(clientOrganizations);

    return Response.json({
      ok: true,
      tenant: {
        id: ctx.tenantId,
        slug: ctx.tenantSlug,
        name: ctx.tenantName,
        role: ctx.role,
        isSuperAdminAccess: ctx.isSuperAdminAccess,
      },
      database: {
        connected: true,
        clientOrganizationsCount: result?.clientOrganizationsCount ?? 0,
      },
    });
  } catch (error) {
    console.error("Tenant DB health check failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return Response.json(
      {
        ok: false,
        message: "Tenant DB health check failed.",
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 },
    );
  }
}