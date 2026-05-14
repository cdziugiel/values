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

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            HUMANET VALUES · Wyniki projektu
          </div>

          <h1 className="mt-2 text-3xl font-semibold">{data.project.name}</h1>

          {data.project.description ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {data.project.description}
            </p>
          ) : null}
        </div>

        <Link
          href={`/t/${tenantSlug}/assessment-projects`}
          className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
        >
          Wróć do projektów
        </Link>
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
            Średnie wyniki z ukończonych sesji, na podstawie zapisanych wyników
            wymiarów respondentów.
          </p>
        </div>

        {data.dimensionAggregates.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            Brak wyników wymiarów do agregacji. Upewnij się, że sesje są
            zakończone i przeliczone.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[1100px] border-collapse text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-3 font-medium">Kwestionariusz</th>
                  <th className="px-3 py-3 font-medium">Kod</th>
                  <th className="px-3 py-3 font-medium">Wymiar</th>
                  <th className="px-3 py-3 text-right font-medium">Sesje</th>
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
                {data.dimensionAggregates.map((aggregate) => (
                  <tr
                    key={`${aggregate.questionnaireVersionId}:${aggregate.dimensionId}`}
                    className="border-t"
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium">
                        {aggregate.questionnaireName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {aggregate.questionnaireVersionName}
                      </div>
                    </td>

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
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div>
          <h2 className="text-xl font-semibold">
            Rozkłady odpowiedzi bez scoringu
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Odpowiedzi typu select / multiple choice bez przypisanego score są
            zliczane jako dane kategoryczne.
          </p>
        </div>

        {data.categoricalAggregates.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            Brak itemów kategorycznych bez scoringu albo brak odpowiedzi dla
            takich itemów.
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            {data.categoricalAggregates.map((item) => (
              <div
                key={item.itemId}
                className="rounded-xl border bg-muted/20 p-4"
              >
                <div>
                  <div className="text-xs text-muted-foreground">
                    {item.questionnaireName} · {item.pageTitle ?? "Bez strony"}
                  </div>

                  <h3 className="mt-1 font-semibold">{item.itemText}</h3>

                  <div className="mt-1 font-mono text-xs text-muted-foreground">
                    {item.itemCode} · {item.itemType}
                  </div>
                </div>

                {item.options.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    Brak odpowiedzi.
                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-lg border bg-background">
                    <table className="w-full min-w-[620px] border-collapse text-sm">
                      <thead className="bg-muted/50 text-left">
                        <tr>
                          <th className="px-3 py-3 font-medium">Odpowiedź</th>
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
                          <tr key={option.value} className="border-t">
                            <td className="px-3 py-3">{option.label}</td>
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
        )}
      </section>
    </main>
  );
}