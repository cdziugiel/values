// features/report-builder/components/report-data-reference-panel.tsx
"use client";

import { Database, ShieldCheck } from "lucide-react";

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

function ReferenceSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-black/10 bg-white/75 p-5 shadow-sm">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#171717] text-xs font-semibold text-white">
          {number}
        </span>

        <div>
          <h3 className="text-base font-semibold tracking-[-0.02em] text-[#171717]">
            {title}
          </h3>

          {description ? (
            <p className="mt-1 text-sm leading-6 text-[#6b7280]">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function ReportDataReferencePanel() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <Database size={16} />
          Dane
        </Button>
      </DialogTrigger>

      <DialogContent className="h-[90vh] w-[96vw] max-w-none overflow-hidden rounded-[2rem] border-black/10 bg-white/95 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur sm:!max-w-[900px] lg:!max-w-[1080px]">
        <DialogHeader className="border-b border-black/10 p-6 text-left">
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
            <Database size={13} />
            Referencja danych
          </div>

          <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
            Dostępne dane raportu
          </DialogTitle>

          <DialogDescription className="max-w-3xl text-sm leading-6 text-[#6b7280]">
            Ścieżki i przykłady danych, których możesz używać w HTML, JS,
            warunkach widoczności i komponentach raportu.
          </DialogDescription>
        </DialogHeader>

        <div className="h-full overflow-y-auto bg-[#f7f7f8] p-5 md:p-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <ReferenceSection number="1" title="Dane projektu i sesji">
              <CodeBlock>{`{{ project.name }}
{{ project.description }}
{{ session.id }}
{{ session.completedAt }}
{{ frozenAt }}`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection
              number="2"
              title="Wyniki wymiarów"
              description="Wyniki są grupowane po kategorii wymiaru i kodzie wymiaru."
            >
              <CodeBlock>{`{{ scores.vMEME.TRADITION.meanScore }}
{{ scores.vMEME.TRADITION.weightedMeanScore }}
{{ scores.vMEME.TRADITION.rawScore }}
{{ scores.vMEME.TRADITION.completeness }}

{{ scores.AREA.NEEDS.weightedMeanScore }}`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection
              number="3"
              title="Przecięcia wymiarów"
              description="Przecięcia pozwalają sprawdzić wynik jednego wymiaru w kontekście innego obszaru."
            >
              <CodeBlock>{`{{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.meanScore }}
{{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.weightedMeanScore }}
{{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.answeredItemsCount }}
{{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.itemsCount }}`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection number="4" title="Odpowiedzi respondenta">
              <CodeBlock>{`responses[]:
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
}`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection number="5" title="Przykład użycia w HTML">
              <CodeBlock>{`<div class="report-page-content">
  <h1>{{ project.name }}</h1>

  <p>
    Twój wynik w obszarze TRADITION:
    {{ scores.vMEME.TRADITION.weightedMeanScore }}
  </p>

  <p>
    TRADITION tylko dla NEEDS:
    {{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.weightedMeanScore }}
  </p>
</div>`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection number="6" title="Przykład użycia w JS">
              <CodeBlock>{`const report = window.__REPORT__;

const tradition = report.scores.vMEME.TRADITION;
const needsTradition =
  report.crossScores.vMEME.TRADITION.by.AREA.NEEDS;

console.log({
  tradition: tradition.weightedMeanScore,
  needsTradition: needsTradition.weightedMeanScore,
});`}</CodeBlock>
            </ReferenceSection>
          </div>

          <section className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <div className="flex gap-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold">Uwaga</h3>
                <p className="mt-1 text-sm leading-6">
                  To jest referencja struktury danych. Dla realnych wartości
                  użyj podglądu na zakończonej sesji respondenta, ponieważ dane
                  raportu pochodzą ze snapshotu konkretnej sesji.
                </p>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
