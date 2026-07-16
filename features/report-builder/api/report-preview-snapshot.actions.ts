"use server";

import { redirect } from "next/navigation";

import { reportPreviewSnapshots } from "@/drizzle/schema";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { controlDb } from "@/server/db/control-db";

import {
  createSyntheticReportPreviewSchema,
  type CreateSyntheticReportPreviewInput,
} from "../forms/report-preview-snapshot.schema";

import { buildSyntheticReportSnapshot } from "../lib/build-synthetic-report-snapshot";
import { getReportPreviewDefinition } from "./report-preview-data.queries";

export type CreateSyntheticReportPreviewState = {
  status: "idle" | "error";
  message: string;
};

function parseJsonField<T>(
  formData: FormData,
  name: string,
  fallback: T,
): T {
  const raw = formData.get(name);

  if (typeof raw !== "string" || !raw.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `Pole "${name}" zawiera nieprawidłowy JSON.`,
    );
  }
}

export async function createSyntheticReportPreviewAction(
  _previousState: CreateSyntheticReportPreviewState,
  formData: FormData,
): Promise<CreateSyntheticReportPreviewState> {
  const user = await requireSuperAdmin();

  try {
    const rawInput: CreateSyntheticReportPreviewInput = {
      reportTemplateVersionId: String(
        formData.get("reportTemplateVersionId") ?? "",
      ),
      questionnaireVersionId: String(
        formData.get("questionnaireVersionId") ?? "",
      ),
      scoreCategory: String(
        formData.get("scoreCategory") ?? "",
      ),
      scores: parseJsonField(formData, "scores", []),
      crossMatrices: parseJsonField(
        formData,
        "crossMatrices",
        [],
      ),
    };

    const parsed =
      createSyntheticReportPreviewSchema.safeParse(rawInput);

    if (!parsed.success) {
      return {
        status: "error",
        message:
          parsed.error.issues[0]?.message ??
          "Nieprawidłowa konfiguracja podglądu.",
      };
    }

    const definition = await getReportPreviewDefinition({
      reportTemplateVersionId:
        parsed.data.reportTemplateVersionId,
    });

    if (!definition) {
      return {
        status: "error",
        message:
          "Nie znaleziono wersji kwestionariusza przypisanej do raportu.",
      };
    }

    if (
      definition.questionnaireVersionId !==
      parsed.data.questionnaireVersionId
    ) {
      return {
        status: "error",
        message:
          "Wersja kwestionariusza nie jest zgodna z szablonem raportu.",
      };
    }

    const payload = buildSyntheticReportSnapshot({
      definition,
      previewInput: parsed.data,
      createdBy: user.id,
    });

    const expiresAt = new Date(
      Date.now() + 6 * 60 * 60 * 1000,
    );

    const [created] = await controlDb
      .insert(reportPreviewSnapshots)
      .values({
        reportTemplateVersionId:
          parsed.data.reportTemplateVersionId,
        questionnaireVersionId:
          parsed.data.questionnaireVersionId,
        payload,
        expiresAt,
        createdBy: user.id,
        updatedBy: user.id,
      })
      .returning({
        id: reportPreviewSnapshots.id,
      });

    if (!created) {
      return {
        status: "error",
        message:
          "Nie udało się utworzyć tymczasowego snapshotu.",
      };
    }

    redirect(
      `/dashboard/report-builder/${parsed.data.reportTemplateVersionId}` +
        `/preview/${created.id}`,
    );
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      error.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error(
      "[createSyntheticReportPreviewAction]",
      {
        userId: user.id,
        reportTemplateVersionId: String(
          formData.get("reportTemplateVersionId") ?? "",
        ),
        error,
      },
    );

    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nie udało się utworzyć podglądu.",
    };
  }
}
