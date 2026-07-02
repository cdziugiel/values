"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Building2, GitCompare, Users, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { createProjectSubjectComparisonReportAction } from "../api/comparison-report.actions";
import type {
  ProjectComparisonQuestionnaireOption,
  ProjectComparisonSubjectOption,
  ProjectComparisonSubjectType,
} from "../api/project-comparison-subjects.queries";

type ProjectComparisonReportPageProps = {
  questionnaires: ProjectComparisonQuestionnaireOption[];
  subjects: ProjectComparisonSubjectOption[];
  tenantSlug: string;
  projectId: string;
  productId: string;
  reportTemplateVersionId: string;
};




function getSubjectTypeLabel(type: ProjectComparisonSubjectType) {
  switch (type) {
    case "organization":
      return "Organizacje";
    case "team":
      return "Zespoły";
    case "respondent":
      return "Respondenci";
    default:
      return type;
  }
}

function getSubjectIcon(type: ProjectComparisonSubjectType) {
  switch (type) {
    case "organization":
      return <Building2 className="h-4 w-4" />;
    case "team":
      return <Users className="h-4 w-4" />;
    case "respondent":
      return <UserRound className="h-4 w-4" />;
    default:
      return <GitCompare className="h-4 w-4" />;
  }
}

function groupSubjects(subjects: ProjectComparisonSubjectOption[]) {
  return subjects.reduce<Record<ProjectComparisonSubjectType, ProjectComparisonSubjectOption[]>>(
    (acc, subject) => {
      acc[subject.subjectType] ??= [];
      acc[subject.subjectType].push(subject);
      return acc;
    },
    {
      organization: [],
      team: [],
      respondent: [],
    },
  );
}

export function ProjectComparisonReportPage({
  questionnaires,
  subjects,
  tenantSlug,
  projectId,
  productId,
  reportTemplateVersionId,
}: ProjectComparisonReportPageProps) {
const [leftKey, setLeftKey] = useState("");
const [rightKey, setRightKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();


const questionnaireOptions = questionnaires;

const [selectedQuestionnaireVersionId, setSelectedQuestionnaireVersionId] =
  useState(() => questionnaires[0]?.questionnaireVersionId ?? "");

const filteredSubjects = useMemo(
  () =>
    subjects.filter(
      (subject) =>
        subject.questionnaireVersionId === selectedQuestionnaireVersionId,
    ),
  [subjects, selectedQuestionnaireVersionId],
);

const groupedSubjects = useMemo(
  () => groupSubjects(filteredSubjects),
  [filteredSubjects],
);

const left = useMemo(
  () => filteredSubjects.find((option) => option.key === leftKey) ?? null,
  [filteredSubjects, leftKey],
);

const right = useMemo(
  () => filteredSubjects.find((option) => option.key === rightKey) ?? null,
  [filteredSubjects, rightKey],
);

  const sameQuestionnaireVersion = Boolean(
    left &&
      right &&
      left.questionnaireVersionId === right.questionnaireVersionId,
  );

  const canSubmit = Boolean(
    left &&
      right &&
      leftKey &&
      rightKey &&
      leftKey !== rightKey &&
      sameQuestionnaireVersion &&
      productId &&
      reportTemplateVersionId,
  );

  useEffect(() => {
  if (!filteredSubjects.length) {
    setLeftKey("");
    setRightKey("");
    return;
  }

  setLeftKey((current) =>
    filteredSubjects.some((subject) => subject.key === current)
      ? current
      : filteredSubjects[0]?.key ?? "",
  );

  setRightKey((current) =>
    filteredSubjects.some((subject) => subject.key === current)
      ? current
      : filteredSubjects[1]?.key ?? filteredSubjects[0]?.key ?? "",
  );
}, [filteredSubjects]);

  function handleGenerate() {
    if (!left || !right) {
      setError("Wybierz dwa obiekty do porównania.");
      return;
    }

    if (leftKey === rightKey) {
      setError("Wybierz dwa różne obiekty.");
      return;
    }

    if (left.questionnaireVersionId !== right.questionnaireVersionId) {
      setError(
        "Porównywane obiekty muszą dotyczyć tej samej wersji kwestionariusza.",
      );
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await createProjectSubjectComparisonReportAction({
        tenantSlug,
        assessmentProjectId: projectId,

        left: {
          subjectType: left.subjectType,
          subjectId: left.subjectId,
          assessmentSessionId: left.assessmentSessionId ?? null,
          questionnaireVersionId: left.questionnaireVersionId,
          label: left.label,
        },

        right: {
          subjectType: right.subjectType,
          subjectId: right.subjectId,
          assessmentSessionId: right.assessmentSessionId ?? null,
          questionnaireVersionId: right.questionnaireVersionId,
          label: right.label,
        },

        productId,
        reportTemplateVersionId,
      });

      if (!result.ok || !result.reportHref) {
        setError(result.error ?? "Nie udało się wygenerować raportu.");
        return;
      }

      window.location.assign(result.reportHref);
    });
  }
  if (!questionnaires.length) {
    return (
      <Card className="rounded-[1.5rem] border-black/10">
        <CardHeader>
          <CardTitle>Brak obiektów do porównania</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          W tym projekcie nie ma jeszcze ukończonych wyników, zespołów ani
          organizacji możliwych do porównania.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[rgba(45,212,191,0.14)] p-3 text-[#0f766e]">
            <GitCompare className="h-6 w-6" />
          </div>

          <div>
            <div className="text-sm text-muted-foreground">
              HUMANET VALUES · Raport dopasowania
            </div>

            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-[#171717]">
              Wybierz obiekty do porównania
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6b7280]">
              Możesz porównać organizacje, zespoły albo pojedynczych
              respondentów. Oba obiekty muszą mieć wyniki z tej samej wersji
              kwestionariusza.
            </p>
          </div>
        </div>
      </section>

      <Card className="rounded-[1.5rem] border-black/10">
        <CardHeader>
          <CardTitle>Konfiguracja porównania</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
  <span className="text-sm font-medium text-[#171717]">
    Kwestionariusz / wersja wyników
  </span>

  <select
    value={selectedQuestionnaireVersionId}
    onChange={(event) => {
      setSelectedQuestionnaireVersionId(event.target.value);
      setError(null);
    }}
    className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
  >
{questionnaireOptions.map((option) => (
  <option
    key={option.questionnaireVersionId}
    value={option.questionnaireVersionId}
  >
    {option.label} · {option.resultRespondentCount} respondentów z wynikami

  </option>
))}
  </select>
{selectedQuestionnaireVersionId && filteredSubjects.length === 0 ? (
  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
    Dla wybranego kwestionariusza nie znaleziono respondentów z realnymi
    wynikami wymiarów. Nie można wygenerować porównania dla tej wersji.
  </div>
) : null}
  <p className="text-xs leading-5 text-[#6b7280]">
    Najpierw wybierz kwestionariusz. Lista organizacji, zespołów i respondentów
    zostanie zawężona do wyników z tej samej wersji narzędzia.
  </p>
</div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#171717]">
                Obiekt A
              </span>

              <select
                value={leftKey}
                onChange={(event) => {
                  setLeftKey(event.target.value);
                  setError(null);
                }}
                className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              >
                {Object.entries(groupedSubjects).map(([type, options]) =>
                  options.length ? (
                    <optgroup
                      key={type}
                      label={getSubjectTypeLabel(
                        type as ProjectComparisonSubjectType,
                      )}
                    >
                      {options.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label} 
                        </option>
                      ))}
                    </optgroup>
                  ) : null,
                )}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[#171717]">
                Obiekt B
              </span>

              <select
                value={rightKey}
                onChange={(event) => {
                  setRightKey(event.target.value);
                  setError(null);
                }}
                className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              >
                {Object.entries(groupedSubjects).map(([type, options]) =>
                  options.length ? (
                    <optgroup
                      key={type}
                      label={getSubjectTypeLabel(
                        type as ProjectComparisonSubjectType,
                      )}
                    >
                      {options.map((option) => (
                        <option key={option.key} value={option.key}>
                          {option.label} 
                        </option>
                      ))}
                    </optgroup>
                  ) : null,
                )}
              </select>
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[left, right].map((subject, index) =>
              subject ? (
                <div
                  key={`${subject.key}-${index}`}
                  className="rounded-2xl border border-black/10 bg-white/70 p-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#171717]">
                    {getSubjectIcon(subject.subjectType)}
                    {index === 0 ? "Obiekt A" : "Obiekt B"}
                  </div>

                  <p className="mt-2 text-sm text-[#171717]">
                    {subject.label}
                  </p>

                  {subject.description ? (
                    <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                      {subject.description}
                    </p>
                  ) : null}

<p className="mt-2 text-xs text-[#8b9099]">
  Typ: {getSubjectTypeLabel(subject.subjectType)} · zakres:{" "}
  {subject.respondentCount}{" "}
  {subject.respondentCount === 1 ? "respondent" : "respondentów"}
</p>
                </div>
              ) : null,
            )}
          </div>

          {leftKey === rightKey ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Wybierz dwa różne obiekty.
            </div>
          ) : null}

          {left && right && !sameQuestionnaireVersion ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Porównywane obiekty muszą dotyczyć tej samej wersji
              kwestionariusza.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
              {error}
            </div>
          ) : null}

          <Button
            type="button"
            disabled={!canSubmit || isPending}
            onClick={handleGenerate}
            className="rounded-full bg-[#171717] px-6 text-white hover:bg-[#2a2a2a]"
          >
            {isPending ? "Generuję raport..." : "Wygeneruj raport dopasowania"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}