"use server";

import { revalidatePath } from "next/cache";

import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import {
  archiveClientUnit,
  createClientUnit,
  updateClientUnit,
} from "./client-unit.mutations";
import {
  archiveClientUnitSchema,
  createClientUnitSchema,
  updateClientUnitSchema,
} from "../forms/client-unit.schema";

export type ClientUnitActionState = {
  status: "idle" | "success" | "error";
  message: string;
  formVersion: number;
};

function validationMessage(issues: { message: string }[]) {
  return issues.map((issue) => issue.message).join(" ");
}

export async function createClientUnitAction(
  previousState: ClientUnitActionState,
  formData: FormData,
): Promise<ClientUnitActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    clientOrganizationId: String(formData.get("clientOrganizationId") ?? ""),
    parentId: String(formData.get("parentId") ?? ""),
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? ""),
  };

  const parsed = createClientUnitSchema.safeParse(rawInput);

  if (!parsed.success) {
return {
  status: "error",
  message: validationMessage(parsed.error.issues),
  formVersion: previousState.formVersion,
};
  }

  try {
    const ctx = await requireTenantContext({
      tenantSlug: parsed.data.tenantSlug,
    });

    requirePermission(ctx, "client_unit:create");

    const db = await getTenantDb(ctx);

    await createClientUnit({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/client-units`);

return {
  status: "success",
  message: "Jednostka organizacyjna została utworzona.",
  formVersion: previousState.formVersion + 1,
};
  } catch (error) {
return {
  status: "error",
  message:
    error instanceof Error
      ? error.message
      : "Nie udało się utworzyć jednostki organizacyjnej.",
  formVersion: previousState.formVersion,
};
  }
}

export async function updateClientUnitAction(
  previousState: ClientUnitActionState,
  formData: FormData,
): Promise<ClientUnitActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    clientUnitId: String(formData.get("clientUnitId") ?? ""),
    clientOrganizationId: String(formData.get("clientOrganizationId") ?? ""),
    parentId: String(formData.get("parentId") ?? ""),
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? ""),
  };

  const parsed = updateClientUnitSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
      formVersion: previousState.formVersion,
    };
  }

  try {
    const ctx = await requireTenantContext({
      tenantSlug: parsed.data.tenantSlug,
    });

    requirePermission(ctx, "client_unit:update");

    const db = await getTenantDb(ctx);

    await updateClientUnit({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/client-units`);

    return {
      status: "success",

      formVersion: previousState.formVersion + 1,
      message: "Jednostka organizacyjna została zaktualizowana.",
    };
  } catch (error) {
    return {
      status: "error",
      formVersion: previousState.formVersion,
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zaktualizować jednostki organizacyjnej.",
    };
  }
}

export async function archiveClientUnitAction(
  previousState: ClientUnitActionState,
  formData: FormData,
): Promise<ClientUnitActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    clientUnitId: String(formData.get("clientUnitId") ?? ""),
  };

  const parsed = archiveClientUnitSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      formVersion: previousState.formVersion,
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const ctx = await requireTenantContext({
      tenantSlug: parsed.data.tenantSlug,
    });

    requirePermission(ctx, "client_unit:update");

    const db = await getTenantDb(ctx);

    await archiveClientUnit({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/client-units`);

    return {
      status: "success",
      formVersion: previousState.formVersion + 1, 
      message: "Jednostka organizacyjna została zarchiwizowana.",
    };
  } catch (error) {
    return {
      status: "error",
      formVersion: previousState.formVersion,
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zarchiwizować jednostki organizacyjnej.",
    };
  }
}