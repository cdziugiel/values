import { eq } from "drizzle-orm";

import { users } from "@/drizzle/schema";
import { createTenantAsSuperAdmin } from "@/features/tenants";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";

export async function POST(request: Request) {
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

    const body = await request.json();

    const tenant = await createTenantAsSuperAdmin({
      actorUserId: user.id,
      input: body,
    });

    return Response.json({
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
    });
  } catch (error) {
    console.error("Failed to create tenant", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return Response.json(
      {
        message: "Nie udało się utworzyć tenanta.",
        error:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 },
    );
  }
}