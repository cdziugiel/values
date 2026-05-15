// features/my-assessment/components/my-assessment-completed-result-view.tsx

import Link from "next/link";

type CompletedAssessmentScore = {
  id?: string | null;

  dimensionId?: string | null;
  dimensionCode?: string | null;
  dimensionName?: string | null;

  category?: string | null;
  categoryLabel?: string | null;
  categoryOrderIndex?: number | string | null;

  dimensionCategory?: string | null;
  dimensionCategoryLabel?: string | null;
  dimensionCategoryOrderIndex?: number | string | null;

  orderIndex?: number | string | null;
  dimensionOrderIndex?: number | string | null;

  meanScore?: unknown;
  weightedMeanScore?: unknown;
  completeness?: unknown;
};

type CompletedAssessmentResponse = {
  itemId?: string | null;
  itemText?: string | null;

  pageId?: string | null;
  pageCode?: string | null;
  pageTitle?: string | null;
  pageDescription?: string | null;
  pageOrderIndex?: number | string | null;

  itemOrderIndex?: number | string | null;
  orderIndex?: number | string | null;

  responseExists?: boolean | null;
  responseDisplayValue?: string | number | boolean | null;
};

type CompletedAssessmentPayload = {
  frozenAt?: string | Date | null;
  project?: {
    name?: string | null;
  } | null;
  scores?: CompletedAssessmentScore[] | null;
  responses?: CompletedAssessmentResponse[] | null;
};

type MyAssessmentCompletedResultViewProps = {
  result: {
    tenantSlug: string;
    sessionId: string;
    payload: CompletedAssessmentPayload | null;
  };
};

type ScoreCategoryGroup = {
  key: string;
  label: string;
  orderIndex: number;
  scores: CompletedAssessmentScore[];
};

type ResponsePageGroup = {
  key: string;
  title: string;
  description: string | null;
  orderIndex: number;
  responses: CompletedAssessmentResponse[];
};

const DEFAULT_CATEGORY_KEY = "__NO_CATEGORY__";
const DEFAULT_CATEGORY_LABEL = "Bez kategorii";
const FALLBACK_ORDER_INDEX = Number.MAX_SAFE_INTEGER;

function formatPercent(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "—";
  }

  return `${Math.round(numberValue * 100)}%`;
}

function formatNumber(value: unknown) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "—";
  }

  return Number(numberValue.toFixed(2)).toString();
}

function numberOrFallback(value: unknown, fallback = FALLBACK_ORDER_INDEX) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}


function getResponsePageKey(response: CompletedAssessmentResponse) {
  return (
    stringOrNull(response.pageId) ??
    stringOrNull(response.pageCode) ??
    stringOrNull(response.pageTitle) ??
    "__NO_PAGE__"
  );
}

function getResponsePageTitle(response: CompletedAssessmentResponse) {
  return (
    stringOrNull(response.pageTitle) ??
    "Pozostałe odpowiedzi"
  );
}

function getResponsePageDescription(response: CompletedAssessmentResponse) {
  return stringOrNull(response.pageDescription);
}

function getResponsePageOrderIndex(response: CompletedAssessmentResponse) {
  return numberOrFallback(response.pageOrderIndex);
}

function getResponseItemOrderIndex(
  response: CompletedAssessmentResponse,
  fallbackIndex: number,
) {
  return Math.min(
    numberOrFallback(response.itemOrderIndex),
    numberOrFallback(response.orderIndex),
    fallbackIndex,
  );
}

function groupResponsesByPage(responses: CompletedAssessmentResponse[]) {
  const groups = new Map<string, ResponsePageGroup>();

  responses.forEach((response, index) => {
    const key = getResponsePageKey(response);
    const title = getResponsePageTitle(response);
    const description = getResponsePageDescription(response);
    const orderIndex = getResponsePageOrderIndex(response);

    const existing = groups.get(key);

    const responseWithFallbackOrder = {
      ...response,
      orderIndex:
        response.orderIndex ??
        response.itemOrderIndex ??
        index,
    };

    if (existing) {
      existing.responses.push(responseWithFallbackOrder);

      if (!existing.description && description) {
        existing.description = description;
      }

      existing.orderIndex = Math.min(existing.orderIndex, orderIndex);
    } else {
      groups.set(key, {
        key,
        title,
        description,
        orderIndex,
        responses: [responseWithFallbackOrder],
      });
    }
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      responses: [...group.responses].sort((left, right) => {
        const leftOrder = getResponseItemOrderIndex(left, 0);
        const rightOrder = getResponseItemOrderIndex(right, 0);

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return compareText(left.itemText, right.itemText);
      }),
    }))
    .sort((left, right) => {
      if (left.orderIndex !== right.orderIndex) {
        return left.orderIndex - right.orderIndex;
      }

      return compareText(left.title, right.title);
    });
}

function stringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized ? normalized : null;
}

function getScoreCategoryKey(score: CompletedAssessmentScore) {
  return (
    stringOrNull(score.dimensionCategory) ??
    stringOrNull(score.category) ??
    DEFAULT_CATEGORY_KEY
  );
}

function getScoreCategoryLabel(score: CompletedAssessmentScore) {
  return (
    stringOrNull(score.dimensionCategoryLabel) ??
    stringOrNull(score.categoryLabel) ??
    stringOrNull(score.dimensionCategory) ??
    stringOrNull(score.category) ??
    DEFAULT_CATEGORY_LABEL
  );
}

function getScoreCategoryOrderIndex(score: CompletedAssessmentScore) {
  return Math.min(
    numberOrFallback(score.dimensionCategoryOrderIndex),
    numberOrFallback(score.categoryOrderIndex),
  );
}

function getScoreDimensionOrderIndex(score: CompletedAssessmentScore) {
  return Math.min(
    numberOrFallback(score.dimensionOrderIndex),
    numberOrFallback(score.orderIndex),
  );
}

function compareText(left: unknown, right: unknown) {
  return String(left ?? "").localeCompare(String(right ?? ""), "pl", {
    sensitivity: "base",
    numeric: true,
  });
}

function sortScores(scores: CompletedAssessmentScore[]) {
  return [...scores].sort((left, right) => {
    const orderDiff =
      getScoreDimensionOrderIndex(left) - getScoreDimensionOrderIndex(right);

    if (orderDiff !== 0) {
      return orderDiff;
    }

    const codeDiff = compareText(left.dimensionCode, right.dimensionCode);

    if (codeDiff !== 0) {
      return codeDiff;
    }

    return compareText(left.dimensionName, right.dimensionName);
  });
}


function groupScoresByCategory(scores: any[]) {
  const groups = new Map<
    string,
    {
      category: string;
      categoryOrderIndex: number;
      scores: any[];
    }
  >();

  for (const score of scores) {
    const category =
      typeof score.dimensionCategoryLabel === "string" &&
        score.dimensionCategoryLabel.trim()
        ? score.dimensionCategoryLabel.trim()
        : typeof score.dimensionCategory === "string" &&
          score.dimensionCategory.trim()
          ? score.dimensionCategory.trim()
          : "Pozostałe";

    const categoryOrderIndex =
      typeof score.dimensionCategoryOrderIndex === "number"
        ? score.dimensionCategoryOrderIndex
        : 999;

    const existing = groups.get(category);

    if (existing) {
      existing.scores.push(score);
    } else {
      groups.set(category, {
        category,
        categoryOrderIndex,
        scores: [score],
      });
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      scores: group.scores.sort((a, b) => {
        const aOrder =
          typeof a.dimensionOrderIndex === "number"
            ? a.dimensionOrderIndex
            : Number.MAX_SAFE_INTEGER;

        const bOrder =
          typeof b.dimensionOrderIndex === "number"
            ? b.dimensionOrderIndex
            : Number.MAX_SAFE_INTEGER;

        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }

        return String(a.dimensionName ?? "").localeCompare(
          String(b.dimensionName ?? ""),
          "pl",
        );
      }),
    }))
    .sort((a, b) => {
      if (a.categoryOrderIndex !== b.categoryOrderIndex) {
        return a.categoryOrderIndex - b.categoryOrderIndex;
      }

      return a.category.localeCompare(b.category, "pl");
    });
}
function getScoreKey(score: CompletedAssessmentScore, index: number) {
  return (
    score.id ??
    score.dimensionId ??
    score.dimensionCode ??
    `score-${index}`
  );
}

function getResponseKey(response: CompletedAssessmentResponse, index: number) {
  return response.itemId ?? `response-${index}`;
}

export function MyAssessmentCompletedResultView({
  result,
}: MyAssessmentCompletedResultViewProps) {
  const payload = result.payload;

  const scores = Array.isArray(payload?.scores) ? payload.scores : [];
  const scoreGroups = groupScoresByCategory(scores);
  const responses = Array.isArray(payload?.responses) ? payload.responses : [];
  const responseGroups = groupResponsesByPage(responses);

  const answeredCount = responses.filter(
    (response) => response.responseExists,
  ).length;

  const totalCount = responses.length;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10">
      <section className="rounded-2xl border bg-card p-6 md:p-8">
        <div className="text-sm font-medium text-muted-foreground">
          HUMANET VALUES
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Wynik badania</h1>

            <p className="mt-3 max-w-2xl text-muted-foreground">
              Badanie zostało zakończone. Poniżej widzisz zamrożone podsumowanie
              zapisane w momencie zakończenia sesji.
            </p>
          </div>

          <Link
            href="/my/assessment"
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do moich badań
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="text-xs uppercase text-muted-foreground">
              Projekt
            </div>
            <div className="mt-1 font-medium">
              {payload?.project?.name ?? "—"}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="text-xs uppercase text-muted-foreground">
              Odpowiedzi
            </div>
            <div className="mt-1 font-medium">
              {answeredCount} / {totalCount}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="text-xs uppercase text-muted-foreground">
              Snapshot
            </div>
            <div className="mt-1 font-medium">
              {payload?.frozenAt
                ? new Date(payload.frozenAt).toLocaleString("pl-PL")
                : "—"}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Podsumowanie wymiarów</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Wyniki są zapisane jako snapshot, więc późniejsze zmiany w
            kwestionariuszu nie zmienią tego podsumowania.
          </p>
        </div>

        {scores.length === 0 ? (
          <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            Brak zapisanych wyników wymiarów. Sprawdź, czy przed utworzeniem
            snapshotu uruchamiasz przeliczenie wyników sesji.
          </div>
        ) : (
          <div className="space-y-6">
            {scoreGroups.map((group) => (
              <div key={group.category} className="overflow-hidden rounded-xl border">
                <div className="border-b bg-muted/40 px-4 py-3">
                  <h3 className="font-semibold">{group.category}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Liczba wymiarów: {group.scores.length}
                  </p>
                </div>

                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted/20">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Wymiar</th>
                      <th className="px-4 py-3 text-right font-medium">Średnia</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Średnia ważona
                      </th>
                      <th className="px-4 py-3 text-right font-medium">
                        Kompletność
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {group.scores.map((score: any) => (
                      <tr
                        key={score.id ?? score.questionnaireDimensionId}
                        className="border-t"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium">
                            {score.dimensionName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {score.dimensionCode}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-right">
                          {formatNumber(score.meanScore)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {formatNumber(score.weightedMeanScore)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {formatPercent(score.completeness)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Odpowiedzi</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            W tej sekcji pokazujemy zapisane odpowiedzi w formie czytelnej dla
            respondenta.
          </p>
        </div>

        {responses.length === 0 ? (
          <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            Brak zapisanych odpowiedzi w snapshocie.
          </div>
        ) : (
          <div className="space-y-6">
            {responseGroups.map((group, groupIndex) => (
              <div
                key={group.key}
                className="overflow-hidden rounded-xl border bg-background"
              >
                <div className="border-b bg-muted/40 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium">
                      {groupIndex + 1}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold leading-relaxed">
                        {group.title}
                      </h3>

                      {group.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {group.description}
                        </p>
                      ) : null}

                      <p className="mt-1 text-xs text-muted-foreground">
                        Liczba odpowiedzi: {group.responses.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="divide-y">
                  {group.responses.map((response, responseIndex) => (
                    <div
                      key={getResponseKey(response, responseIndex)}
                      className="p-4"
                    >
                      <div className="flex gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                          {responseIndex + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                            <div className="font-medium leading-relaxed">
                              {response.itemText ?? "—"}
                            </div>

                            <div className="inline-flex shrink-0 items-center rounded-full border bg-green-50 px-3 py-1 text-center text-sm font-medium text-green-800">
                              {response.responseDisplayValue ?? "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}