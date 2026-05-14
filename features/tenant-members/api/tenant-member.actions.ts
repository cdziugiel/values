"use server";

import { revalidatePath } from "next/cache";

import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import {
  addTenantMember,
  archiveTenantMember,
  updateTenantMember,
} from "./tenant-member.mutations";
import {
  addTenantMemberSchema,
  archiveTenantMemberSchema,
  updateTenantMemberSchema,
} from "../forms/tenant-member.schema";

export type TenantMemberActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

function validationMessage(issues: { message: string }[]) {
  return issues.map((issue) => issue.message).join(" ");
}

export async function addTenantMemberAction(
  _previousState: TenantMemberActionState,
  formData: FormData,
): Promise<TenantMemberActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    email: String(formData.get("email") ?? ""),
    name: String(formData.get("name") ?? ""),
    role: String(formData.get("role") ?? ""),
  };

  const parsed = addTenantMemberSchema.safeParse(rawInput);

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

    requirePermission(ctx, "user:invite");

    await addTenantMember({
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/members`);

    return {
      status: "success",
      message: "Członek tenanta został dodany.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się dodać członka tenanta.",
    };
  }
}

export async function updateTenantMemberAction(
  _previousState: TenantMemberActionState,
  formData: FormData,
): Promise<TenantMemberActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    membershipId: String(formData.get("membershipId") ?? ""),
    role: String(formData.get("role") ?? ""),
    status: String(formData.get("status") ?? ""),
  };

  const parsed = updateTenantMemberSchema.safeParse(rawInput);

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

    requirePermission(ctx, "user:invite");

    await updateTenantMember({
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/members`);

    return {
      status: "success",
      message: "Członkostwo zostało zaktualizowane.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zaktualizować członkostwa.",
    };
  }
}

export async function archiveTenantMemberAction(
  _previousState: TenantMemberActionState,
  formData: FormData,
): Promise<TenantMemberActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    membershipId: String(formData.get("membershipId") ?? ""),
  };

  const parsed = archiveTenantMemberSchema.safeParse(rawInput);

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

    requirePermission(ctx, "user:invite");

    await archiveTenantMember({
      actorUserId: ctx.userId,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/members`);

    return {
      status: "success",
      message: "Członkostwo zostało zarchiwizowane.",
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zarchiwizować członkostwa.",
    };
  }
}