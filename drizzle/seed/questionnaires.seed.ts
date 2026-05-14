import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../schema";

const {
  questionnaires,
  questionnaireVersions,
  questionnaireItems,
  users,
} = schema;

config({ path: ".env.local" });

const databaseUrl = process.env.CONTROL_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing CONTROL_DATABASE_URL in .env.local");
}

const sql = postgres(databaseUrl, { max: 1 });
const db = drizzle(sql, { schema });

const SUPER_ADMIN_EMAIL =
  process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@humanet.local";

async function main() {
  console.log("Seeding questionnaires...");

  const admin = await db.query.users.findFirst({
    where: eq(users.email, SUPER_ADMIN_EMAIL),
  });

  if (!admin) {
    throw new Error(`Super admin not found: ${SUPER_ADMIN_EMAIL}`);
  }

  const existingQuestionnaire = await db.query.questionnaires.findFirst({
    where: eq(questionnaires.code, "VALUES_DEMO"),
  });

  const [questionnaire] = existingQuestionnaire
    ? [existingQuestionnaire]
    : await db
        .insert(questionnaires)
        .values({
          code: "VALUES_DEMO",
          name: "HUMANET Values Demo",
          description:
            "Demonstracyjny kwestionariusz wartości do testowania ścieżki badania.",
          status: "active",
          createdBy: admin.id,
          updatedBy: admin.id,
        })
        .returning();

  const existingVersion = await db.query.questionnaireVersions.findFirst({
    where: eq(questionnaireVersions.questionnaireId, questionnaire.id),
  });

  const [version] = existingVersion
    ? [existingVersion]
    : await db
        .insert(questionnaireVersions)
        .values({
          questionnaireId: questionnaire.id,
          version: "v1",
          name: "HUMANET Values Demo v1",
          description: "Pierwsza demonstracyjna wersja kwestionariusza.",
          status: "active",
          scoringConfig: {
            type: "demo",
            dimensions: ["stability", "agency", "cooperation"],
          },
          createdBy: admin.id,
          updatedBy: admin.id,
        })
        .returning();

  const existingItems = await db.query.questionnaireItems.findMany({
    where: eq(questionnaireItems.questionnaireVersionId, version.id),
  });

  if (existingItems.length === 0) {
    await db.insert(questionnaireItems).values([
      {
        questionnaireVersionId: version.id,
        code: "VALUES_DEMO_001",
        orderIndex: 1,
        type: "likert",
        text: "W pracy najbardziej cenię jasne zasady i przewidywalność działania.",
        required: true,
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: "Zdecydowanie nie",
        scaleMaxLabel: "Zdecydowanie tak",
        scoringKey: {
          dimension: "stability",
          direction: 1,
        },
        createdBy: admin.id,
        updatedBy: admin.id,
      },
      {
        questionnaireVersionId: version.id,
        code: "VALUES_DEMO_002",
        orderIndex: 2,
        type: "likert",
        text: "Najlepiej działam wtedy, gdy mam dużą autonomię i wpływ na sposób realizacji zadań.",
        required: true,
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: "Zdecydowanie nie",
        scaleMaxLabel: "Zdecydowanie tak",
        scoringKey: {
          dimension: "agency",
          direction: 1,
        },
        createdBy: admin.id,
        updatedBy: admin.id,
      },
      {
        questionnaireVersionId: version.id,
        code: "VALUES_DEMO_003",
        orderIndex: 3,
        type: "likert",
        text: "Dobre decyzje wymagają rozmowy i uwzględnienia różnych perspektyw.",
        required: true,
        scaleMin: 1,
        scaleMax: 5,
        scaleMinLabel: "Zdecydowanie nie",
        scaleMaxLabel: "Zdecydowanie tak",
        scoringKey: {
          dimension: "cooperation",
          direction: 1,
        },
        createdBy: admin.id,
        updatedBy: admin.id,
      },
    ]);

    console.log("Demo questionnaire items created.");
  } else {
    console.log("Demo questionnaire items already exist.");
  }

  console.log("Questionnaires seed completed.");
}

main()
  .catch((error) => {
    console.error("Questionnaires seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end();
  });