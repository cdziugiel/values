// server/auth/require-super-admin.ts

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { users } from "@/drizzle/schema";
import { requireSession } from "@/server/auth/require-session";
import { controlDb } from "@/server/db/control-db";

export async function requireSuperAdmin() {
  const session = await requireSession();

  const user = await controlDb.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      id: true,
      email: true,
      globalRole: true,
      status: true,
    },
  });

  if (!user || user.status !== "active") {
    redirect("/login");
  }

  if (user.globalRole !== "SUPER_ADMIN") {
    redirect("/my/assessment");
  }

  return user;
}