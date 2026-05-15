import { z } from "zod";

export const questionnaireStatusSchema = z.enum([
    "draft",
    "active",
    "archived",
]);

export const questionnaireVersionStatusSchema = z.enum([
    "draft",
    "active",
    "archived",
]);

export const questionnaireItemTypeSchema = z.enum([
    "likert",
    "true_false",
    "single_choice",
    "multiple_choice",
    "text",
    "number",
]);


const stringBoolean = z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((value) => value === true || value === "true");

const likertValueLabelsSchema = z
    .record(z.string(), z.string())
    .optional()
    .default({});

const optionalText = z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => {
        const normalized = value?.trim();
        return normalized ? normalized : null;
    });

const jsonTextSchema = z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((value) => {
        const normalized = value?.trim();

        if (!normalized) {
            return null;
        }

        try {
            return JSON.parse(normalized);
        } catch {
            throw new Error("Nieprawidłowy JSON.");
        }
    });

export const createQuestionnaireSchema = z.object({
    code: z
        .string()
        .min(2)
        .max(80)
        .regex(/^[A-Z0-9_]+$/, {
            message: "Kod powinien zawierać wielkie litery, cyfry i podkreślenia.",
        }),
    name: z.string().min(2).max(180),
    description: z.string().max(2000).optional().or(z.literal("")),
});

export const updateQuestionnaireSchema = z.object({
    questionnaireId: z.string().uuid(),
    code: z
        .string()
        .min(2)
        .max(80)
        .regex(/^[A-Z0-9_]+$/),
    name: z.string().min(2).max(180),
    description: z.string().max(2000).optional().or(z.literal("")),
    status: questionnaireStatusSchema,
});

export const createQuestionnaireVersionSchema = z.object({
    questionnaireId: z.string().uuid(),
    version: z.string().min(1).max(40),
    name: z.string().min(2).max(180),
    description: z.string().max(2000).optional().or(z.literal("")),
});

export const updateQuestionnaireVersionSchema = z.object({
    versionId: z.string().uuid(),
    name: z.string().min(2).max(180),
    description: z.string().max(2000).optional().or(z.literal("")),
    status: questionnaireVersionStatusSchema,
    isPublic: z.coerce.boolean().default(false),
});

export const createQuestionnairePageSchema = z.object({
    versionId: z.string().uuid(),
    title: z.string().min(2).max(220),
    description: z.string().max(2000).optional().or(z.literal("")),
});

export const updateQuestionnairePageSchema = z.object({
    pageId: z.string().uuid(),
    versionId: z.string().uuid(),
    title: z.string().min(2).max(220),
    description: z.string().max(2000).optional().or(z.literal("")),
});


export const createQuestionnaireDimensionSchema = z.object({
    versionId: z.string().uuid(),
    code: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(180),
    description: z.string().max(2000).optional().or(z.literal("")),
    category: optionalText,
});

export const updateQuestionnaireDimensionSchema = z.object({
    dimensionId: z.string().uuid(),
    versionId: z.string().uuid(),
    code: z.string().trim().min(1).max(80),
    name: z.string().trim().min(1).max(180),
    description: z.string().max(2000).optional().or(z.literal("")),
    category: optionalText,
});

export const reorderQuestionnaireDimensionSchema = z.object({
    versionId: z.string().uuid(),
    dimensionId: z.string().uuid(),
    direction: z.enum(["up", "down"]),
});

export type ReorderQuestionnaireDimensionInput = z.infer<
    typeof reorderQuestionnaireDimensionSchema
>;

export const likertPresetSchema = z.enum([
    "custom",
    "agreement_7_short",
    "agreement_7_full",
    "frequency_5",
]);

const checkboxBoolean = z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
    .optional()
    .transform((value) => value === true || value === "on" || value === "true");


const optionalString = z
    .string()
    .optional()
    .transform((value) => {
        const normalized = value?.trim();
        return normalized || undefined;
    });

export const createQuestionnaireItemSchema = z.object({
    versionId: z.string().uuid(),
    pageId: z.string().uuid().optional().or(z.literal("")),
    type: questionnaireItemTypeSchema,
    text: z.string().min(2).max(2000),
    helpText: z.string().max(2000).optional().or(z.literal("")),
    required: z.coerce.boolean().default(true),
    scaleMin: z.coerce.number().int().optional().or(z.literal("")),
    scaleMax: z.coerce.number().int().optional().or(z.literal("")),
    scaleMinLabel: z.string().max(120).optional().or(z.literal("")),
    scaleMaxLabel: z.string().max(120).optional().or(z.literal("")),
    likertStep: z.coerce.number().optional().or(z.literal("")),
    likertDisplay: z.enum(["buttons", "radio", "slider"]).optional().or(z.literal("")),

    trueLabel: z.string().max(120).optional().or(z.literal("")),
    falseLabel: z.string().max(120).optional().or(z.literal("")),

    choiceOptionsText: z.string().max(5000).optional().or(z.literal("")),

    textMultiline: z.coerce.boolean().optional(),
    textMaxLength: z.coerce.number().int().positive().optional().or(z.literal("")),

    numberMin: z.coerce.number().optional().or(z.literal("")),
    numberMax: z.coerce.number().optional().or(z.literal("")),
    numberStep: z.coerce.number().optional().or(z.literal("")),

    likertPreset: likertPresetSchema.optional().default("custom"),
    showValueLabels: checkboxBoolean.default(false),
    likertValueLabelsText: optionalString,
});

export const updateQuestionnaireItemSchema = z.object({
    itemId: z.string().uuid(),
    versionId: z.string().uuid(),
    pageId: z.string().uuid().optional().or(z.literal("")),
    type: questionnaireItemTypeSchema,
    text: z.string().min(2).max(2000),
    helpText: z.string().max(2000).optional().or(z.literal("")),
    required: z.coerce.boolean(),
    scaleMin: z.coerce.number().int().optional().or(z.literal("")),
    scaleMax: z.coerce.number().int().optional().or(z.literal("")),
    scaleMinLabel: z.string().max(120).optional().or(z.literal("")),
    scaleMaxLabel: z.string().max(120).optional().or(z.literal("")),
    likertStep: z.coerce.number().optional().or(z.literal("")),
    likertDisplay: z.enum(["buttons", "radio", "slider"]).optional().or(z.literal("")),

    trueLabel: z.string().max(120).optional().or(z.literal("")),
    falseLabel: z.string().max(120).optional().or(z.literal("")),

    choiceOptionsText: z.string().max(5000).optional().or(z.literal("")),

    textMultiline: z.coerce.boolean().optional(),
    textMaxLength: z.coerce.number().int().positive().optional().or(z.literal("")),

    numberMin: z.coerce.number().optional().or(z.literal("")),
    numberMax: z.coerce.number().optional().or(z.literal("")),
    numberStep: z.coerce.number().optional().or(z.literal("")),

    likertPreset: likertPresetSchema.optional().default("custom"),
    showValueLabels: checkboxBoolean.default(false),
    likertValueLabelsText: optionalString,
});

export const assignItemDimensionSchema = z.object({
    versionId: z.string().uuid(),
    itemId: z.string().uuid(),
    dimensionId: z.string().uuid(),
    weight: z.coerce.number().min(-100).max(100).default(1),
    reverseScored: z.boolean().default(false),
});

export const removeItemDimensionSchema = z.object({
    versionId: z.string().uuid(),
    itemDimensionScoreId: z.string().uuid(),
});

export type CreateQuestionnaireInput = z.infer<typeof createQuestionnaireSchema>;
export type UpdateQuestionnaireInput = z.infer<typeof updateQuestionnaireSchema>;
export type CreateQuestionnaireVersionInput = z.infer<
    typeof createQuestionnaireVersionSchema
>;
export type UpdateQuestionnaireVersionInput = z.infer<
    typeof updateQuestionnaireVersionSchema
>;
export type CreateQuestionnairePageInput = z.infer<
    typeof createQuestionnairePageSchema
>;
export type UpdateQuestionnairePageInput = z.infer<
    typeof updateQuestionnairePageSchema
>;
export type CreateQuestionnaireDimensionInput = z.infer<
    typeof createQuestionnaireDimensionSchema
>;
export type UpdateQuestionnaireDimensionInput = z.infer<
    typeof updateQuestionnaireDimensionSchema
>;
export type CreateQuestionnaireItemInput = z.infer<
    typeof createQuestionnaireItemSchema
>;
export type UpdateQuestionnaireItemInput = z.infer<
    typeof updateQuestionnaireItemSchema
>;
export type AssignItemDimensionInput = z.infer<typeof assignItemDimensionSchema>;
export type RemoveItemDimensionInput = z.infer<typeof removeItemDimensionSchema>;

export const archiveQuestionnaireItemSchema = z.object({
    versionId: z.string().uuid(),
    itemId: z.string().uuid(),
});

export type ArchiveQuestionnaireItemInput = z.infer<
    typeof archiveQuestionnaireItemSchema
>;

export const archiveQuestionnairePageSchema = z.object({
    versionId: z.string().uuid(),
    pageId: z.string().uuid(),
});

export const archiveQuestionnaireDimensionSchema = z.object({
    versionId: z.string().uuid(),
    dimensionId: z.string().uuid(),
});

export type ArchiveQuestionnairePageInput = z.infer<
    typeof archiveQuestionnairePageSchema
>;

export type ArchiveQuestionnaireDimensionInput = z.infer<
    typeof archiveQuestionnaireDimensionSchema
>;


export const reorderQuestionnairePageSchema = z.object({
    versionId: z.string().uuid(),
    pageId: z.string().uuid(),
    direction: z.enum(["up", "down"]),
});

export const reorderQuestionnaireItemSchema = z.object({
    versionId: z.string().uuid(),
    itemId: z.string().uuid(),
    direction: z.enum(["up", "down"]),
});

export type ReorderQuestionnairePageInput = z.infer<
    typeof reorderQuestionnairePageSchema
>;

export type ReorderQuestionnaireItemInput = z.infer<
    typeof reorderQuestionnaireItemSchema
>;


export const assignPageDimensionSchema = z.object({
    versionId: z.string().uuid(),
    pageId: z.string().uuid(),
    dimensionId: z.string().uuid(),
    weight: z.coerce.number().min(-100).max(100).default(1),
    reverseScored: z.boolean().default(false),
});

export const removePageDimensionSchema = z.object({
    versionId: z.string().uuid(),
    pageDimensionScoreId: z.string().uuid(),
});

export type AssignPageDimensionInput = z.infer<typeof assignPageDimensionSchema>;

export type RemovePageDimensionInput = z.infer<typeof removePageDimensionSchema>;

export const publishQuestionnaireVersionSchema = z.object({
    versionId: z.string().uuid(),
});

export type PublishQuestionnaireVersionInput = z.infer<
    typeof publishQuestionnaireVersionSchema
>;


export const cloneQuestionnaireVersionSchema = z.object({
    sourceVersionId: z.string().uuid(),
    version: z.string().min(1).max(80),
    name: z.string().min(2).max(220),
    description: z.string().max(2000).optional().or(z.literal("")),
});

export type CloneQuestionnaireVersionInput = z.infer<
    typeof cloneQuestionnaireVersionSchema
>;

export const unpublishQuestionnaireVersionSchema = z.object({
    versionId: z.string().uuid(),
});

export type UnpublishQuestionnaireVersionInput = z.infer<
    typeof unpublishQuestionnaireVersionSchema
>;