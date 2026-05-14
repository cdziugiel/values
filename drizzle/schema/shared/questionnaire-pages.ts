import {
    index,
    integer,
    pgTable,
    text,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
    auditColumns,
    id,
    softDelete,
    timestamps,
} from "./common-columns";
import { questionnaireVersions } from "./questionnaires";

export const questionnairePages = pgTable(
    "questionnaire_pages",
    {
        ...id,

        questionnaireVersionId: uuid("questionnaire_version_id")
            .notNull()
            .references(() => questionnaireVersions.id, { onDelete: "cascade" }),

        code: text("code").notNull(),

        title: text("title").notNull(),
        description: text("description"),

        orderIndex: integer("order_index").default(0).notNull(),

        ...timestamps,
        ...auditColumns,
        ...softDelete,
    },
    (table) => [
        uniqueIndex("questionnaire_pages_version_order_active_uidx")
            .on(table.questionnaireVersionId, table.orderIndex)
            .where(sql`${table.deletedAt} is null`),
        uniqueIndex("questionnaire_pages_version_code_uidx").on(
            table.questionnaireVersionId,
            table.code,
        ),
        index("questionnaire_pages_version_id_idx").on(
            table.questionnaireVersionId,
        ),
        index("questionnaire_pages_order_idx").on(table.orderIndex),
        index("questionnaire_pages_deleted_at_idx").on(table.deletedAt),
    ],
);