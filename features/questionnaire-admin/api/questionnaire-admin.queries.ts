import { and, asc, count, eq, isNull } from "drizzle-orm";

import {
    questionnaireDimensions,
    questionnaireItemDimensionScores,
    questionnairePageDimensionScores,
    questionnaireItems,
    questionnairePages,
    questionnaires,
    questionnaireVersions,
} from "@/drizzle/schema";
import { controlDb } from "@/server/db/control-db";

import type {
    QuestionnaireAdminListItem,
    QuestionnaireDimensionEditorItem,
    QuestionnaireItemDimensionScoreEditorItem,
    QuestionnaireItemEditorItem,
    QuestionnairePageDimensionScoreEditorItem,
    QuestionnairePageEditorItem,
    QuestionnaireVersionEditorData,
    QuestionnaireVersionListItem,
} from "../types/questionnaire-admin.types";

export async function listQuestionnairesAdmin(): Promise<
    QuestionnaireAdminListItem[]
> {
    const rows = await controlDb
        .select({
            id: questionnaires.id,
            code: questionnaires.code,
            name: questionnaires.name,
            description: questionnaires.description,
            status: questionnaires.status,
            createdAt: questionnaires.createdAt,
            updatedAt: questionnaires.updatedAt,
            versionCount: count(questionnaireVersions.id),
        })
        .from(questionnaires)
        .leftJoin(
            questionnaireVersions,
            and(
                eq(questionnaireVersions.questionnaireId, questionnaires.id),
                isNull(questionnaireVersions.deletedAt),
            ),
        )
        .where(isNull(questionnaires.deletedAt))
        .groupBy(questionnaires.id)
        .orderBy(asc(questionnaires.name));

    return rows.map((row) => ({
        ...row,
        versionCount: Number(row.versionCount),
    }));
}

export async function listQuestionnaireVersionsAdmin(
    questionnaireId: string,
): Promise<QuestionnaireVersionListItem[]> {
    return controlDb
        .select({
            id: questionnaireVersions.id,
            questionnaireId: questionnaireVersions.questionnaireId,
            version: questionnaireVersions.version,
            name: questionnaireVersions.name,
            description: questionnaireVersions.description,
            status: questionnaireVersions.status,
            isPublic: questionnaireVersions.isPublic,
            createdAt: questionnaireVersions.createdAt,
            updatedAt: questionnaireVersions.updatedAt,
        })
        .from(questionnaireVersions)
        .where(
            and(
                eq(questionnaireVersions.questionnaireId, questionnaireId),
                isNull(questionnaireVersions.deletedAt),
            ),
        )
        .orderBy(asc(questionnaireVersions.version));
}

export async function getQuestionnaireVersionEditorData(
    versionId: string,
): Promise<QuestionnaireVersionEditorData | null> {
    const version = await controlDb.query.questionnaireVersions.findFirst({
        where: and(
            eq(questionnaireVersions.id, versionId),
            isNull(questionnaireVersions.deletedAt),
        ),
    });

    if (!version) {
        return null;
    }

    const pages = await controlDb
        .select({
            id: questionnairePages.id,
            code: questionnairePages.code,
            title: questionnairePages.title,
            description: questionnairePages.description,
            orderIndex: questionnairePages.orderIndex,
        })
        .from(questionnairePages)
        .where(
            and(
                eq(questionnairePages.questionnaireVersionId, versionId),
                isNull(questionnairePages.deletedAt),
            ),
        )
        .orderBy(asc(questionnairePages.orderIndex));

    const dimensions = await controlDb
        .select({
            id: questionnaireDimensions.id,
            code: questionnaireDimensions.code,
            name: questionnaireDimensions.name,
            description: questionnaireDimensions.description,
            orderIndex: questionnaireDimensions.orderIndex,
        })
        .from(questionnaireDimensions)
        .where(
            and(
                eq(questionnaireDimensions.questionnaireVersionId, versionId),
                isNull(questionnaireDimensions.deletedAt),
            ),
        )
        .orderBy(asc(questionnaireDimensions.orderIndex));


    const pageDimensionScoreRows = await controlDb
        .select({
            id: questionnairePageDimensionScores.id,
            questionnairePageId: questionnairePageDimensionScores.questionnairePageId,
            questionnaireDimensionId:
                questionnairePageDimensionScores.questionnaireDimensionId,
            dimensionCode: questionnaireDimensions.code,
            dimensionName: questionnaireDimensions.name,
            weight: questionnairePageDimensionScores.weight,
            reverseScored: questionnairePageDimensionScores.reverseScored,
        })
        .from(questionnairePageDimensionScores)
        .innerJoin(
            questionnaireDimensions,
            eq(
                questionnaireDimensions.id,
                questionnairePageDimensionScores.questionnaireDimensionId,
            ),
        )
        .innerJoin(
            questionnairePages,
            eq(questionnairePages.id, questionnairePageDimensionScores.questionnairePageId),
        )
        .where(
            and(
                eq(questionnairePages.questionnaireVersionId, versionId),
                isNull(questionnairePageDimensionScores.deletedAt),
                isNull(questionnaireDimensions.deletedAt),
                isNull(questionnairePages.deletedAt),
            ),
        );

    const pageScoresByPageId = new Map<
        string,
        QuestionnairePageDimensionScoreEditorItem[]
    >();

    for (const row of pageDimensionScoreRows) {
        const list = pageScoresByPageId.get(row.questionnairePageId) ?? [];

        list.push({
            ...row,
            weight: String(row.weight),
        });

        pageScoresByPageId.set(row.questionnairePageId, list);
    }

    const items = await controlDb
        .select({
            id: questionnaireItems.id,
            questionnaireVersionId: questionnaireItems.questionnaireVersionId,
            questionnairePageId: questionnaireItems.questionnairePageId,
            pageTitle: questionnairePages.title,
            code: questionnaireItems.code,
            orderIndex: questionnaireItems.orderIndex,
            type: questionnaireItems.type,
            text: questionnaireItems.text,
            helpText: questionnaireItems.helpText,
            required: questionnaireItems.required,
            scaleMin: questionnaireItems.scaleMin,
            scaleMax: questionnaireItems.scaleMax,
            scaleMinLabel: questionnaireItems.scaleMinLabel,
            scaleMaxLabel: questionnaireItems.scaleMaxLabel,
            options: questionnaireItems.options,
            responseConfig: questionnaireItems.responseConfig,
        })
        .from(questionnaireItems)
        .leftJoin(
            questionnairePages,
            eq(questionnairePages.id, questionnaireItems.questionnairePageId),
        )
        .where(
            and(
                eq(questionnaireItems.questionnaireVersionId, versionId),
                isNull(questionnaireItems.deletedAt),
            ),
        )
        .orderBy(asc(questionnaireItems.orderIndex));

    const itemDimensionScoreRows = await controlDb
        .select({
            id: questionnaireItemDimensionScores.id,
            questionnaireItemId: questionnaireItemDimensionScores.questionnaireItemId,
            questionnaireDimensionId:
                questionnaireItemDimensionScores.questionnaireDimensionId,
            dimensionCode: questionnaireDimensions.code,
            dimensionName: questionnaireDimensions.name,
            weight: questionnaireItemDimensionScores.weight,
            reverseScored: questionnaireItemDimensionScores.reverseScored,
        })
        .from(questionnaireItemDimensionScores)
        .innerJoin(
            questionnaireDimensions,
            eq(
                questionnaireDimensions.id,
                questionnaireItemDimensionScores.questionnaireDimensionId,
            ),
        )
        .innerJoin(
            questionnaireItems,
            eq(questionnaireItems.id, questionnaireItemDimensionScores.questionnaireItemId),
        )
        .where(
            and(
                eq(questionnaireItems.questionnaireVersionId, versionId),
                isNull(questionnaireItemDimensionScores.deletedAt),
                isNull(questionnaireDimensions.deletedAt),
                isNull(questionnaireItems.deletedAt),
            ),
        );

    const scoresByItemId = new Map<
        string,
        QuestionnaireItemDimensionScoreEditorItem[]
    >();

    for (const row of itemDimensionScoreRows) {
        const list = scoresByItemId.get(row.questionnaireItemId) ?? [];
        list.push({
            ...row,
            weight: String(row.weight),
        });
        scoresByItemId.set(row.questionnaireItemId, list);
    }

    return {
        version: {
            id: version.id,
            questionnaireId: version.questionnaireId,
            version: version.version,
            name: version.name,
            description: version.description,
            status: version.status,
            isPublic: version.isPublic,
            createdAt: version.createdAt,
            updatedAt: version.updatedAt,
        },
        pages: pages.map((page) => ({
            ...page,
            dimensionScores: pageScoresByPageId.get(page.id) ?? [],
        })),
        dimensions: dimensions as QuestionnaireDimensionEditorItem[],
        items: items.map(
            (item): QuestionnaireItemEditorItem => ({
                ...item,
                dimensionScores: scoresByItemId.get(item.id) ?? [],
            }),
        ),
    };
}