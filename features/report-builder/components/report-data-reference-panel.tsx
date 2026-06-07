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
            <ReferenceSection
              number="1"
              title="Dane wspólne"
              description="Te pola są dostępne w większości raportów: personalnych, złożonych i zbiorczych."
            >
              <CodeBlock>{`{{ reportKind }}
{{ tenantSlug }}
{{ frozenAt }}

{{ project.name }}
{{ project.description }}

{{ scope.type }}
{{ scope.label }}`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection
              number="2"
              title="Raport personalny — wyniki wymiarów"
              description="Standardowe wyniki jednej sesji respondenta, grupowane po kategorii wymiaru i kodzie."
            >
              <CodeBlock>{`{{ scores.vMEME.TRADITION.meanScore }}
{{ scores.vMEME.TRADITION.weightedMeanScore }}
{{ scores.vMEME.TRADITION.rawScore }}
{{ scores.vMEME.TRADITION.completeness }}

{{ scores.AREA.NEEDS.weightedMeanScore }}`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection
              number="3"
              title="Raport personalny — przecięcia wymiarów"
              description="Przecięcia jednego wymiaru przez drugi obszar, np. vMEME × AREA."
            >
              <CodeBlock>{`{{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.meanScore }}
{{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.weightedMeanScore }}
{{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.answeredItemsCount }}
{{ crossScores.vMEME.TRADITION.by.AREA.NEEDS.itemsCount }}`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection
              number="4"
              title="Raport personalny — odpowiedzi respondenta"
              description="Lista odpowiedzi jest dostępna głównie w raportach personalnych oraz jako źródło do obliczeń composite."
            >
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

            <ReferenceSection
              number="5"
              title="Raport złożony — dane osoby i źródła"
              description="Raport composite łączy kilka źródeł jednej osoby, np. kwestionariusz indywidualny i współpracy."
            >
              <CodeBlock>{`{{ respondent.displayName }}
{{ respondent.email }}
{{ respondent.externalCode }}

{{ composite.status }}
{{ composite.canRender }}
{{ composite.configuredSourceCount }}
{{ composite.availableSourceCount }}

{{ composite.availableBySlot.humanet_values_ind.questionnaireName }}
{{ composite.availableBySlot.humanet_values_ind.assessmentSessionId }}
{{ composite.availableBySlot.humanet_values_ind.assessmentResultSnapshotId }}`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection
              number="6"
              title="Raport złożony — wyniki połączone"
              description="Wyniki połączone są liczone z itemów ze wszystkich źródeł, nie jako średnia ze średnich."
            >
              <CodeBlock>{`{{ composite.dimensionScores.merged.debug.observationCount }}
{{ composite.dimensionScores.merged.debug.mergedDimensionCount }}

{{ composite.dimensionScores.merged.byCategory.VMEME.TRADITION.weightedMeanScore }}
{{ composite.dimensionScores.merged.byCategory.VMEME.TRADITION.nItems }}
{{ composite.dimensionScores.merged.byCategory.VMEME.TRADITION.nSources }}

{{ composite.dimensionScores.merged.byDimensionKey.VMEME.TRADITION.weightedMeanScore }}`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection
              number="7"
              title="Raport złożony — wyniki osobno per źródło"
              description="Możesz pokazać wynik z konkretnego kwestionariusza źródłowego oraz wynik połączony."
            >
              <CodeBlock>{`{{ composite.dimensionScores.bySource.humanet_values_ind.questionnaireName }}
{{ composite.dimensionScores.bySource.humanet_values_ind.dimensionScores.byCategory.VMEME.TRADITION.weightedMeanScore }}

{{ composite.dimensionScores.bySource.humanet_values_coop.questionnaireName }}
{{ composite.dimensionScores.bySource.humanet_values_coop.dimensionScores.byCategory.VMEME.TRADITION.weightedMeanScore }}`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection
              number="8"
              title="Raport zbiorczy — projekt, organizacja, zespół"
              description="Raporty zbiorcze mają wspólną strukturę aggregate. W raporcie zespołu dostępne są dodatkowo segmenty: liderzy oraz zespół bez liderów."
            >
              <CodeBlock>{`{{ aggregate.status }}
{{ aggregate.canRender }}
{{ aggregate.minimumN }}

{{ aggregate.nRespondents }}
{{ aggregate.nSessions }}
{{ aggregate.nScores }}

{{ project.name }}
{{ organization.name }}
{{ unit.name }}
{{ team.name }}
{{ aggregate.segments }} 
`

              }</CodeBlock>
            </ReferenceSection>

            <ReferenceSection
              number="9"
              title="Raport zbiorczy — agregaty wymiarów"
              description="Wyniki wymiarów są agregowane z assessment_dimension_scores."
            >
              <CodeBlock>{`{{ aggregate.dimensionScores.byDimensionCode.TRADITION.meanWeightedMeanScore }}
{{ aggregate.dimensionScores.byDimensionCode.TRADITION.medianWeightedMeanScore }}
{{ aggregate.dimensionScores.byDimensionCode.TRADITION.stdDevWeightedMeanScore }}
{{ aggregate.dimensionScores.byDimensionCode.TRADITION.minWeightedMeanScore }}
{{ aggregate.dimensionScores.byDimensionCode.TRADITION.maxWeightedMeanScore }}
{{ aggregate.dimensionScores.byDimensionCode.TRADITION.n }}

{{ aggregate.dimensionScores.rows }}`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection
              number="10"
              title="Raport zbiorczy — przecięcia wymiarów"
              description="Przecięcia są dostępne w obu kierunkach, np. vMEME × AREA oraz AREA × vMEME."
            >
              <CodeBlock>{`{{ aggregate.crossScores.VMEME.TRADITION.by.AREA.DECISIONS.meanWeightedMeanScore }}
{{ aggregate.crossScores.VMEME.TRADITION.by.AREA.DECISIONS.medianWeightedMeanScore }}
{{ aggregate.crossScores.VMEME.TRADITION.by.AREA.DECISIONS.stdDevWeightedMeanScore }}
{{ aggregate.crossScores.VMEME.TRADITION.by.AREA.DECISIONS.nRespondents }}

{{ aggregate.crossScores.AREA.DECISIONS.by.VMEME.TRADITION.meanWeightedMeanScore }}

{{ aggregate.crossScoreRows }}
{{ aggregate.crossScorePairs.VMEME.AREA }}`}</CodeBlock>
            </ReferenceSection>
            <ReferenceSection
              number="11"
              title="Raport zespołu — liderzy i zespół bez liderów"
              description="Dostępne w raportach typu team_aggregate. aggregate oznacza całą jednostkę razem, a aggregate.segments pozwala osobno pokazać liderów oraz zespół bez liderów."
            >
              <CodeBlock>{`// Cała jednostka: liderzy + zespół razem
{{ aggregate.dimensionScores.byDimensionCode.TRADITION.meanWeightedMeanScore }}
{{ aggregate.crossScores.VMEME.TRADITION.by.AREA.DECISIONS.meanWeightedMeanScore }}

// Liderzy jednostki
{{ aggregate.segments.leaders.status }}
{{ aggregate.segments.leaders.canRender }}
{{ aggregate.segments.leaders.nRespondents }}
{{ aggregate.segments.leaders.nSessions }}
{{ aggregate.segments.leaders.nScores }}

{{ aggregate.segments.leaders.dimensionScores.byDimensionCode.TRADITION.meanWeightedMeanScore }}
{{ aggregate.segments.leaders.dimensionScores.byDimensionCode.TRADITION.n }}

{{ aggregate.segments.leaders.crossScores.VMEME.TRADITION.by.AREA.DECISIONS.meanWeightedMeanScore }}
{{ aggregate.segments.leaders.crossScores.VMEME.TRADITION.by.AREA.DECISIONS.nRespondents }}

{{ aggregate.segments.leaders.crossScoreRows }}
{{ aggregate.segments.leaders.crossScorePairs.VMEME.AREA }}

// Zespół bez liderów
{{ aggregate.segments.teamWithoutLeaders.status }}
{{ aggregate.segments.teamWithoutLeaders.canRender }}
{{ aggregate.segments.teamWithoutLeaders.minimumN }}
{{ aggregate.segments.teamWithoutLeaders.nRespondents }}
{{ aggregate.segments.teamWithoutLeaders.nSessions }}
{{ aggregate.segments.teamWithoutLeaders.nScores }}

{{ aggregate.segments.teamWithoutLeaders.dimensionScores.byDimensionCode.TRADITION.meanWeightedMeanScore }}
{{ aggregate.segments.teamWithoutLeaders.dimensionScores.byDimensionCode.TRADITION.n }}

{{ aggregate.segments.teamWithoutLeaders.crossScores.VMEME.TRADITION.by.AREA.DECISIONS.meanWeightedMeanScore }}
{{ aggregate.segments.teamWithoutLeaders.crossScores.VMEME.TRADITION.by.AREA.DECISIONS.nRespondents }}

{{ aggregate.segments.teamWithoutLeaders.crossScoreRows }}
{{ aggregate.segments.teamWithoutLeaders.crossScorePairs.VMEME.AREA }}`}</CodeBlock>
            </ReferenceSection>
            <ReferenceSection
              number="12"
              title="Raport zbiorczy — debug przecięć"
              description="Użyj tego, gdy nie znasz dokładnych kodów osi, np. VMEME/vMEME, AREA, DECISIONS."
            >
              <CodeBlock>{`{{ aggregate.debug.crossScores.snapshotCount }}
{{ aggregate.debug.crossScores.observationCount }}
{{ aggregate.debug.crossScores.aggregatedRowsCount }}

{{ aggregate.debug.crossScores.availableAxes }}
{{ aggregate.debug.crossScores.availablePairs }}
{{ aggregate.debug.crossScores.availableAxisCodes }}
{{ aggregate.debug.crossScores.availableByCodes }}`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection number="13" title="Przykład HTML — raport personalny">
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

            <ReferenceSection number="14" title="Przykład HTML — raport złożony">
              <CodeBlock>{`<div class="report-page-content">
  <h1>Raport złożony</h1>

  <p>Respondent: {{ respondent.displayName }}</p>
  <p>Źródła dostępne: {{ composite.availableSourceCount }}</p>

  <p>
    TRADITION — wynik połączony:
    {{ composite.dimensionScores.merged.byCategory.VMEME.TRADITION.weightedMeanScore }}
  </p>

  <p>
    TRADITION — kwestionariusz indywidualny:
    {{ composite.dimensionScores.bySource.humanet_values_ind.dimensionScores.byCategory.VMEME.TRADITION.weightedMeanScore }}
  </p>
</div>`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection number="15" title="Przykład HTML — raport zbiorczy">
              <CodeBlock>{`<div class="report-page-content">
  <h1>Raport zbiorczy</h1>

  <p>Zakres: {{ scope.label }}</p>
  <p>Respondenci: {{ aggregate.nRespondents }}</p>

  <p>
    TRADITION — średnia grupowa:
    {{ aggregate.dimensionScores.byDimensionCode.TRADITION.meanWeightedMeanScore }}
  </p>

  <p>
    TRADITION / DECISIONS:
    {{ aggregate.crossScores.VMEME.TRADITION.by.AREA.DECISIONS.meanWeightedMeanScore }}
  </p>
</div>`}</CodeBlock>
            </ReferenceSection>

            <ReferenceSection number="16" title="Przykład użycia w JS">
              <CodeBlock>{`const report = window.__REPORT__;

// Personal
const tradition = report.scores?.vMEME?.TRADITION;

// Composite
const mergedTradition =
  report.composite?.dimensionScores?.merged?.byCategory?.VMEME?.TRADITION;

const sourceTradition =
  report.composite?.dimensionScores?.bySource?.humanet_values_ind
    ?.dimensionScores?.byCategory?.VMEME?.TRADITION;

// Aggregate
const aggregateTradition =
  report.aggregate?.dimensionScores?.byDimensionCode?.TRADITION;

const decisionsByVmeme = report.aggregate?.crossScoreRows?.filter(
  (row) =>
    row.axis === "VMEME" &&
    row.byAxis === "AREA" &&
    row.byCode === "DECISIONS",
);

console.log({
  tradition,
  mergedTradition,
  sourceTradition,
  aggregateTradition,
  decisionsByVmeme,
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
                  użyj podglądu na zakończonej sesji, raporcie złożonym albo
                  raporcie zbiorczym. Dokładne kody, takie jak{" "}
                  <span className="font-mono">VMEME</span>,{" "}
                  <span className="font-mono">AREA</span>,{" "}
                  <span className="font-mono">TRADITION</span> czy{" "}
                  <span className="font-mono">DECISIONS</span>, zależą od
                  konfiguracji kwestionariuszy i snapshotów danych.
                </p>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}