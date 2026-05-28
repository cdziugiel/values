// features/report-builder/api/report-builder.actions.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/server/auth/require-super-admin";

import {
  archiveReportTemplatePageAsSuperAdmin,
  createReportTemplatePageAsSuperAdmin,
  reorderReportTemplatePageAsSuperAdmin,
  updateReportTemplatePageAsSuperAdmin,
  updateReportTemplateVersionBuilderSettingsAsSuperAdmin,
} from "./report-builder.mutations";

import {
  archiveReportTemplatePageSchema,
  createReportTemplatePageSchema,
  reorderReportTemplatePageSchema,
  updateReportTemplatePageSchema,
  updateReportTemplateVersionBuilderSettingsSchema,
} from "../forms/report-template.schema";

export type ReportBuilderActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const ok = (message: string): ReportBuilderActionState => ({
  status: "success",
  message,
});

const fail = (error: unknown): ReportBuilderActionState => ({
  status: "error",
  message:
    error instanceof Error
      ? error.message
      : "Operacja nie powiodła się.",
});

function validationMessage(issues: { message: string }[]) {
  return issues.map((issue) => issue.message).join(" ");
}

function parseJsonField(value: FormDataEntryValue | null, fallback: unknown) {
  const text = String(value ?? "").trim();

  if (!text) {
    return fallback;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Jedno z pól JSON ma nieprawidłowy format.");
  }
}

export async function updateReportTemplateVersionAction(
  _previousState: ReportBuilderActionState,
  formData: FormData,
): Promise<ReportBuilderActionState> {
  const actor = await requireSuperAdmin();

  let config: unknown;
  let dataBindings: unknown;

  try {
    config = parseJsonField(formData.get("config"), {});
    dataBindings = parseJsonField(formData.get("dataBindings"), {});
  } catch (error) {
    return fail(error);
  }

  const rawInput = {
    reportTemplateVersionId: String(
      formData.get("reportTemplateVersionId") ?? "",
    ),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    globalCss: String(formData.get("globalCss") ?? ""),
    globalJs: String(formData.get("globalJs") ?? ""),
    orientation: String(formData.get("orientation") ?? "portrait"),
    config,
    dataBindings,
  };

  const parsed =
    updateReportTemplateVersionBuilderSettingsSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await updateReportTemplateVersionBuilderSettingsAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(
      `/dashboard/report-builder/${parsed.data.reportTemplateVersionId}`,
    );
    revalidatePath("/dashboard/report-templates");

    return ok("Ustawienia buildera raportu zostały zapisane.");
  } catch (error) {
    return fail(error);
  }
}

export async function createReportTemplatePageAction(
  _previousState: ReportBuilderActionState,
  formData: FormData,
): Promise<ReportBuilderActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    reportTemplateVersionId: String(
      formData.get("reportTemplateVersionId") ?? "",
    ),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
  };

  const parsed = createReportTemplatePageSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await createReportTemplatePageAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(
      `/dashboard/report-builder/${parsed.data.reportTemplateVersionId}`,
    );

    return ok("Strona raportu została dodana.");
  } catch (error) {
    return fail(error);
  }
}

export async function updateReportTemplatePageAction(
  _previousState: ReportBuilderActionState,
  formData: FormData,
): Promise<ReportBuilderActionState> {
  const actor = await requireSuperAdmin();

  let visibilityCondition: unknown = null;
  let componentBindings: unknown = [];
  let config: unknown = {};

  try {
    visibilityCondition = parseJsonField(
      formData.get("visibilityCondition"),
      null,
    );
    componentBindings = parseJsonField(formData.get("componentBindings"), []);
    config = parseJsonField(formData.get("config"), {});
  } catch (error) {
    return fail(error);
  }

  const rawInput = {
    reportTemplatePageId: String(formData.get("reportTemplatePageId") ?? ""),

    code: String(formData.get("code") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),

    html: String(formData.get("html") ?? ""),
    css: String(formData.get("css") ?? ""),
    js: String(formData.get("js") ?? ""),

    visibilityCondition,
    componentBindings,
    config,
  };

  const parsed = updateReportTemplatePageSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const updated = await updateReportTemplatePageAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/report-builder/${updated.reportTemplateVersionId}`);

    return ok("Strona raportu została zaktualizowana.");
  } catch (error) {
    return fail(error);
  }
}

export async function reorderReportTemplatePageAction(
  _previousState: ReportBuilderActionState,
  formData: FormData,
): Promise<ReportBuilderActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    reportTemplatePageId: String(formData.get("reportTemplatePageId") ?? ""),
    direction: String(formData.get("direction") ?? ""),
  };

  const parsed = reorderReportTemplatePageSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const page = await reorderReportTemplatePageAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/report-builder/${page.reportTemplateVersionId}`);

    return ok("Kolejność strony została zmieniona.");
  } catch (error) {
    return fail(error);
  }
}

export async function archiveReportTemplatePageAction(
  _previousState: ReportBuilderActionState,
  formData: FormData,
): Promise<ReportBuilderActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    reportTemplatePageId: String(formData.get("reportTemplatePageId") ?? ""),
  };

  const parsed = archiveReportTemplatePageSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    const page = await archiveReportTemplatePageAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/report-builder/${page.reportTemplateVersionId}`);

    return ok("Strona raportu została usunięta.");
  } catch (error) {
    return fail(error);
  }
}


import { updatePersonalCompositeSourcesAsSuperAdmin } from "./report-template-admin.mutations";

type ActionState = {
  ok: boolean;
  message?: string;
};

export async function updatePersonalCompositeSourcesAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const reportTemplateVersionId = String(
      formData.get("reportTemplateVersionId") ?? "",
    );

    const sourcesRaw = String(formData.get("sources") ?? "[]");
    const sources = JSON.parse(sourcesRaw);

    await updatePersonalCompositeSourcesAsSuperAdmin({
      reportTemplateVersionId,
      sources,
    });

    revalidatePath(`/dashboard/report-builder/${reportTemplateVersionId}`);

    return {
      ok: true,
      message: "Zapisano wymagane kwestionariusze raportu złożonego.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się zapisać wymaganych kwestionariuszy.",
    };
  }
}