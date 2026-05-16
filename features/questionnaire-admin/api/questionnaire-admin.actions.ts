// features/questionnaire-admin/api/questionnaire-admin.actions.ts
"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { redirect } from "next/navigation";
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
    archiveQuestionnaireItemAsSuperAdmin,
    archiveQuestionnairePageAsSuperAdmin,
    archiveQuestionnaireDimensionAsSuperAdmin,
    reorderQuestionnairePageAsSuperAdmin,
    reorderQuestionnaireItemAsSuperAdmin,
    assignPageDimensionAsSuperAdmin,
    removePageDimensionAsSuperAdmin,
    publishQuestionnaireVersionAsSuperAdmin,
    cloneQuestionnaireVersionAsSuperAdmin,
    reorderQuestionnaireDimensionAsSuperAdmin,
    unpublishQuestionnaireVersionAsSuperAdmin,
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
    archiveQuestionnaireItemSchema,
    archiveQuestionnairePageSchema,
    archiveQuestionnaireDimensionSchema,
    reorderQuestionnairePageSchema,
    reorderQuestionnaireItemSchema,
    assignPageDimensionSchema,
    removePageDimensionSchema,
    publishQuestionnaireVersionSchema,
    cloneQuestionnaireVersionSchema,
    reorderQuestionnaireDimensionSchema,
    unpublishQuestionnaireVersionSchema,
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
        isPublic: formData.get("isPublic") === "on",
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
        revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);
        revalidatePath("/my/assessment");

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
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
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
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
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
        category: String(formData.get("category") ?? ""),
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
        category: String(formData.get("category") ?? ""),
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
        type: String(formData.get("type") ?? ""),
        text: String(formData.get("text") ?? ""),
        helpText: String(formData.get("helpText") ?? ""),
        required: formData.get("required") === "on" ? "true" : "false",

        scaleMin: String(formData.get("scaleMin") ?? ""),
        scaleMax: String(formData.get("scaleMax") ?? ""),
        scaleMinLabel: String(formData.get("scaleMinLabel") ?? ""),
        scaleMaxLabel: String(formData.get("scaleMaxLabel") ?? ""),
        likertStep: String(formData.get("likertStep") ?? ""),
        likertDisplay: String(formData.get("likertDisplay") ?? ""),

        trueLabel: String(formData.get("trueLabel") ?? ""),
        falseLabel: String(formData.get("falseLabel") ?? ""),

        choiceOptionsText: String(formData.get("choiceOptionsText") ?? ""),

        textMultiline: formData.get("textMultiline") === "on" ? "true" : "false",
        textMaxLength: String(formData.get("textMaxLength") ?? ""),

        numberMin: String(formData.get("numberMin") ?? ""),
        numberMax: String(formData.get("numberMax") ?? ""),
        numberStep: String(formData.get("numberStep") ?? ""),
        likertPreset: String(formData.get("likertPreset") ?? "custom"),
        showValueLabels:
            formData.get("showValueLabels") === "on" ||
            formData.get("showValueLabels") === "true",
        likertValueLabelsText: String(formData.get("likertValueLabelsText") ?? ""),
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
        type: String(formData.get("type") ?? ""),
        text: String(formData.get("text") ?? ""),
        helpText: String(formData.get("helpText") ?? ""),
        required: formData.get("required") === "on" ? "true" : "false",

        scaleMin: String(formData.get("scaleMin") ?? ""),
        scaleMax: String(formData.get("scaleMax") ?? ""),
        scaleMinLabel: String(formData.get("scaleMinLabel") ?? ""),
        scaleMaxLabel: String(formData.get("scaleMaxLabel") ?? ""),
        likertStep: String(formData.get("likertStep") ?? ""),
        likertDisplay: String(formData.get("likertDisplay") ?? ""),

        trueLabel: String(formData.get("trueLabel") ?? ""),
        falseLabel: String(formData.get("falseLabel") ?? ""),

        choiceOptionsText: String(formData.get("choiceOptionsText") ?? ""),

        textMultiline: formData.get("textMultiline") === "on" ? "true" : "false",
        textMaxLength: String(formData.get("textMaxLength") ?? ""),

        numberMin: String(formData.get("numberMin") ?? ""),
        numberMax: String(formData.get("numberMax") ?? ""),
        numberStep: String(formData.get("numberStep") ?? ""),

        likertPreset: String(formData.get("likertPreset") ?? "custom"),
        showValueLabels:
            formData.get("showValueLabels") === "on" ||
            formData.get("showValueLabels") === "true",
        likertValueLabelsText: String(formData.get("likertValueLabelsText") ?? ""),
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
        reverseScored:
            formData.get("reverseScored") === "on" ||
            formData.get("reverseScored") === "true",
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

export async function archiveQuestionnaireItemAction(
    _previousState: QuestionnaireAdminActionState,
    formData: FormData,
): Promise<QuestionnaireAdminActionState> {
    const actor = await requireSuperAdmin();

    const rawInput = {
        versionId: String(formData.get("versionId") ?? ""),
        itemId: String(formData.get("itemId") ?? ""),
    };

    const parsed = archiveQuestionnaireItemSchema.safeParse(rawInput);

    if (!parsed.success) {
        return {
            status: "error",
            message: validationMessage(parsed.error.issues),
        };
    }

    try {
        await archiveQuestionnaireItemAsSuperAdmin({
            actorUserId: actor.id,
            input: parsed.data,
        });

        revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

        return ok("Item został usunięty.");
    } catch (error) {
        return fail(error);
    }
}
export async function archiveQuestionnairePageAction(
    _previousState: QuestionnaireAdminActionState,
    formData: FormData,
): Promise<QuestionnaireAdminActionState> {
    const actor = await requireSuperAdmin();

    const rawInput = {
        versionId: String(formData.get("versionId") ?? ""),
        pageId: String(formData.get("pageId") ?? ""),
    };

    const parsed = archiveQuestionnairePageSchema.safeParse(rawInput);

    if (!parsed.success) {
        return {
            status: "error",
            message: validationMessage(parsed.error.issues),
        };
    }

    try {
        await archiveQuestionnairePageAsSuperAdmin({
            actorUserId: actor.id,
            input: parsed.data,
        });

        revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

        return ok("Strona została usunięta. Itemy zostały odpięte od tej strony.");
    } catch (error) {
        return fail(error);
    }
}

export async function archiveQuestionnaireDimensionAction(
    _previousState: QuestionnaireAdminActionState,
    formData: FormData,
): Promise<QuestionnaireAdminActionState> {
    const actor = await requireSuperAdmin();

    const rawInput = {
        versionId: String(formData.get("versionId") ?? ""),
        dimensionId: String(formData.get("dimensionId") ?? ""),
    };

    const parsed = archiveQuestionnaireDimensionSchema.safeParse(rawInput);

    if (!parsed.success) {
        return {
            status: "error",
            message: validationMessage(parsed.error.issues),
        };
    }

    try {
        await archiveQuestionnaireDimensionAsSuperAdmin({
            actorUserId: actor.id,
            input: parsed.data,
        });

        revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

        return ok(
            "Wymiar został usunięty. Powiązania scoringowe z itemami zostały odpięte.",
        );
    } catch (error) {
        return fail(error);
    }
}

export async function reorderQuestionnairePageAction(
    _previousState: QuestionnaireAdminActionState,
    formData: FormData,
): Promise<QuestionnaireAdminActionState> {
    const actor = await requireSuperAdmin();

    const rawInput = {
        versionId: String(formData.get("versionId") ?? ""),
        pageId: String(formData.get("pageId") ?? ""),
        direction: String(formData.get("direction") ?? ""),
    };

    const parsed = reorderQuestionnairePageSchema.safeParse(rawInput);

    if (!parsed.success) {
        return {
            status: "error",
            message: validationMessage(parsed.error.issues),
        };
    }

    try {
        await reorderQuestionnairePageAsSuperAdmin({
            actorUserId: actor.id,
            input: parsed.data,
        });

        revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

        return ok("Kolejność strony została zmieniona.");
    } catch (error) {
        return fail(error);
    }
}

export async function reorderQuestionnaireItemAction(
    _previousState: QuestionnaireAdminActionState,
    formData: FormData,
): Promise<QuestionnaireAdminActionState> {
    const actor = await requireSuperAdmin();

    const rawInput = {
        versionId: String(formData.get("versionId") ?? ""),
        itemId: String(formData.get("itemId") ?? ""),
        direction: String(formData.get("direction") ?? ""),
    };

    const parsed = reorderQuestionnaireItemSchema.safeParse(rawInput);

    if (!parsed.success) {
        return {
            status: "error",
            message: validationMessage(parsed.error.issues),
        };
    }

    try {
        await reorderQuestionnaireItemAsSuperAdmin({
            actorUserId: actor.id,
            input: parsed.data,
        });

        revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

        return ok("Kolejność itemu została zmieniona.");
    } catch (error) {
        return fail(error);
    }
}


export async function assignPageDimensionAction(
    _previousState: QuestionnaireAdminActionState,
    formData: FormData,
): Promise<QuestionnaireAdminActionState> {
    const actor = await requireSuperAdmin();

    const rawInput = {
        versionId: String(formData.get("versionId") ?? ""),
        pageId: String(formData.get("pageId") ?? ""),
        dimensionId: String(formData.get("dimensionId") ?? ""),
        weight: String(formData.get("weight") ?? "1"),
        reverseScored:
            formData.get("reverseScored") === "on" ||
            formData.get("reverseScored") === "true",
    };

    const parsed = assignPageDimensionSchema.safeParse(rawInput);

    if (!parsed.success) {
        return {
            status: "error",
            message: validationMessage(parsed.error.issues),
        };
    }

    try {
        await assignPageDimensionAsSuperAdmin({
            actorUserId: actor.id,
            input: parsed.data,
        });

        revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

        return ok("Wymiar został przypisany do strony i aktywnych itemów tej strony.");
    } catch (error) {
        return fail(error);
    }
}

export async function removePageDimensionAction(
    _previousState: QuestionnaireAdminActionState,
    formData: FormData,
): Promise<QuestionnaireAdminActionState> {
    const actor = await requireSuperAdmin();

    const rawInput = {
        versionId: String(formData.get("versionId") ?? ""),
        pageDimensionScoreId: String(
            formData.get("pageDimensionScoreId") ?? "",
        ),
    };

    const parsed = removePageDimensionSchema.safeParse(rawInput);

    if (!parsed.success) {
        return {
            status: "error",
            message: validationMessage(parsed.error.issues),
        };
    }

    try {
        await removePageDimensionAsSuperAdmin({
            actorUserId: actor.id,
            input: parsed.data,
        });

        revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

        return ok("Wymiar został usunięty ze strony.");
    } catch (error) {
        return fail(error);
    }
}
export async function publishQuestionnaireVersionAction(
    _previousState: QuestionnaireAdminActionState,
    formData: FormData,
): Promise<QuestionnaireAdminActionState> {
    const actor = await requireSuperAdmin();

    const rawInput = {
        versionId: String(formData.get("versionId") ?? ""),
    };

    const parsed = publishQuestionnaireVersionSchema.safeParse(rawInput);

    if (!parsed.success) {
        return {
            status: "error",
            message: validationMessage(parsed.error.issues),
        };
    }

    try {
        await publishQuestionnaireVersionAsSuperAdmin({
            actorUserId: actor.id,
            input: parsed.data,
        });

        revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

        return {
            status: "success",
            message:
                "Wersja kwestionariusza została opublikowana. Od teraz jest traktowana jako stabilna wersja badawcza.",
        };
    } catch (error) {
        return fail(error);
    }
}
export async function cloneQuestionnaireVersionAction(
    _previousState: QuestionnaireAdminActionState,
    formData: FormData,
): Promise<QuestionnaireAdminActionState> {
    const actor = await requireSuperAdmin();

    const rawInput = {
        sourceVersionId: String(formData.get("sourceVersionId") ?? ""),
        version: String(formData.get("version") ?? ""),
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
    };

    const parsed = cloneQuestionnaireVersionSchema.safeParse(rawInput);

    if (!parsed.success) {
        return {
            status: "error",
            message: validationMessage(parsed.error.issues),
        };
    }

    let clonedVersionId: string;

    try {
        const clonedVersion = await cloneQuestionnaireVersionAsSuperAdmin({
            actorUserId: actor.id,
            input: parsed.data,
        });

        clonedVersionId = clonedVersion.id;

        revalidatePath("/dashboard/questionnaires");
    } catch (error) {
        return fail(error);
    }

    redirect(`/dashboard/questionnaires/editor/${clonedVersionId}`);
}

export async function reorderQuestionnaireDimensionAction(
    _previousState: QuestionnaireAdminActionState,
    formData: FormData,
): Promise<QuestionnaireAdminActionState> {
    const actor = await requireSuperAdmin();

    const rawInput = {
        versionId: String(formData.get("versionId") ?? ""),
        dimensionId: String(formData.get("dimensionId") ?? ""),
        direction: String(formData.get("direction") ?? ""),
    };

    const parsed = reorderQuestionnaireDimensionSchema.safeParse(rawInput);

    if (!parsed.success) {
        return {
            status: "error",
            message: validationMessage(parsed.error.issues),
        };
    }

    try {
        await reorderQuestionnaireDimensionAsSuperAdmin({
            actorUserId: actor.id,
            input: parsed.data,
        });

        revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);

        return ok("Kolejność wymiaru została zmieniona.");
    } catch (error) {
        return fail(error);
    }
}

export async function unpublishQuestionnaireVersionAction(
    _previousState: QuestionnaireAdminActionState,
    formData: FormData,
): Promise<QuestionnaireAdminActionState> {
    const actor = await requireSuperAdmin();

    const rawInput = {
        versionId: String(formData.get("versionId") ?? ""),
    };

    const parsed = unpublishQuestionnaireVersionSchema.safeParse(rawInput);

    if (!parsed.success) {
        return {
            status: "error",
            message: validationMessage(parsed.error.issues),
        };
    }

    try {
        await unpublishQuestionnaireVersionAsSuperAdmin({
            actorUserId: actor.id,
            input: parsed.data,
        });

        revalidatePath("/dashboard/questionnaires");
        revalidatePath(`/dashboard/questionnaires/editor/${parsed.data.versionId}`);
        revalidatePath(`/dashboard/questionnaires/preview/${parsed.data.versionId}`);
        revalidatePath("/my/assessment");

        return {
            status: "success",
            message:
                "Publikacja wersji została cofnięta. Wersja wróciła do draft i została zdjęta z publicznego dostępu.",
        };
    } catch (error) {
        return fail(error);
    }
}

import { importQuestionnaireVersionXlsx } from "./questionnaire-xlsx.import";

export async function importQuestionnaireVersionXlsxAction(
    _previousState: QuestionnaireAdminActionState,
    formData: FormData,
): Promise<QuestionnaireAdminActionState> {
    const actor = await requireSuperAdmin();

    try {
        const versionId = String(formData.get("versionId") ?? "");
        const file = formData.get("file");

        if (!versionId) {
            return {
                status: "error",
                message: "Brak identyfikatora wersji kwestionariusza.",
            };
        }

        if (!(file instanceof File)) {
            return {
                status: "error",
                message: "Nie wybrano pliku XLSX.",
            };
        }

        if (!file.name.toLowerCase().endsWith(".xlsx")) {
            return {
                status: "error",
                message: "Import obsługuje tylko pliki .xlsx.",
            };
        }

        const fileBuffer = await file.arrayBuffer();

        const result = await importQuestionnaireVersionXlsx({
            actorUserId: actor.id,
            versionId,
            fileBuffer,
        });

        revalidatePath(`/dashboard/questionnaires/editor/${versionId}`);
        revalidatePath(`/dashboard/questionnaires/preview/${versionId}`);

        return {
            status: "success",
            message: `Zaimportowano: ${result.pagesCount} stron, ${result.itemsCount} itemów, ${result.dimensionsCount} wymiarów.`,
        };
    } catch (error) {
        console.error("questionnaire_xlsx_import_failed", error);

        return {
            status: "error",
            message:
                error instanceof Error
                    ? error.message
                    : "Nie udało się zaimportować pliku. Sprawdź format arkuszy i spróbuj ponownie.",
        };
    }
}