// features/auth/api/post-login.queries.ts

import { eq } from "drizzle-orm";

import {
  tenantMemberships,
  tenants,
  users,
} from "@/drizzle/schema";

import { controlDb } from "@/server/db/control-db";
import { linkRespondentIndexesToUser } from "@/server/respondents/respondent-identity-index";

export async function getUserForPostLoginRedirect(userId: string) {
  const user = await controlDb.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      globalRole: true,
      status: true,
    },
  });

  /**
   * Powiązanie istniejących respondentów z kontem użytkownika
   * jest operacją naprawczą i nie powinno blokować logowania.
   *
   * Indeks może wcześniej zawierać normalizedEmail, ale nie mieć
   * jeszcze userId, jeżeli respondent został utworzony przed kontem.
   */
  if (user?.status === "active" && user.email) {
    try {
      await linkRespondentIndexesToUser({
        userId: user.id,
        email: user.email,
      });
    } catch (error) {
      console.error(
        "POST_LOGIN_RESPONDENT_IDENTITY_INDEX_LINK_FAILED",
        {
          userId: user.id,
          errorName:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );
    }
  }

  return user;
}

export async function listTenantMembershipsForPostLoginRedirect(
  userId: string,
) {
  return controlDb
    .select({
      tenantId: tenants.id,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
      role: tenantMemberships.role,
      membershipStatus: tenantMemberships.status,
      tenantStatus: tenants.status,
    })
    .from(tenantMemberships)
    .innerJoin(
      tenants,
      eq(tenantMemberships.tenantId, tenants.id),
    )
    .where(eq(tenantMemberships.userId, userId));
}