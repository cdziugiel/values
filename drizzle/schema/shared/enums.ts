import { pgEnum } from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "invited",
  "disabled",
  "deleted",
]);

export const tenantStatusEnum = pgEnum("tenant_status", [
  "active",
  "inactive",
  "suspended",
  "archived",
]);

export const tenantRoleEnum = pgEnum("tenant_role", [
  "TENANT_OWNER",
  "TENANT_ADMIN",
  "TENANT_MEMBER",
  "CONSULTANT",
  "CLIENT_COMPANY_ADMIN",
  "CLIENT_MANAGER",
  "PSYCHOMETRIC_ADMIN",
  "BILLING_ADMIN",
]);

export const globalRoleEnum = pgEnum("global_role", [
  "SUPER_ADMIN",
  "USER",
]);

export const membershipStatusEnum = pgEnum("membership_status", [
  "active",
  "invited",
  "disabled",
  "removed",
]);

export const migrationStatusEnum = pgEnum("migration_status", [
  "pending",
  "running",
  "success",
  "failed",
]);