// features/my-assessment/api/my-assessment-runtime.ts

// features/my-assessment/api/my-assessment-runtime.ts

import { controlDb } from "@/server/db/control-db";
import type { GlobalRole } from "@/server/permissions/roles";

import { getMyAssessmentTenantDbBySlug } from "./my-assessment-tenant-db";

type MyAssessmentTenant = NonNullable<
  Awaited<ReturnType<typeof getMyAssessmentTenantDbBySlug>>
>;

export type MyAssessmentRuntime = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  db: MyAssessmentTenant["db"];
  controlDb: typeof controlDb;
  ctx: {
    userId: string;
    role: GlobalRole;
  };
};

type GetMyAssessmentRuntimeInput = {
  userId: string;
  tenantSlug?: string | null;
};

export async function getMyAssessmentRuntime({
  userId,
  tenantSlug,
}: GetMyAssessmentRuntimeInput): Promise<MyAssessmentRuntime | null> {
  const tenant = await getMyAssessmentTenantDbBySlug(tenantSlug);

  if (!tenant) {
    return null;
  }

  return {
    tenantId: tenant.tenantId,
    tenantSlug: tenant.tenantSlug,
    tenantName: tenant.tenantName,
    db: tenant.db,
    controlDb,
    ctx: {
      userId,
      role: "USER",
    },
  };
}