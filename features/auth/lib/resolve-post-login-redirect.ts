import {
  getUserForPostLoginRedirect,
  listTenantMembershipsForPostLoginRedirect,
} from "../api/post-login.queries";
import type { PostLoginRedirectResult } from "../types/post-login.types";

const TENANT_PANEL_ROLES = new Set([
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "TENANT_MEMBER",
  "CONSULTANT",
  "CLIENT_COMPANY_ADMIN",
  "CLIENT_MANAGER",
  "PSYCHOMETRIC_ADMIN",
  "BILLING_ADMIN",
]);

type ResolvePostLoginRedirectInput = {
  userId: string;
};

export async function resolvePostLoginRedirect({
  userId,
}: ResolvePostLoginRedirectInput): Promise<PostLoginRedirectResult> {
  const user = await getUserForPostLoginRedirect(userId);

  if (!user || user.status !== "active") {
    return {
      kind: "login",
      href: "/login",
      reason: "User does not exist or is not active.",
    };
  }

  if (user.globalRole === "SUPER_ADMIN") {
    return {
      kind: "global_admin",
      href: "/dashboard",
      reason: "User has SUPER_ADMIN global role.",
    };
  }

  const memberships = await listTenantMembershipsForPostLoginRedirect(user.id);

  const activeMembership = memberships.find((membership) => {
    return (
      membership.membershipStatus === "active" &&
      membership.tenantStatus === "active" &&
      TENANT_PANEL_ROLES.has(membership.role)
    );
  });

  if (activeMembership) {
    return {
      kind: "tenant_dashboard",
      href: `/t/${activeMembership.tenantSlug}/dashboard`,
      reason: "User has active tenant membership.",
    };
  }

  return {
    kind: "default_assessment",
    href: "/my/assessment",
    reason: "User has no active tenant membership.",
  };
}