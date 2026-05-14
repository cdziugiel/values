"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { reprovisionTenantDatabaseAsSuperAdmin } from "./tenant-database-provisioning.mutations";

import {
  migrateAllActiveTenantDatabasesAsSuperAdmin,
  migrateTenantDatabaseAsSuperAdmin,
} from "./tenant-migration.mutations";

export type TenantMigrationActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function migrateTenantAction(
  _previousState: TenantMigrationActionState,
  formData: FormData,
): Promise<TenantMigrationActionState> {
  const actor = await requireSuperAdmin();

  const tenantId = String(formData.get("tenantId") ?? "");

  if (!tenantId) {
    return {
      status: "error",
      message: "Brak tenantId.",
    };
  }

  const result = await migrateTenantDatabaseAsSuperAdmin({
    actorUserId: actor.id,
    tenantId,
  });

  revalidatePath("/dashboard/tenant-migrations");
  revalidatePath("/dashboard/tenants");

  return {
    status: result.ok ? "success" : "error",
    message: result.message,
  };
}

export async function migrateAllTenantsAction(
  _previousState: TenantMigrationActionState,
  _formData: FormData,
): Promise<TenantMigrationActionState> {
  const actor = await requireSuperAdmin();

  const results = await migrateAllActiveTenantDatabasesAsSuperAdmin({
    actorUserId: actor.id,
  });

  const successCount = results.filter((result) => result.ok).length;
  const failed = results.filter((result) => !result.ok);

  revalidatePath("/dashboard/tenant-migrations");
  revalidatePath("/dashboard/tenants");

  if (failed.length > 0) {
    return {
      status: "error",
      message: `Migracje zakończone częściowo: ${successCount}/${results.length} OK. Błędy: ${failed
        .map((result) => result.tenantSlug)
        .join(", ")}`,
    };
  }

  return {
    status: "success",
    message: `Zmigrowano ${successCount}/${results.length} aktywnych tenantów.`,
  };
}

export async function reprovisionTenantDatabaseAction(
  _previousState: TenantMigrationActionState,
  formData: FormData,
): Promise<TenantMigrationActionState> {
  const actor = await requireSuperAdmin();

  const tenantId = String(formData.get("tenantId") ?? "");

  if (!tenantId) {
    return {
      status: "error",
      message: "Brak tenantId.",
    };
  }

  try {
    const result = await reprovisionTenantDatabaseAsSuperAdmin({
      actorUserId: actor.id,
      tenantId,
    });

    revalidatePath("/dashboard/tenant-migrations");
    revalidatePath("/dashboard/tenants");

    return {
      status: "success",
      message: `Baza tenanta "${result.tenantSlug}" została przygotowana i zmigrowana.`,
    };
  } catch (error) {
    revalidatePath("/dashboard/tenant-migrations");
    revalidatePath("/dashboard/tenants");

    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się przygotować bazy tenanta.",
    };
  }
}