"use server";

import { revalidatePath } from "next/cache";

import { getTenantDb } from "@/server/db/tenant-db";
import { requirePermission } from "@/server/permissions/require-permission";
import { requireTenantContext } from "@/server/tenant/require-tenant-context";

import {
  archiveRespondent,
  createRespondent,
  updateRespondent,
} from "./respondent.mutations";
import {
  archiveRespondentSchema,
  createRespondentSchema,
  updateRespondentSchema,
} from "../forms/respondent.schema";

export type RespondentActionState = {
  status: "idle" | "success" | "error";
  message: string;
  formVersion: number;
};

function validationMessage(issues: { message: string }[]) {
  return issues.map((issue) => issue.message).join(" ");
}

export async function createRespondentAction(
  previousState: RespondentActionState,
  formData: FormData,
): Promise<RespondentActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    externalCode: String(formData.get("externalCode") ?? ""),
    clientOrganizationId: String(formData.get("clientOrganizationId") ?? ""),
    clientUnitId: String(formData.get("clientUnitId") ?? ""),
    email: String(formData.get("email") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    clientUnitRole: String(formData.get("clientUnitRole") ?? ""),
    isLeader: String(formData.get("isLeader") ?? ""),
  };

  const parsed = createRespondentSchema.safeParse(rawInput);

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

    requirePermission(ctx, "respondent:create");

    const db = await getTenantDb(ctx);

    await createRespondent({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/respondents`);

    return {
      status: "success",
      formVersion: previousState.formVersion + 1,
      message: "Respondent został utworzony.",
    };
  } catch (error) {
    return {
      status: "error",
      formVersion: previousState.formVersion,
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się utworzyć respondenta.",
    };
  }
}

export async function updateRespondentAction(
  previousState: RespondentActionState,
  formData: FormData,
): Promise<RespondentActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    respondentId: String(formData.get("respondentId") ?? ""),
    externalCode: String(formData.get("externalCode") ?? ""),
    clientOrganizationId: String(formData.get("clientOrganizationId") ?? ""),
    clientUnitId: String(formData.get("clientUnitId") ?? ""),
    email: String(formData.get("email") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    clientUnitRole: String(formData.get("clientUnitRole") ?? ""),
    isLeader: String(formData.get("isLeader") ?? ""),
  };

  const parsed = updateRespondentSchema.safeParse(rawInput);

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

    requirePermission(ctx, "respondent:update");

    const db = await getTenantDb(ctx);

    await updateRespondent({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/respondents`);

    return {
      status: "success",
      formVersion: previousState.formVersion,
      message: "Respondent został zaktualizowany.",
    };
  } catch (error) {
    return {
      status: "error",
      formVersion: previousState.formVersion,
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zaktualizować respondenta.",
    };
  }
}

export async function archiveRespondentAction(
  previousState: RespondentActionState,
  formData: FormData,
): Promise<RespondentActionState> {
  const rawInput = {
    tenantSlug: String(formData.get("tenantSlug") ?? ""),
    respondentId: String(formData.get("respondentId") ?? ""),
  };

  const parsed = archiveRespondentSchema.safeParse(rawInput);

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

    requirePermission(ctx, "respondent:update");

    const db = await getTenantDb(ctx);

    await archiveRespondent({
      db,
      ctx,
      input: parsed.data,
    });

    revalidatePath(`/t/${ctx.tenantSlug}/respondents`);

    return {
      status: "success",
      formVersion: previousState.formVersion,
      message: "Respondent został zarchiwizowany.",
    };
  } catch (error) {
    return {
      status: "error",
      formVersion: previousState.formVersion,
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zarchiwizować respondenta.",
    };
  }
}