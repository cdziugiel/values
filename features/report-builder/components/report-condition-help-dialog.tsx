// features/report-builder/components/report-condition-help-dialog.tsx
"use client";

import { HelpCircle, ShieldCheck } from "lucide-react";

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
    <pre className="overflow-x-auto rounded-[1.25rem] border border-black/10 bg-[#0f172a] p-4 text-xs leading-relaxed text-slate-100 shadow-inner">
      <code>{children}</code>
    </pre>
  );
}

function HelpSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white/75 p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#171717] text-xs font-semibold text-white">
          {number}
        </span>

        <h3 className="text-base font-semibold tracking-[-0.02em] text-[#171717]">
          {title}
        </h3>
      </div>

      <div className="space-y-3 text-sm leading-6 text-[#6b7280]">
        {children}
      </div>
    </section>
  );
}

export function ReportConditionHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <HelpCircle size={16} />
          Warunki
        </Button>
      </DialogTrigger>

      <DialogContent className="h-[90vh] w-[96vw] max-w-none overflow-hidden rounded-[2rem] border-black/10 bg-white/95 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur sm:!max-w-[900px] lg:!max-w-[1080px]">
        <DialogHeader className="border-b border-black/10 p-6 text-left">
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
            <HelpCircle size={13} />
            Builder raportu
          </div>

          <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
            Jak korzystać z warunków widoczności
          </DialogTitle>

          <DialogDescription className="max-w-3xl text-sm leading-6 text-[#6b7280]">
            Warunki decydują, czy dana strona, sekcja albo blok raportu pojawi
            się na podstawie wyników respondenta zapisanych w snapshotcie.
          </DialogDescription>
        </DialogHeader>

        <div className="h-full overflow-y-auto bg-[#f7f7f8] p-5 md:p-6">
          <div className="space-y-5">
            <HelpSection number="1" title="Warunek dla wyniku wymiaru">
              <p>
                Ten typ warunku sprawdza wynik konkretnego wymiaru w konkretnej
                kategorii, np. wynik wymiaru <strong>TRADITION</strong> w kategorii
                <strong> vMEME</strong>.
              </p>

              <CodeBlock>{`{
  "type": "score",
  "category": "vMEME",
  "code": "TRADITION",
  "metric": "weightedMeanScore",
  "operator": "gte",
  "value": 1.5
}`}</CodeBlock>

              <p>
                Znaczenie: pokaż element, jeśli ważona średnia dla wymiaru
                TRADITION jest większa lub równa 1.5.
              </p>
            </HelpSection>

            <HelpSection number="2" title="Dostępne metryki wyniku">
              <div className="overflow-hidden rounded-[1.25rem] border border-black/10 bg-white">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[#f3f4f6] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold">Metryka</th>
                      <th className="px-3 py-3 text-left font-semibold">Znaczenie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/10">
                    <tr>
                      <td className="px-3 py-3 font-mono text-xs text-[#171717]">weightedMeanScore</td>
                      <td className="px-3 py-3">Średnia ważona. Domyślna i zwykle zalecana.</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-3 font-mono text-xs text-[#171717]">meanScore</td>
                      <td className="px-3 py-3">Zwykła średnia z odpowiedzi przypisanych do wymiaru.</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-3 font-mono text-xs text-[#171717]">rawScore</td>
                      <td className="px-3 py-3">Surowa suma punktów dla wymiaru.</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-3 font-mono text-xs text-[#171717]">completeness</td>
                      <td className="px-3 py-3">Kompletność danych dla wymiaru.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </HelpSection>

            <HelpSection number="3" title="Operatory porównania">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["gte", "większe lub równe"],
                  ["gt", "większe niż"],
                  ["lte", "mniejsze lub równe"],
                  ["lt", "mniejsze niż"],
                  ["eq", "równe"],
                  ["neq", "różne od"],
                ].map(([operator, label]) => (
                  <div key={operator} className="rounded-[1rem] border border-black/10 bg-white/70 px-3 py-2">
                    <span className="font-mono text-xs font-semibold text-[#171717]">{operator}</span>
                    <span className="ml-2 text-xs text-[#6b7280]">{label}</span>
                  </div>
                ))}
              </div>
            </HelpSection>

            <HelpSection number="4" title="Warunek przecięcia wymiarów">
              <p>
                Ten typ warunku sprawdza wynik jednego wymiaru tylko w odpowiedziach,
                które należą także do innego wymiaru.
              </p>

              <CodeBlock>{`{
  "type": "intersection_score",
  "filterCategory": "AREA",
  "filterCode": "NEEDS",
  "targetCategory": "vMEME",
  "targetCode": "TRADITION",
  "metric": "weightedMeanScore",
  "operator": "gte",
  "value": 1.5
}`}</CodeBlock>
            </HelpSection>

            <HelpSection number="5" title="Warunki złożone: AND, OR, NOT">
              <p>
                AND wymaga spełnienia wszystkich warunków, OR przynajmniej jednego,
                a NOT odwraca wynik pojedynczego warunku.
              </p>

              <CodeBlock>{`{
  "type": "and",
  "conditions": [
    {
      "type": "score",
      "category": "vMEME",
      "code": "TRADITION",
      "operator": "gte",
      "value": 1.5
    },
    {
      "type": "score",
      "category": "AREA",
      "code": "NEEDS",
      "operator": "gte",
      "value": 1
    }
  ]
}`}</CodeBlock>
            </HelpSection>

            <HelpSection number="6" title="Użycie danych w HTML i JS">
              <CodeBlock>{`<div class="report-page-content">
  <h1>{{ project.name }}</h1>
  <p>{{ scores.vMEME.TRADITION.weightedMeanScore }}</p>
</div>`}</CodeBlock>

              <CodeBlock>{`const report = window.__REPORT__;
const tradition = report.scores.vMEME.TRADITION?.weightedMeanScore;
console.log({ tradition });`}</CodeBlock>
            </HelpSection>

            <section className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-amber-900">
              <div className="flex gap-3">
                <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold">Ważna zasada projektowa</h3>
                  <p className="mt-1 text-sm leading-6">
                    Warunki widoczności powinny sterować tym, czy blok lub strona
                    raportu ma się pojawić. Nie powinny zmieniać samych wyników.
                    Wyniki pochodzą ze snapshotu i powinny pozostać zamrożone.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
