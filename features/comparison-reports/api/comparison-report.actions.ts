// features/comparison-reports/api/comparison-report.actions.ts

"use server";

import { getPeerComparisonReportData } from "./comparison-report.queries";

export async function compareMyResultWithTokenAction(input: unknown) {
  try {
    const data = await getPeerComparisonReportData(input);

    return {
      ok: true as const,
      data,
      error: null,
    };
  } catch (error) {
    return {
      ok: false as const,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Nie udało się porównać wyników.",
    };
  }
}