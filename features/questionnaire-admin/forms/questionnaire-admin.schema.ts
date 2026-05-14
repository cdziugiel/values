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
});

export const createQuestionnairePageSchema = z.object({
  versionId: z.string().uuid(),
  code: z.string().min(2).max(80),
  title: z.string().min(2).max(220),
  description: z.string().max(2000).optional().or(z.literal("")),
  orderIndex: z.coerce.number().int().min(0).default(0),
});

export const updateQuestionnairePageSchema = z.object({
  pageId: z.string().uuid(),
  versionId: z.string().uuid(),
  code: z.string().min(2).max(80),
  title: z.string().min(2).max(220),
  description: z.string().max(2000).optional().or(z.literal("")),
  orderIndex: z.coerce.number().int().min(0),
});

export const createQuestionnaireDimensionSchema = z.object({
  versionId: z.string().uuid(),
  code: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[A-Z0-9_]+$/, {
      message: "Kod wymiaru powinien zawierać wielkie litery, cyfry i podkreślenia.",
    }),
  name: z.string().min(2).max(180),
  description: z.string().max(2000).optional().or(z.literal("")),
  orderIndex: z.coerce.number().int().min(0).default(0),
});

export const updateQuestionnaireDimensionSchema = z.object({
  dimensionId: z.string().uuid(),
  versionId: z.string().uuid(),
  code: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[A-Z0-9_]+$/),
  name: z.string().min(2).max(180),
  description: z.string().max(2000).optional().or(z.literal("")),
  orderIndex: z.coerce.number().int().min(0),
});

export const createQuestionnaireItemSchema = z.object({
  versionId: z.string().uuid(),
  pageId: z.string().uuid().optional().or(z.literal("")),
  code: z.string().min(2).max(120),
  orderIndex: z.coerce.number().int().min(0).default(0),
  type: questionnaireItemTypeSchema,
  text: z.string().min(2).max(2000),
  helpText: z.string().max(2000).optional().or(z.literal("")),
  required: z.coerce.boolean().default(true),
  scaleMin: z.coerce.number().int().optional().or(z.literal("")),
  scaleMax: z.coerce.number().int().optional().or(z.literal("")),
  scaleMinLabel: z.string().max(120).optional().or(z.literal("")),
  scaleMaxLabel: z.string().max(120).optional().or(z.literal("")),
});

export const updateQuestionnaireItemSchema = z.object({
  itemId: z.string().uuid(),
  versionId: z.string().uuid(),
  pageId: z.string().uuid().optional().or(z.literal("")),
  code: z.string().min(2).max(120),
  orderIndex: z.coerce.number().int().min(0),
  type: questionnaireItemTypeSchema,
  text: z.string().min(2).max(2000),
  helpText: z.string().max(2000).optional().or(z.literal("")),
  required: z.coerce.boolean(),
  scaleMin: z.coerce.number().int().optional().or(z.literal("")),
  scaleMax: z.coerce.number().int().optional().or(z.literal("")),
  scaleMinLabel: z.string().max(120).optional().or(z.literal("")),
  scaleMaxLabel: z.string().max(120).optional().or(z.literal("")),
});

export const assignItemDimensionSchema = z.object({
  versionId: z.string().uuid(),
  itemId: z.string().uuid(),
  dimensionId: z.string().uuid(),
  weight: z.coerce.number().min(-100).max(100).default(1),
  reverseScored: z.coerce.boolean().default(false),
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