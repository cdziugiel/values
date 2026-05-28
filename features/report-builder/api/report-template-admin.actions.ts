// features/report-builder/api/report-template-admin.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/server/auth/require-super-admin";

import {
  archiveReportTemplateAsSuperAdmin,
  archiveReportTemplateVersionAsSuperAdmin,
  createReportTemplateAsSuperAdmin,
  createReportTemplateVersionAsSuperAdmin,
  publishReportTemplateVersionAsSuperAdmin,
  updateReportTemplateAsSuperAdmin,
  updateReportTemplateVersionAsSuperAdmin,
} from "./report-template-admin.mutations";

import {
  archiveReportTemplateSchema,
  archiveReportTemplateVersionSchema,
  createReportTemplateSchema,
  createReportTemplateVersionSchema,
  publishReportTemplateVersionSchema,
  updateReportTemplateSchema,
  updateReportTemplateVersionSchema,
} from "../forms/report-template-admin.schema";

export type ReportTemplateAdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const ok = (message: string): ReportTemplateAdminActionState => ({
  status: "success",
  message,
});

const fail = (error: unknown): ReportTemplateAdminActionState => ({
  status: "error",
  message:
    error instanceof Error
      ? error.message
      : "Operacja nie powiodła się.",
});

function validationMessage(issues: { message: string }[]) {
  return issues.map((issue) => issue.message).join(" ");
}

export async function createReportTemplateAction(
  _previousState: ReportTemplateAdminActionState,
  formData: FormData,
): Promise<ReportTemplateAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    questionnaireId: String(formData.get("questionnaireId") ?? ""),
    kind: String(formData.get("kind") ?? "personal"),
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  };

  const parsed = createReportTemplateSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  let templateId: string;

  try {
    const template = await createReportTemplateAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    templateId = template.id;

    revalidatePath("/dashboard/report-templates");
  } catch (error) {
    return fail(error);
  }

  redirect(`/dashboard/report-templates/${templateId}`);
}

export async function updateReportTemplateAction(
  _previousState: ReportTemplateAdminActionState,
  formData: FormData,
): Promise<ReportTemplateAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    reportTemplateId: String(formData.get("reportTemplateId") ?? ""),
    questionnaireId: String(formData.get("questionnaireId") ?? ""),
    kind: String(formData.get("kind") ?? "personal"),
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    status: String(formData.get("status") ?? "draft"),
  };

  const parsed = updateReportTemplateSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await updateReportTemplateAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath("/dashboard/report-templates");
    revalidatePath(`/dashboard/report-templates/${parsed.data.reportTemplateId}`);

    return ok("Template raportu został zaktualizowany.");
  } catch (error) {
    return fail(error);
  }
}

export async function archiveReportTemplateAction(
  _previousState: ReportTemplateAdminActionState,
  formData: FormData,
): Promise<ReportTemplateAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    reportTemplateId: String(formData.get("reportTemplateId") ?? ""),
  };

  const parsed = archiveReportTemplateSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await archiveReportTemplateAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath("/dashboard/report-templates");
  } catch (error) {
    return fail(error);
  }

  redirect("/dashboard/report-templates");
}

export async function createReportTemplateVersionAction(
  _previousState: ReportTemplateAdminActionState,
  formData: FormData,
): Promise<ReportTemplateAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    reportTemplateId: String(formData.get("reportTemplateId") ?? ""),
    questionnaireVersionId: String(formData.get("questionnaireVersionId") ?? ""),
    version: String(formData.get("version") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  };

  const parsed = createReportTemplateVersionSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  let createdVersionId: string;

  try {
    const version = await createReportTemplateVersionAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    createdVersionId = version.id;

    revalidatePath(`/dashboard/report-templates/${parsed.data.reportTemplateId}`);
    revalidatePath("/dashboard/report-templates");
  } catch (error) {
    return fail(error);
  }

  redirect(`/dashboard/report-builder/${createdVersionId}`);
}

export async function updateReportTemplateVersionAction(
  _previousState: ReportTemplateAdminActionState,
  formData: FormData,
): Promise<ReportTemplateAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    reportTemplateVersionId: String(
      formData.get("reportTemplateVersionId") ?? "",
    ),
    version: String(formData.get("version") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    status: String(formData.get("status") ?? "draft"),
    isDefault:
      formData.get("isDefault") === "on" ||
      formData.get("isDefault") === "true",
    globalCss: String(formData.get("globalCss") ?? ""),
    globalJs: String(formData.get("globalJs") ?? ""),
    pageSize: "A4",
    orientation: String(formData.get("orientation") ?? "portrait"),
    configText: String(formData.get("configText") ?? "{}"),
    dataBindingsText: String(formData.get("dataBindingsText") ?? "{}"),
  };

  const parsed = updateReportTemplateVersionSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const version = await updateReportTemplateVersionAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/report-builder/${version.id}`);
    revalidatePath(`/dashboard/report-templates/${version.reportTemplateId}`);
    revalidatePath("/dashboard/report-templates");

    return ok("Wersja template’u raportu została zaktualizowana.");
  } catch (error) {
    return fail(error);
  }
}

export async function publishReportTemplateVersionAction(
  _previousState: ReportTemplateAdminActionState,
  formData: FormData,
): Promise<ReportTemplateAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    reportTemplateVersionId: String(
      formData.get("reportTemplateVersionId") ?? "",
    ),
  };

  const parsed = publishReportTemplateVersionSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const version = await publishReportTemplateVersionAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/report-builder/${version.id}`);
    revalidatePath(`/dashboard/report-templates/${version.reportTemplateId}`);
    revalidatePath("/dashboard/report-templates");

    return ok("Wersja template’u raportu została opublikowana.");
  } catch (error) {
    return fail(error);
  }
}

export async function archiveReportTemplateVersionAction(
  _previousState: ReportTemplateAdminActionState,
  formData: FormData,
): Promise<ReportTemplateAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    reportTemplateVersionId: String(
      formData.get("reportTemplateVersionId") ?? "",
    ),
  };

  const parsed = archiveReportTemplateVersionSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const version = await archiveReportTemplateVersionAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/report-templates/${version.reportTemplateId}`);
    revalidatePath("/dashboard/report-templates");

    return ok("Wersja template’u raportu została zarchiwizowana.");
  } catch (error) {
    return fail(error);
  }
}