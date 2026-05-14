import Link from "next/link";

import { getAssessmentSessionResults } from "../api/assessment-session-results.queries";
import { RecalculateAssessmentSessionScoresForm } from "./recalculate-assessment-session-scores-form";

type AssessmentSessionResultsPageProps = {
  tenantSlug: string;
  sessionId: string;
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

function formatDateTime(value: Date | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function statusLabel(status: string) {
  if (status === "completed") return "Zakończona";
  if (status === "in_progress") return "W trakcie";
  if (status === "not_started") return "Nierozpoczęta";

  return status;
}

export async function AssessmentSessionResultsPage({
  tenantSlug,
  sessionId,
}: AssessmentSessionResultsPageProps) {
  const data = await getAssessmentSessionResults({
    tenantSlug,
    sessionId,
  });

  if (!data) {
    return (
      <main className="space-y-6">
        <section className="rounded-2xl border bg-card p-6">
          <h1 className="text-2xl font-semibold">Nie znaleziono wyników</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Nie znaleziono sesji badania dla wskazanego tenanta albo sesja
            została usunięta.
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
            HUMANET VALUES · Wyniki sesji
          </div>

          <h1 className="mt-2 text-3xl font-semibold">
            {data.respondent.displayName}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Projekt: {data.project.name}
          </p>
        </div>

        <Link
          href={`/t/${tenantSlug}/assessment-projects/${data.project.id}/respondents`}
          className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
        >
          Wróć do respondentów
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Status sesji
          </div>
          <div className="mt-1 font-medium">
            {statusLabel(data.session.status)}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Respondent
          </div>
          <div className="mt-1 font-medium">{data.respondent.displayName}</div>
          {data.respondent.email ? (
            <div className="mt-1 text-xs text-muted-foreground">
              {data.respondent.email}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Zakończono
          </div>
          <div className="mt-1 font-medium">
            {formatDateTime(data.session.completedAt)}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs uppercase text-muted-foreground">
            Liczba wyników
          </div>
          <div className="mt-1 font-medium">{data.scores.length}</div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
<div>
  <h2 className="text-xl font-semibold">Wyniki wymiarów</h2>
  <p className="mt-1 text-sm text-muted-foreground">
    Wyniki przeliczone na podstawie odpowiedzi respondenta i
    przypisań scoringowych itemów.
  </p>
</div>

<RecalculateAssessmentSessionScoresForm
  tenantSlug={tenantSlug}
  sessionId={sessionId}
/>
        </div>

        {data.scores.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
            Brak zapisanych wyników wymiarów. Jeżeli sesja została zakończona
            przed dodaniem scoringu, uruchom ponowne przeliczenie wyników albo
            zakończ nową sesję testową.
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-3 font-medium">Kod</th>
                  <th className="px-3 py-3 font-medium">Wymiar</th>
                  <th className="px-3 py-3 text-right font-medium">
                    Wynik surowy
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    Wynik ważony
                  </th>
                  <th className="px-3 py-3 text-right font-medium">Średnia</th>
                  <th className="px-3 py-3 text-right font-medium">
                    Średnia ważona
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    Odpowiedzi
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    Oczekiwane
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    Kompletność
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.scores.map((score) => (
                  <tr key={score.id} className="border-t">
                    <td className="px-3 py-3 font-mono text-xs">
                      {score.dimensionCode}
                    </td>
                    <td className="px-3 py-3 font-medium">
                      {score.dimensionName}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatNumber(score.rawScore)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatNumber(score.weightedScore)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatNumber(score.meanScore)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatNumber(score.weightedMeanScore)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatNumber(score.answeredItemsCount)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatNumber(score.expectedItemsCount)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatPercent(score.completeness)}
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
    <h2 className="text-xl font-semibold">Odpowiedzi i scoring itemów</h2>
    <p className="mt-1 text-sm text-muted-foreground">
      Widok techniczny pokazujący, jak odpowiedzi respondenta zostały
      przeliczone na wartości scoringowe.
    </p>
  </div>

  {data.responseDiagnostics.length === 0 ? (
    <div className="mt-5 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
      Brak itemów diagnostycznych dla tej sesji.
    </div>
  ) : (
    <div className="mt-5 overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[1400px] border-collapse text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-3 font-medium">Kwestionariusz</th>
            <th className="px-3 py-3 font-medium">Strona</th>
            <th className="px-3 py-3 font-medium">Item</th>
            <th className="px-3 py-3 font-medium">Typ</th>
            <th className="px-3 py-3 font-medium">Odpowiedź</th>
            <th className="px-3 py-3 text-right font-medium">
              Wynik bazowy
            </th>
            <th className="px-3 py-3 font-medium">Wymiary</th>
            <th className="px-3 py-3 font-medium">Reverse</th>
            <th className="px-3 py-3 font-medium">Waga</th>
            <th className="px-3 py-3 text-right font-medium">
              Wynik po reverse
            </th>
            <th className="px-3 py-3 text-right font-medium">
              Wynik ważony
            </th>
            <th className="px-3 py-3 font-medium">Status</th>
          </tr>
        </thead>

        <tbody>
          {data.responseDiagnostics.map((item) => {
            if (item.dimensions.length === 0) {
              return (
                <tr key={item.itemId} className="border-t">
                  <td className="px-3 py-3">
                    <div className="font-medium">{item.questionnaireName}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.questionnaireVersionName}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    {item.pageTitle ?? "—"}
                  </td>

                  <td className="px-3 py-3">
                    <div className="font-medium">{item.itemText}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {item.itemCode}
                    </div>
                  </td>

                  <td className="px-3 py-3">{item.itemType}</td>

                  <td className="px-3 py-3">
                    {item.responseDisplayValue}
                  </td>

                  <td className="px-3 py-3 text-right">
                    {formatNumber(item.numericScore)}
                  </td>

                  <td className="px-3 py-3">—</td>
                  <td className="px-3 py-3">—</td>
                  <td className="px-3 py-3">—</td>
                  <td className="px-3 py-3 text-right">—</td>
                  <td className="px-3 py-3 text-right">—</td>

                  <td className="px-3 py-3">
                    <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                      Brak wymiaru
                    </span>
                  </td>
                </tr>
              );
            }

            return item.dimensions.map((dimension, dimensionIndex) => (
              <tr
                key={`${item.itemId}:${dimension.scoreConfigId}`}
                className="border-t"
              >
                {dimensionIndex === 0 ? (
                  <>
                    <td
                      rowSpan={item.dimensions.length}
                      className="px-3 py-3 align-top"
                    >
                      <div className="font-medium">
                        {item.questionnaireName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.questionnaireVersionName}
                      </div>
                    </td>

                    <td
                      rowSpan={item.dimensions.length}
                      className="px-3 py-3 align-top"
                    >
                      {item.pageTitle ?? "—"}
                    </td>

                    <td
                      rowSpan={item.dimensions.length}
                      className="px-3 py-3 align-top"
                    >
                      <div className="font-medium">{item.itemText}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {item.itemCode}
                      </div>
                    </td>

                    <td
                      rowSpan={item.dimensions.length}
                      className="px-3 py-3 align-top"
                    >
                      {item.itemType}
                    </td>

                    <td
                      rowSpan={item.dimensions.length}
                      className="px-3 py-3 align-top"
                    >
                      {item.responseDisplayValue}
                    </td>

                    <td
                      rowSpan={item.dimensions.length}
                      className="px-3 py-3 text-right align-top"
                    >
                      {formatNumber(item.numericScore)}
                    </td>
                  </>
                ) : null}

                <td className="px-3 py-3">
                  <div className="font-medium">{dimension.dimensionName}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {dimension.dimensionCode}
                  </div>
                </td>

                <td className="px-3 py-3">
                  {dimension.reverseScored ? "tak" : "nie"}
                </td>

                <td className="px-3 py-3">
                  {dimension.weight ?? "—"}
                </td>

                <td className="px-3 py-3 text-right">
                  {formatNumber(dimension.numericScoreAfterReverse)}
                </td>

                <td className="px-3 py-3 text-right">
                  {formatNumber(dimension.weightedScore)}
                </td>

                <td className="px-3 py-3">
                  {!item.responseExists ? (
                    <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                      Brak odpowiedzi
                    </span>
                  ) : item.numericScore === null ? (
                    <span className="rounded-full border px-2 py-1 text-xs text-muted-foreground">
                      Bez wyniku liczbowego
                    </span>
                  ) : (
                    <span className="rounded-full border px-2 py-1 text-xs">
                      Liczony
                    </span>
                  )}
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  )}
</section>
      <section className="rounded-2xl border bg-muted/30 p-5">
        <h2 className="text-lg font-semibold">Uwagi diagnostyczne</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ten widok jest techniczno-diagnostyczny. Służy do sprawdzenia, czy
          scoring działa poprawnie. Nie jest jeszcze finalnym raportem
          psychologicznym ani raportem dla respondenta.
        </p>
      </section>
    </main>
  );
}