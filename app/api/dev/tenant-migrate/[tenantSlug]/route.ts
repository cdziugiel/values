import { eq } from "drizzle-orm";

import { tenantDatabaseConnections, users } from "@/drizzle/schema";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";
import { runTenantMigrations } from "@/server/db/migrate-tenant-database";
import { decryptSecret } from "@/server/security/encryption";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

type RouteProps = {
  params: Promise<{
    tenantSlug: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteProps) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  try {
    const session = await requireSession();

    const user = await controlDb.query.users.findFirst({
      where: eq(users.id, session.user.id),
      columns: {
        id: true,
        globalRole: true,
        status: true,
      },
    });

    if (!user || user.status !== "active" || user.globalRole !== "SUPER_ADMIN") {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }

    const { tenantSlug } = await params;

    const ctx = await requireTenantContext({ tenantSlug });

    const connection = await controlDb.query.tenantDatabaseConnections.findFirst({
      where: eq(tenantDatabaseConnections.tenantId, ctx.tenantId),
    });

    if (!connection) {
      return Response.json(
        { message: "Tenant database connection not found." },
        { status: 404 },
      );
    }

    const databaseUrl = decryptSecret(connection.databaseUrlEncrypted);

    await controlDb
      .update(tenantDatabaseConnections)
      .set({
        migrationStatus: "running",
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(tenantDatabaseConnections.tenantId, ctx.tenantId));

    await runTenantMigrations({ databaseUrl });

    await controlDb
      .update(tenantDatabaseConnections)
      .set({
        migrationStatus: "success",
        schemaVersion: Number(connection.schemaVersion ?? 0) + 1,
        lastMigratedAt: new Date(),
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(tenantDatabaseConnections.tenantId, ctx.tenantId));

    return Response.json({
      ok: true,
      tenantSlug: ctx.tenantSlug,
    });
  } catch (error) {
    console.error("Tenant migration endpoint failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return Response.json(
      {
        ok: false,
        message: "Tenant migration failed.",
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 },
    );
  }
}