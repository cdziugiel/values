import type { ControlDb } from "@/server/db/control-db";
import type { Permission, TenantRole } from "@/server/permissions/roles";

export type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  userId: string;
  role: TenantRole;
  permissions: Permission[];
  controlDb: ControlDb;
  isSuperAdminAccess: boolean;
};