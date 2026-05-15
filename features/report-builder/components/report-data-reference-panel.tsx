// features/report-builder/components/report-data-reference-panel.tsx
"use client";

import { useState } from "react";
import { Database, ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

export function ReportDataReferencePanel() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left hover:bg-muted/40"
      >
        <div className="flex gap-3">
          <Database className="mt-0.5 h-5 w-5 text-muted-foreground" />

          <div>
            <h2 className="text-lg font-semibold">Dostępne dane raportu</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ścieżki i przykłady danych, których możesz używać w HTML, JS,
              warunkach widoczności i komponentach raportu.
            </p>
          </div>
        </div>

        <div className="shrink-0 text-muted-foreground">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </button>

      {open ? (
        <div className="space-y-6 border-t px-5 py-5 text-sm">
          <section className="space-y-2">
            <h3 className="font-semibold">1. Dane projektu i sesji</h3>

            <CodeBlock>
{`{{ project.name }}
{{ project.description }}
{{ session.id }}
{{ session.completedAt }}
{{ frozenAt }}`}
            </CodeBlock>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">2. Wyniki wymiarów</h3>

            <p className="text-muted-foreground">
              Wyniki są grupowane po kategorii wymiaru i kodzie wymiaru.
            </p>

            <CodeBlock>
{`{{ scores.vMEME.TRADITION.meanScore }}
{{ scores.vMEME.TRADITION.weightedMeanScore }}
{{ scores.vMEME.TRADITION.rawScore }}
{{ scores.vMEME.TRADITION.completeness }}

{{ scores.AREA.NEEDS.weightedMeanScore }}`}
            </CodeBlock>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">3. Przecięcia wymiarów</h3>

            <p className="text-muted-foreground">
              Przecięcia pozwalają sprawdzić np. wynik vMEME tylko dla itemów
              należących do konkretnego obszaru AREA.
            </p>

            <CodeBlock>
{`{{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.meanScore }}
{{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.weightedMeanScore }}
{{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.answeredItemsCount }}
{{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.itemsCount }}`}
            </CodeBlock>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">4. Odpowiedzi respondenta</h3>

            <CodeBlock>
{`responses[]:
{
  itemId,
  itemCode,
  itemText,
  pageTitle,
  responseExists,
  responseRawValue,
  responseNumericValue,
  responseDisplayValue,
  dimensions[]
}`}
            </CodeBlock>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">5. Przykład użycia w HTML</h3>

            <CodeBlock>
{`<div class="report-page-content">
  <h1>{{ project.name }}</h1>

  <p>
    Twój wynik w obszarze TRADITION:
    {{ scores.vMEME.TRADITION.weightedMeanScore }}
  </p>

  <p>
    TRADITION tylko dla NEEDS:
    {{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.weightedMeanScore }}
  </p>
</div>`}
            </CodeBlock>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold">6. Przykład użycia w JS</h3>

            <CodeBlock>
{`const report = window.__REPORT__;

const tradition = report.scores.vMEME.TRADITION;
const needsTradition =
  report.crossScores.vMEME.TRADITION.by.AREA.NEEDS;

console.log({
  tradition: tradition.weightedMeanScore,
  needsTradition: needsTradition.weightedMeanScore,
});`}
            </CodeBlock>
          </section>

          <section className="rounded-xl border bg-amber-50 p-4 text-amber-900">
            <h3 className="font-semibold">Uwaga</h3>
            <p className="mt-1 text-sm">
              To jest referencja struktury danych. W kolejnym kroku warto dodać
              wybór przykładowej zakończonej sesji i pokazać tu realny JSON
              snapshotu używany w podglądzie raportu.
            </p>
          </section>
        </div>
      ) : null}
    </section>
  );
}