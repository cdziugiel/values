// features/report-builder/components/report-condition-help-dialog.tsx
"use client";

import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

export function ReportConditionHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <HelpCircle size={16} />
          Pomoc: warunki raportu
        </Button>
      </DialogTrigger>

      <DialogContent className="h-[90vh] w-[96vw] max-w-none overflow-hidden p-4 sm:!max-w-[800px] lg:!max-w-[1000px] xl:!max-w-[1200px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Jak korzystać z warunków w kreatorze raportu</DialogTitle>
          <DialogDescription>
            Warunki decydują, czy dana strona, sekcja albo blok raportu ma się
            pojawić na podstawie wyników respondenta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          <section className="space-y-2">
            <h3 className="text-base font-semibold">1. Warunek dla wyniku wymiaru</h3>

            <p className="text-muted-foreground">
              Ten typ warunku sprawdza wynik konkretnego wymiaru w konkretnej
              kategorii, na przykład wynik wymiaru <strong>TRADITION</strong> w
              kategorii <strong>vMEME</strong>.
            </p>

            <CodeBlock>
{`{
  "type": "score",
  "category": "vMEME",
  "code": "TRADITION",
  "metric": "weightedMeanScore",
  "operator": "gte",
  "value": 1.5
}`}
            </CodeBlock>

            <p className="text-muted-foreground">
              Znaczenie: pokaż element, jeśli ważona średnia dla wymiaru
              TRADITION jest większa lub równa 1.5.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">2. Dostępne metryki wyniku</h3>

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Metryka</th>
                    <th className="px-3 py-2 text-left font-medium">Znaczenie</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">
                      weightedMeanScore
                    </td>
                    <td className="px-3 py-2">
                      Średnia ważona. Domyślna i najczęściej zalecana.
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">meanScore</td>
                    <td className="px-3 py-2">
                      Zwykła średnia z odpowiedzi przypisanych do wymiaru.
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">
                      normalizedScore
                    </td>
                    <td className="px-3 py-2">
                      Wynik znormalizowany, jeśli zostanie później dodany do
                      mechanizmu scoringu.
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">rawScore</td>
                    <td className="px-3 py-2">
                      Surowa suma punktów dla wymiaru.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">3. Dostępne operatory</h3>

            <div className="overflow-hidden rounded-lg border">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Operator</th>
                    <th className="px-3 py-2 text-left font-medium">Znaczenie</th>
                    <th className="px-3 py-2 text-left font-medium">Przykład</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">exists</td>
                    <td className="px-3 py-2">Wynik istnieje.</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {"{ \"operator\": \"exists\" }"}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">not_exists</td>
                    <td className="px-3 py-2">Wynik nie istnieje.</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {"{ \"operator\": \"not_exists\" }"}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">eq</td>
                    <td className="px-3 py-2">Równe wartości.</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {"{ \"operator\": \"eq\", \"value\": 2 }"}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">neq</td>
                    <td className="px-3 py-2">Różne wartości.</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {"{ \"operator\": \"neq\", \"value\": 0 }"}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">gt</td>
                    <td className="px-3 py-2">Większe niż.</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {"{ \"operator\": \"gt\", \"value\": 1 }"}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">gte</td>
                    <td className="px-3 py-2">Większe lub równe.</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {"{ \"operator\": \"gte\", \"value\": 1.5 }"}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">lt</td>
                    <td className="px-3 py-2">Mniejsze niż.</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {"{ \"operator\": \"lt\", \"value\": 0 }"}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">lte</td>
                    <td className="px-3 py-2">Mniejsze lub równe.</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {"{ \"operator\": \"lte\", \"value\": -1 }"}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">between</td>
                    <td className="px-3 py-2">W zakresie od min do max.</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {"{ \"operator\": \"between\", \"min\": -1, \"max\": 1 }"}
                    </td>
                  </tr>
                  <tr className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">in</td>
                    <td className="px-3 py-2">Jedna z podanych wartości.</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {"{ \"operator\": \"in\", \"values\": [1, 2, 3] }"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">
              4. Warunek przecięcia wymiarów
            </h3>

            <p className="text-muted-foreground">
              Ten typ warunku pozwala sprawdzić wynik jednego wymiaru tylko w
              odpowiedziach, które należą także do innego wymiaru. To jest ważne,
              gdy chcesz np. pokazać wynik <strong>TRADITION</strong> tylko dla
              obszaru <strong>NEEDS</strong>.
            </p>

            <CodeBlock>
{`{
  "type": "intersection_score",
  "filterCategory": "AREA",
  "filterCode": "NEEDS",
  "targetCategory": "vMEME",
  "targetCode": "TRADITION",
  "metric": "weightedMeanScore",
  "operator": "gte",
  "value": 1.5
}`}
            </CodeBlock>

            <p className="text-muted-foreground">
              Znaczenie: pokaż element, jeśli wynik TRADITION liczony tylko dla
              itemów z obszaru NEEDS jest większy lub równy 1.5.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">5. Warunek AND</h3>

            <p className="text-muted-foreground">
              AND oznacza, że wszystkie warunki muszą być spełnione.
            </p>

            <CodeBlock>
{`{
  "type": "and",
  "conditions": [
    {
      "type": "score",
      "category": "vMEME",
      "code": "TRADITION",
      "metric": "weightedMeanScore",
      "operator": "gte",
      "value": 1.5
    },
    {
      "type": "score",
      "category": "AREA",
      "code": "NEEDS",
      "metric": "weightedMeanScore",
      "operator": "gte",
      "value": 1
    }
  ]
}`}
            </CodeBlock>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">6. Warunek OR</h3>

            <p className="text-muted-foreground">
              OR oznacza, że wystarczy spełnienie przynajmniej jednego warunku.
            </p>

            <CodeBlock>
{`{
  "type": "or",
  "conditions": [
    {
      "type": "score",
      "category": "vMEME",
      "code": "TRADITION",
      "operator": "gte",
      "value": 2
    },
    {
      "type": "score",
      "category": "vMEME",
      "code": "NORMS",
      "operator": "gte",
      "value": 2
    }
  ]
}`}
            </CodeBlock>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">7. Warunek NOT</h3>

            <p className="text-muted-foreground">
              NOT odwraca wynik warunku. Przydaje się, gdy chcesz pokazać blok
              tylko wtedy, gdy dany wynik nie przekracza progu.
            </p>

            <CodeBlock>
{`{
  "type": "not",
  "condition": {
    "type": "score",
    "category": "vMEME",
    "code": "EXPANSION",
    "operator": "gte",
    "value": 2
  }
}`}
            </CodeBlock>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">
              8. Wywoływanie danych w HTML raportu
            </h3>

            <p className="text-muted-foreground">
              W treści HTML możesz korzystać z prostych interpolacji.
            </p>

            <CodeBlock>
{`<div class="report-page-content">
  <h1>{{ project.name }}</h1>

  <p>
    Wynik TRADITION:
    {{ scores.vMEME.TRADITION.weightedMeanScore }}
  </p>

  <p>
    Wynik NEEDS:
    {{ scores.AREA.NEEDS.weightedMeanScore }}
  </p>
</div>`}
            </CodeBlock>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">
              9. Wywoływanie danych w JS raportu
            </h3>

            <p className="text-muted-foreground">
              W kodzie JS strony raportu masz dostęp do obiektu{" "}
              <span className="font-mono">window.__REPORT__</span>.
            </p>

            <CodeBlock>
{`const report = window.__REPORT__;

const tradition = report.scores.vMEME.TRADITION?.weightedMeanScore;
const needs = report.scores.AREA.NEEDS?.weightedMeanScore;

console.log({ tradition, needs });`}
            </CodeBlock>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">
              10. Wywoływanie przecięcia w JS
            </h3>

            <CodeBlock>
{`const report = window.__REPORT__;

const traditionForNeeds =
  report.crossScores
    .vMEME
    .TRADITION
    .by
    .AREA
    .NEEDS;

console.log({
  mean: traditionForNeeds.meanScore,
  weightedMean: traditionForNeeds.weightedMeanScore,
  answered: traditionForNeeds.answeredItemsCount,
  total: traditionForNeeds.itemsCount
});`}
            </CodeBlock>
          </section>

          <section className="space-y-2">
            <h3 className="text-base font-semibold">
              11. Predefiniowane komponenty aplikacji
            </h3>

            <p className="text-muted-foreground">
              Docelowo komponenty aplikacji mogą być podpinane przez sloty. W
              HTML raportu umieszczasz placeholder, a renderer lub warstwa
              preview podmienia go na komponent.
            </p>

            <CodeBlock>
{`<div
  data-report-component="vmeme-radar-chart"
  data-source-category="vMEME"
></div>`}
            </CodeBlock>

            <p className="text-muted-foreground">
              Przykładowo taki slot może później wyrenderować wykres vMEME,
              tabelę wyników, radar, wykres słupkowy albo blok interpretacyjny.
            </p>
          </section>

          <section className="rounded-xl border bg-amber-50 p-4 text-amber-900">
            <h3 className="font-semibold">Ważna zasada projektowa</h3>
            <p className="mt-1 text-sm">
              Warunki widoczności powinny sterować tym, czy blok lub strona
              raportu ma się pojawić. Nie powinny zmieniać samych wyników.
              Wyniki pochodzą ze snapshotu i powinny pozostać zamrożone dla
              danej zakończonej sesji.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}