"use server";

import { revalidatePath } from "next/cache";

import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import {
  archiveClientOrganization,
  createClientOrganization,
  updateClientOrganization,
} from "./client-organization.mutations";
import {
  archiveClientOrganizationSchema,
  createClientOrganizationSchema,
  updateClientOrganizationSchema,
} from "../forms/client-organization.schema";

export type ClientOrganizationActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function validationMessage(issues: { message: string }[]) {
  return issues.map((issue) => issue.message).join(" ");
}

export async function createClientOrganizationAction(
  _previousState: ClientOrganizationActionState,
  formData: FormData,
): Promise<ClientOrganizationActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    name: String(formData.get("name") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    size: String(formData.get("size") ?? ""),
  };

  const parsed = createClientOrganizationSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const ctx = await requireTenantContext({
      tenantSlug: parsed.data.tenantSlug,
    });

    requirePermission(ctx, "client_organization:create");

    const db = await getTenantDb(ctx);

    await createClientOrganization({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/client-organizations`);

    return {
      status: "success",
      message: "Organizacja klienta została utworzona.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się utworzyć organizacji klienta.",
    };
  }
}

export async function updateClientOrganizationAction(
  _previousState: ClientOrganizationActionState,
  formData: FormData,
): Promise<ClientOrganizationActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    clientOrganizationId: String(formData.get("clientOrganizationId") ?? ""),
    name: String(formData.get("name") ?? ""),
    industry: String(formData.get("industry") ?? ""),
    size: String(formData.get("size") ?? ""),
    status: String(formData.get("status") ?? ""),
  };

  const parsed = updateClientOrganizationSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const ctx = await requireTenantContext({
      tenantSlug: parsed.data.tenantSlug,
    });

    requirePermission(ctx, "client_organization:create");

    const db = await getTenantDb(ctx);

    await updateClientOrganization({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/client-organizations`);

    return {
      status: "success",
      message: "Organizacja klienta została zaktualizowana.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zaktualizować organizacji klienta.",
    };
  }
}

export async function archiveClientOrganizationAction(
  _previousState: ClientOrganizationActionState,
  formData: FormData,
): Promise<ClientOrganizationActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    clientOrganizationId: String(formData.get("clientOrganizationId") ?? ""),
  };

  const parsed = archiveClientOrganizationSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const ctx = await requireTenantContext({
      tenantSlug: parsed.data.tenantSlug,
    });

    requirePermission(ctx, "client_organization:create");

    const db = await getTenantDb(ctx);

    await archiveClientOrganization({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/client-organizations`);

    return {
      status: "success",
      message: "Organizacja klienta została zarchiwizowana.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zarchiwizować organizacji klienta.",
    };
  }
}