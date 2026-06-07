// features/comparison-reports/api/comparison-share-client.actions.ts

// features/comparison-reports/api/comparison-share-client.actions.ts

"use server";

import { createMyComparisonShareAction } from "./comparison-share.actions";

export type CreateMyComparisonShareClientResult =
  | {
      ok: true;
      token: string;
      shareId: string;
      expiresAt: string | null;
      error: null;
    }
  | {
      ok: false;
      token: null;
      shareId: null;
      expiresAt: null;
      error: string;
    };

export async function createMyComparisonShareClientAction(
  input: unknown,
): Promise<CreateMyComparisonShareClientResult> {
  try {
    const result = await createMyComparisonShareAction(input);

    if (!result.ok) {
      return {
        ok: false,
        token: null,
        shareId: null,
        expiresAt: null,
        error: result.error ?? "Nie udało się utworzyć tokenu porównania.",
      };
    }

    if (!result.token || !result.shareId) {
      console.error("[comparison-share:create] invalid success payload", {
        hasToken: Boolean(result.token),
        hasShareId: Boolean(result.shareId),
        expiresAt: result.expiresAt ?? null,
      });

      return {
        ok: false,
        token: null,
        shareId: null,
        expiresAt: null,
        error: "Nie udało się utworzyć tokenu porównania.",
      };
    }

    return {
      ok: true,
      token: result.token,
      shareId: result.shareId,
      expiresAt: result.expiresAt ?? null,
      error: null,
    };
  } catch (error) {
    console.error("[comparison-share:create] failed", {
      message: error instanceof Error ? error.message : String(error),
      cause:
        error instanceof Error && "cause" in error
          ? (error as Error & { cause?: unknown }).cause
          : null,
    });

    return {
      ok: false,
      token: null,
      shareId: null,
      expiresAt: null,
      error:
        "Nie udało się utworzyć tokenu porównania. Spróbuj ponownie lub skontaktuj się z administratorem.",
    };
  }
}