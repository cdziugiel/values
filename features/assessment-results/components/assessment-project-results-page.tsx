import Link from "next/link";

import { getAssessmentProjectResults } from "../api/assessment-project-results.queries";

type AssessmentProjectResultsPageProps = {
  tenantSlug: string;
  assessmentProjectId: string;
};

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
}

function sessionStatusLabel(status: string) {
  if (status === "completed") return "Ukończona";
  if (status === "in_progress") return "W trakcie";
  if (status === "expired") return "Wygasła";
  if (status === "abandoned") return "Przerwana";
  if (status === "not_started") return "Nierozpoczęta";

  return status;
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("pl-PL", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

function statusLabel(status: string) {
  if (status === "draft") return "Szkic";
  if (status === "active") return "Aktywne";
  if (status === "closed") return "Zamknięte";
  if (status === "archived") return "Zarchiwizowane";

  return status;
}

function groupBy<T>(
  items: T[],
  getKey: (item: T) => string,
): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item);
    acc[key] ??= [];
    acc[key].push(item);
    return acc;
  }, {});
}

export async function AssessmentProjectResultsPage({
  tenantSlug,
  assessmentProjectId,
}: AssessmentProjectResultsPageProps) {
  const data = await getAssessmentProjectResults({
    tenantSlug,
    assessmentProjectId,
  });

  if (!data) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border bg-card p-6">
          <h1 className="text-2xl font-semibold">Nie znaleziono projektu</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Nie znaleziono projektu badawczego dla wskazanego tenanta.
          </p>

          <Link
            href={`/t/${tenantSlug}/assessment-projects`}
            className="mt-4 inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
          >
            Wróć do projektów
          </Link>
        </section>
      </main>
    );
  }

  const dimensionGroups = Object.entries(
    groupBy(
      data.dimensionAggregates,
      (aggregate) => aggregate.questionnaireVersionId,
    ),
  ).map(([questionnaireVersionId, aggregates]) => ({
    questionnaireVersionId,
    questionnaireName: aggregates[0]?.questionnaireName ?? "Kwestionariusz",
    questionnaireVersionName:
      aggregates[0]?.questionnaireVersionName ?? "Wersja",
    aggregates,
  }));


  const respondentMatrixGroups = dimensionGroups.map((group) => {
  const dimensions = group.aggregates.map((aggregate) => ({
    dimensionId: aggregate.dimensionId,
    dimensionCode: aggregate.dimensionCode,
    dimensionName: aggregate.dimensionName,
  }));

  return {
    questionnaireVersionId: group.questionnaireVersionId,
    questionnaireName: group.questionnaireName,
    questionnaireVersionName: group.questionnaireVersionName,
    dimensions,
    respondents: data.respondentResults.map((respondent) => {
      const scoresForQuestionnaire = respondent.scores.filter(
        (score) => score.questionnaireVersionId === group.questionnaireVersionId,
      );

      const scoreByDimensionId = new Map(
        scoresForQuestionnaire.map((score) => [score.dimensionId, score]),
      );

      const completenessValues = scoresForQuestionnaire.map(
        (score) => score.completeness,
      );

      const averageCompleteness =
        completenessValues.length > 0
          ? completenessValues.reduce((acc, value) => acc + value, 0) /
            completenessValues.length
          : null;

      return {
        ...respondent,
        scoreByDimensionId,
        averageCompleteness,
      };
    }),
  };
});

  const categoricalGroups = Object.entries(
    groupBy(
      data.categoricalAggregates,
      (item) => item.questionnaireVersionId,
    ),
  ).map(([questionnaireVersionId, items]) => ({
    questionnaireVersionId,
    questionnaireName: items[0]?.questionnaireName ?? "Kwestionariusz",
    questionnaireVersionName: items[0]?.questionnaireVersionName ?? "Wersja",
    items,
  }));

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            HUMANET VALUES · Wyniki projektu
          </div>

          <h1 className="mt-2 text-3xl font-semibold">{data.project.name}</h1>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Status: {statusLabel(data.project.status)}</span>
            <span>·</span>
            <span>Tenant: {data.tenant.slug}</span>
          </div>

          {data.project.description ? (
            <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
              {data.project.description}
            </p>
          ) : null}
        </div>

<div className="flex flex-wrap gap-2">
  <Link
    href={`/t/${tenantSlug}/assessment-projects/${assessmentProjectId}/results/export?format=xlsx`}
    className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
  >
    Eksport XLSX
  </Link>

  <Link
    href={`/t/${tenantSlug}/assessment-projects/${assessmentProjectId}/results/export?format=csv&dataset=dimensions`}
    className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
  >
    CSV wymiary
  </Link>

  <Link
    href={`/t/${tenantSlug}/assessment-projects/${assessmentProjectId}/results/export?format=csv&dataset=respondents`}
    className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
  >
    CSV respondenci
  </Link>

  <Link
    href={`/t/${tenantSlug}/assessment-projects/${assessmentProjectId}/results/export?format=csv&dataset=categorical`}
    className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
  >
    CSV kategorie
  </Link>

  <Link
    href={`/t/${tenantSlug}/assessment-projects`}
    className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
  >
    Wróć do projektów
  </Link>
</div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Wszystkie sesje
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {data.summary.sessionsCount}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Ukończone
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {data.summary.completedSessionsCount}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">
            W trakcie
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {data.summary.inProgressSessionsCount}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Nierozpoczęte
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {data.summary.notStartedSessionsCount}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div>
          <h2 className="text-xl font-semibold">Agregacja wymiarów</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Średnie wyniki z ukończonych sesji, obliczone na podstawie scoringu
            itemów i przypisań do wymiarów.
          </p>
        </div>

        {data.dimensionAggregates.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            Brak wyników wymiarów do agregacji. Upewnij się, że sesje są
            zakończone i przeliczone.
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {dimensionGroups.map((group) => (
              <div
                key={group.questionnaireVersionId}
                className="rounded-2xl border bg-muted/20 p-4"
              >
                <div>
                  <h3 className="text-lg font-semibold">
                    {group.questionnaireName}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {group.questionnaireVersionName}
                  </p>
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border bg-background">
                  <table className="w-full min-w-[1100px] border-collapse text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        <th className="px-3 py-3 font-medium">Kod</th>
                        <th className="px-3 py-3 font-medium">Wymiar</th>
                        <th className="px-3 py-3 text-right font-medium">
                          Sesje
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Śr. surowa
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Śr. ważona
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Śr. itemów
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Śr. ważona itemów
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Kompletność
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {group.aggregates.map((aggregate) => (
                        <tr
                          key={`${aggregate.questionnaireVersionId}:${aggregate.dimensionId}`}
                          className="border-t"
                        >
                          <td className="px-3 py-3 font-mono text-xs">
                            {aggregate.dimensionCode}
                          </td>

                          <td className="px-3 py-3 font-medium">
                            {aggregate.dimensionName}
                          </td>

                          <td className="px-3 py-3 text-right">
                            {aggregate.sessionsCount}
                          </td>

                          <td className="px-3 py-3 text-right">
                            {formatNumber(aggregate.averageRawScore)}
                          </td>

                          <td className="px-3 py-3 text-right">
                            {formatNumber(aggregate.averageWeightedScore)}
                          </td>

                          <td className="px-3 py-3 text-right">
                            {formatNumber(aggregate.averageMeanScore)}
                          </td>

                          <td className="px-3 py-3 text-right">
                            {formatNumber(aggregate.averageWeightedMeanScore)}
                          </td>

                          <td className="px-3 py-3 text-right">
                            {formatPercent(aggregate.averageCompleteness)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

<section className="rounded-2xl border bg-card p-5">
  <div>
    <h2 className="text-xl font-semibold">Macierz wyników respondentów</h2>
    <p className="mt-1 text-sm text-muted-foreground">
      Wyniki wymiarów dla poszczególnych respondentów. Wartości w komórkach
      pokazują średnią ważoną itemów dla danego wymiaru.
    </p>
  </div>

  {respondentMatrixGroups.length === 0 ? (
    <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
      Brak danych do macierzy respondentów. Upewnij się, że sesje są ukończone i
      przeliczone.
    </div>
  ) : (
    <div className="mt-5 space-y-6">
      {respondentMatrixGroups.map((group) => (
        <div
          key={group.questionnaireVersionId}
          className="rounded-2xl border bg-muted/20 p-4"
        >
          <div>
            <h3 className="text-lg font-semibold">
              {group.questionnaireName}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {group.questionnaireVersionName}
            </p>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border bg-background">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/50 px-3 py-3 font-medium">
                    Respondent
                  </th>
                  <th className="px-3 py-3 font-medium">Status</th>

                  {group.dimensions.map((dimension) => (
                    <th
                      key={dimension.dimensionId}
                      className="px-3 py-3 text-right font-medium"
                      title={dimension.dimensionName}
                    >
                      {dimension.dimensionCode}
                    </th>
                  ))}

                  <th className="px-3 py-3 text-right font-medium">
                    Kompletność
                  </th>
                </tr>
              </thead>

              <tbody>
                {group.respondents.map((respondent) => (
                  <tr
                    key={`${group.questionnaireVersionId}:${respondent.sessionId}`}
                    className="border-t"
                  >
                    <td className="sticky left-0 z-10 bg-background px-3 py-3">
                      <div className="font-medium">
                        {respondent.respondentName}
                      </div>

                      {respondent.respondentEmail ? (
                        <div className="text-xs text-muted-foreground">
                          {respondent.respondentEmail}
                        </div>
                      ) : respondent.respondentExternalCode ? (
                        <div className="text-xs text-muted-foreground">
                          {respondent.respondentExternalCode}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-3 py-3">
                      {sessionStatusLabel(respondent.sessionStatus)}
                    </td>

                    {group.dimensions.map((dimension) => {
                      const score = respondent.scoreByDimensionId.get(
                        dimension.dimensionId,
                      );

                      return (
                        <td
                          key={dimension.dimensionId}
                          className="px-3 py-3 text-right"
                          title={dimension.dimensionName}
                        >
                          {score
                            ? formatNumber(score.weightedMeanScore)
                            : "—"}
                        </td>
                      );
                    })}

                    <td className="px-3 py-3 text-right">
                      {formatPercent(respondent.averageCompleteness)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            {group.dimensions.map((dimension) => (
              <div key={dimension.dimensionId}>
                <span className="font-mono">{dimension.dimensionCode}</span>
                {" — "}
                {dimension.dimensionName}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )}
</section>

      <section className="rounded-2xl border bg-card p-5">
        <div>
          <h2 className="text-xl font-semibold">
            Rozkłady odpowiedzi bez scoringu
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Odpowiedzi typu single choice / multiple choice bez przypisanego
            score są zliczane jako dane kategoryczne. Dla pytań wielokrotnego
            wyboru udział oznacza udział w zaznaczeniach, a nie odsetek
            respondentów.
          </p>
        </div>

        {data.categoricalAggregates.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            Brak itemów kategorycznych bez scoringu albo brak odpowiedzi dla
            takich itemów.
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            {categoricalGroups.map((group) => {
              const itemsByPage = Object.entries(
                groupBy(
                  group.items,
                  (item) => item.pageTitle ?? "Bez strony",
                ),
              );

              return (
                <div
                  key={group.questionnaireVersionId}
                  className="rounded-2xl border bg-muted/20 p-4"
                >
                  <div>
                    <h3 className="text-lg font-semibold">
                      {group.questionnaireName}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {group.questionnaireVersionName}
                    </p>
                  </div>

                  <div className="mt-5 space-y-5">
                    {itemsByPage.map(([pageTitle, pageItems]) => (
                      <div key={pageTitle} className="space-y-4">
                        <h4 className="text-sm font-semibold uppercase text-muted-foreground">
                          {pageTitle}
                        </h4>

                        {pageItems.map((item) => (
                          <div
                            key={item.itemId}
                            className="rounded-xl border bg-background p-4"
                          >
                            <div>
                              <h5 className="font-semibold">{item.itemText}</h5>

                              <div className="mt-1 flex flex-wrap gap-2 font-mono text-xs text-muted-foreground">
                                <span>{item.itemCode}</span>
                                <span>·</span>
                                <span>{item.itemType}</span>
                                <span>·</span>
                                <span>
                                  odpowiedzi: {item.totalAnswersCount}
                                </span>
                              </div>
                            </div>

                            {item.options.length === 0 ? (
                              <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                                Brak odpowiedzi.
                              </div>
                            ) : (
                              <div className="mt-4 overflow-x-auto rounded-lg border">
                                <table className="w-full min-w-[620px] border-collapse text-sm">
                                  <thead className="bg-muted/50 text-left">
                                    <tr>
                                      <th className="px-3 py-3 font-medium">
                                        Odpowiedź
                                      </th>
                                      <th className="px-3 py-3 text-right font-medium">
                                        Liczba
                                      </th>
                                      <th className="px-3 py-3 text-right font-medium">
                                        Udział
                                      </th>
                                    </tr>
                                  </thead>

                                  <tbody>
                                    {item.options.map((option) => (
                                      <tr
                                        key={option.value}
                                        className="border-t"
                                      >
                                        <td className="px-3 py-3">
                                          {option.label}
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                          {option.count}
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                          {formatPercent(option.percentage)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}