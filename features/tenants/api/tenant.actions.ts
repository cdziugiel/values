"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSuperAdmin } from "@/server/auth/require-super-admin";

import { createTenantSchema, updateTenantSchema } from "../forms/create-tenant.schema";

import {
  archiveTenantAsSuperAdmin,
  createTenantAsSuperAdmin,
  updateTenantAsSuperAdmin,
} from "./tenant.mutations";

export type UpdateTenantActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type ArchiveTenantActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type CreateTenantActionState = {
  status: "idle" | "success" | "error";
  message: string;
  tenantSlug?: string;
};

export async function createTenantAction(
  _previousState: CreateTenantActionState,
  formData: FormData,
): Promise<CreateTenantActionState> {
  const actor = await requireSuperAdmin();

const rawInput = {
  slug: String(formData.get("slug") ?? ""),
  name: String(formData.get("name") ?? ""),
  ownerEmail: String(formData.get("ownerEmail") ?? ""),
};

  const parsed = createTenantSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message:
        "prettifyError" in z
          ? z.prettifyError(parsed.error)
          : parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }

  try {
    const tenant = await createTenantAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath("/dashboard/tenants");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message: `Tenant "${tenant.name}" został utworzony.`,
      tenantSlug: tenant.slug,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się utworzyć tenanta.",
    };
  }
}

export async function updateTenantAction(
  _previousState: UpdateTenantActionState,
  formData: FormData,
): Promise<UpdateTenantActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    tenantId: String(formData.get("tenantId") ?? ""),
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? ""),
    ownerEmail: String(formData.get("ownerEmail") ?? ""),
  };



  try {
    const parsed = updateTenantSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        status: "error",
        message: parsed.error.issues.map((issue) => issue.message).join(" "),
      };
    }

    const tenant = await updateTenantAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath("/dashboard/tenants");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message: `Tenant "${tenant.name}" został zaktualizowany.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zaktualizować tenanta.",
    };
  }
}

export async function archiveTenantAction(
  _previousState: ArchiveTenantActionState,
  formData: FormData,
): Promise<ArchiveTenantActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    tenantId: String(formData.get("tenantId") ?? ""),
  };

  try {
    const tenant = await archiveTenantAsSuperAdmin({
      actorUserId: actor.id,
      input: rawInput,
    });

    revalidatePath("/dashboard/tenants");
    revalidatePath("/dashboard");

    return {
      status: "success",
      message: `Tenant "${tenant.name}" został zarchiwizowany.`,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zarchiwizować tenanta.",
    };
  }
}