"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/server/auth/require-super-admin";

import {
  assignItemDimensionAsSuperAdmin,
  createQuestionnaireAsSuperAdmin,
  createQuestionnaireDimensionAsSuperAdmin,
  createQuestionnaireItemAsSuperAdmin,
  createQuestionnairePageAsSuperAdmin,
  createQuestionnaireVersionAsSuperAdmin,
  removeItemDimensionAsSuperAdmin,
  updateQuestionnaireAsSuperAdmin,
  updateQuestionnaireDimensionAsSuperAdmin,
  updateQuestionnaireItemAsSuperAdmin,
  updateQuestionnairePageAsSuperAdmin,
  updateQuestionnaireVersionAsSuperAdmin,
} from "./questionnaire-admin.mutations";
import {
  assignItemDimensionSchema,
  createQuestionnaireDimensionSchema,
  createQuestionnaireItemSchema,
  createQuestionnairePageSchema,
  createQuestionnaireSchema,
  createQuestionnaireVersionSchema,
  removeItemDimensionSchema,
  updateQuestionnaireDimensionSchema,
  updateQuestionnaireItemSchema,
  updateQuestionnairePageSchema,
  updateQuestionnaireSchema,
  updateQuestionnaireVersionSchema,
} from "../forms/questionnaire-admin.schema";

export type QuestionnaireAdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const ok = (message: string): QuestionnaireAdminActionState => ({
  status: "success",
  message,
});

const fail = (error: unknown): QuestionnaireAdminActionState => ({
  status: "error",
  message:
    error instanceof Error
      ? error.message
      : "Operacja nie powiodła się.",
});

function validationMessage(issues: { message: string }[]) {
  return issues.map((issue) => issue.message).join(" ");
}

export async function createQuestionnaireAction(
  _previousState: QuestionnaireAdminActionState,
  formData: FormData,
): Promise<QuestionnaireAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  };

  const parsed = createQuestionnaireSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await createQuestionnaireAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath("/dashboard/questionnaires");

    return ok("Kwestionariusz został utworzony.");
  } catch (error) {
    return fail(error);
  }
}

export async function updateQuestionnaireAction(
  _previousState: QuestionnaireAdminActionState,
  formData: FormData,
): Promise<QuestionnaireAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    questionnaireId: String(formData.get("questionnaireId") ?? ""),
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    status: String(formData.get("status") ?? ""),
  };

  const parsed = updateQuestionnaireSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await updateQuestionnaireAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath("/dashboard/questionnaires");

    return ok("Kwestionariusz został zaktualizowany.");
  } catch (error) {
    return fail(error);
  }
}

export async function createQuestionnaireVersionAction(
  _previousState: QuestionnaireAdminActionState,
  formData: FormData,
): Promise<QuestionnaireAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    questionnaireId: String(formData.get("questionnaireId") ?? ""),
    version: String(formData.get("version") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
  };

  const parsed = createQuestionnaireVersionSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await createQuestionnaireVersionAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath("/dashboard/questionnaires");

    return ok("Wersja kwestionariusza została utworzona.");
  } catch (error) {
    return fail(error);
  }
}

export async function updateQuestionnaireVersionAction(
  _previousState: QuestionnaireAdminActionState,
  formData: FormData,
): Promise<QuestionnaireAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    versionId: String(formData.get("versionId") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    status: String(formData.get("status") ?? ""),
  };

  const parsed = updateQuestionnaireVersionSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await updateQuestionnaireVersionAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath("/dashboard/questionnaires");

    return ok("Wersja została zaktualizowana.");
  } catch (error) {
    return fail(error);
  }
}

export async function createQuestionnairePageAction(
  _previousState: QuestionnaireAdminActionState,
  formData: FormData,
): Promise<QuestionnaireAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    versionId: String(formData.get("versionId") ?? ""),
    code: String(formData.get("code") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    orderIndex: String(formData.get("orderIndex") ?? "0"),
  };

  const parsed = createQuestionnairePageSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await createQuestionnairePageAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

    return ok("Strona została dodana.");
  } catch (error) {
    return fail(error);
  }
}

export async function updateQuestionnairePageAction(
  _previousState: QuestionnaireAdminActionState,
  formData: FormData,
): Promise<QuestionnaireAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    pageId: String(formData.get("pageId") ?? ""),
    versionId: String(formData.get("versionId") ?? ""),
    code: String(formData.get("code") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    orderIndex: String(formData.get("orderIndex") ?? "0"),
  };

  const parsed = updateQuestionnairePageSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await updateQuestionnairePageAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

    return ok("Strona została zaktualizowana.");
  } catch (error) {
    return fail(error);
  }
}

export async function createQuestionnaireDimensionAction(
  _previousState: QuestionnaireAdminActionState,
  formData: FormData,
): Promise<QuestionnaireAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    versionId: String(formData.get("versionId") ?? ""),
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    orderIndex: String(formData.get("orderIndex") ?? "0"),
  };

  const parsed = createQuestionnaireDimensionSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await createQuestionnaireDimensionAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

    return ok("Wymiar został dodany.");
  } catch (error) {
    return fail(error);
  }
}

export async function updateQuestionnaireDimensionAction(
  _previousState: QuestionnaireAdminActionState,
  formData: FormData,
): Promise<QuestionnaireAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    dimensionId: String(formData.get("dimensionId") ?? ""),
    versionId: String(formData.get("versionId") ?? ""),
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    orderIndex: String(formData.get("orderIndex") ?? "0"),
  };

  const parsed = updateQuestionnaireDimensionSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await updateQuestionnaireDimensionAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

    return ok("Wymiar został zaktualizowany.");
  } catch (error) {
    return fail(error);
  }
}

export async function createQuestionnaireItemAction(
  _previousState: QuestionnaireAdminActionState,
  formData: FormData,
): Promise<QuestionnaireAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    versionId: String(formData.get("versionId") ?? ""),
    pageId: String(formData.get("pageId") ?? ""),
    code: String(formData.get("code") ?? ""),
    orderIndex: String(formData.get("orderIndex") ?? "0"),
    type: String(formData.get("type") ?? ""),
    text: String(formData.get("text") ?? ""),
    helpText: String(formData.get("helpText") ?? ""),
    required: formData.get("required") === "on" ? "true" : "false",
    scaleMin: String(formData.get("scaleMin") ?? ""),
    scaleMax: String(formData.get("scaleMax") ?? ""),
    scaleMinLabel: String(formData.get("scaleMinLabel") ?? ""),
    scaleMaxLabel: String(formData.get("scaleMaxLabel") ?? ""),
  };

  const parsed = createQuestionnaireItemSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await createQuestionnaireItemAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

    return ok("Item został dodany.");
  } catch (error) {
    return fail(error);
  }
}

export async function updateQuestionnaireItemAction(
  _previousState: QuestionnaireAdminActionState,
  formData: FormData,
): Promise<QuestionnaireAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    itemId: String(formData.get("itemId") ?? ""),
    versionId: String(formData.get("versionId") ?? ""),
    pageId: String(formData.get("pageId") ?? ""),
    code: String(formData.get("code") ?? ""),
    orderIndex: String(formData.get("orderIndex") ?? "0"),
    type: String(formData.get("type") ?? ""),
    text: String(formData.get("text") ?? ""),
    helpText: String(formData.get("helpText") ?? ""),
    required: formData.get("required") === "on" ? "true" : "false",
    scaleMin: String(formData.get("scaleMin") ?? ""),
    scaleMax: String(formData.get("scaleMax") ?? ""),
    scaleMinLabel: String(formData.get("scaleMinLabel") ?? ""),
    scaleMaxLabel: String(formData.get("scaleMaxLabel") ?? ""),
  };

  const parsed = updateQuestionnaireItemSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await updateQuestionnaireItemAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

    return ok("Item został zaktualizowany.");
  } catch (error) {
    return fail(error);
  }
}

export async function assignItemDimensionAction(
  _previousState: QuestionnaireAdminActionState,
  formData: FormData,
): Promise<QuestionnaireAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    versionId: String(formData.get("versionId") ?? ""),
    itemId: String(formData.get("itemId") ?? ""),
    dimensionId: String(formData.get("dimensionId") ?? ""),
    weight: String(formData.get("weight") ?? "1"),
    reverseScored: formData.get("reverseScored") === "on" ? "true" : "false",
  };

  const parsed = assignItemDimensionSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await assignItemDimensionAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

    return ok("Wymiar został przypisany do itemu.");
  } catch (error) {
    return fail(error);
  }
}

export async function removeItemDimensionAction(
  _previousState: QuestionnaireAdminActionState,
  formData: FormData,
): Promise<QuestionnaireAdminActionState> {
  const actor = await requireSuperAdmin();

  const rawInput = {
    versionId: String(formData.get("versionId") ?? ""),
    itemDimensionScoreId: String(
      formData.get("itemDimensionScoreId") ?? "",
    ),
  };

  const parsed = removeItemDimensionSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      status: "error",
      message: validationMessage(parsed.error.issues),
    };
  }

  try {
    await removeItemDimensionAsSuperAdmin({
      actorUserId: actor.id,
      input: parsed.data,
    });

    revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

    return ok("Przypisanie wymiaru zostało usunięte.");
  } catch (error) {
    return fail(error);
  }
}