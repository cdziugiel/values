// features/my-assessment/components/questionnaire-selection-card.tsx

import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Lock,
  PlayCircle,
  RotateCcw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { MyAssessmentCardSessionActions } from "./my-assessment-card-session-actions";
import type {
  MyAssessmentQuestionnaire,
  MyAssessmentQuestionnaireStatus,
} from "../types/my-assessment.types";

type QuestionnaireSelectionCardProps = {
  questionnaire: MyAssessmentQuestionnaire;
};

function formatAssessmentDate(value: Date | string | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getDateLabel(questionnaire: MyAssessmentQuestionnaire) {
  if (questionnaire.status === "completed") {
    const completedAt = formatAssessmentDate(questionnaire.completedAt);
    return completedAt ? `Ukończono ${completedAt}` : null;
  }

  if (questionnaire.status === "in_progress") {
    const updatedAt = formatAssessmentDate(questionnaire.updatedAt);
    return updatedAt ? `Ostatnio ${updatedAt}` : null;
  }

  return null;
}

function getStatusLabel(status: MyAssessmentQuestionnaireStatus) {
  switch (status) {
    case "available":
      return "Do wypełnienia";
    case "in_progress":
      return "Rozpoczęte";
    case "completed":
      return "Zakończone";
    case "locked":
      return "Zablokowane";
    case "coming_soon":
      return "Wkrótce";
    case "disabled":
      return "Niedostępne";
  }
}

function getStatusIcon(status: MyAssessmentQuestionnaireStatus) {
  switch (status) {
    case "available":
      return <PlayCircle size={13} />;
    case "in_progress":
      return <Clock3 size={13} />;
    case "completed":
      return <CheckCircle2 size={13} />;
    case "locked":
    case "coming_soon":
    case "disabled":
      return <Lock size={13} />;
  }
}

function getStatusClassName(status: MyAssessmentQuestionnaireStatus) {
  switch (status) {
    case "available":
      return "border-primary/20 bg-primary/10 text-primary";
    case "in_progress":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "locked":
    case "coming_soon":
    case "disabled":
      return "border-border bg-muted text-muted-foreground";
  }
}

function getActionLabel(status: MyAssessmentQuestionnaireStatus) {
  switch (status) {
    case "available":
      return "Rozpocznij";
    case "in_progress":
      return "Kontynuuj";
    case "completed":
      return "Zobacz";
    case "locked":
      return "Zablokowane";
    case "coming_soon":
      return "Wkrótce";
    case "disabled":
      return "Niedostępne";
  }
}

function getActionIcon(status: MyAssessmentQuestionnaireStatus) {
  switch (status) {
    case "available":
      return <PlayCircle size={16} />;
    case "in_progress":
      return <RotateCcw size={16} />;
    case "completed":
      return <FileText size={16} />;
    case "locked":
    case "coming_soon":
    case "disabled":
      return <Lock size={16} />;
  }
}

function isActionDisabled(questionnaire: MyAssessmentQuestionnaire) {
  return (
    questionnaire.status === "locked" ||
    questionnaire.status === "coming_soon" ||
    questionnaire.status === "disabled" ||
    !questionnaire.actionHref
  );
}

function getMetaLine(questionnaire: MyAssessmentQuestionnaire) {
  const parts = [
    questionnaire.projectName,
    getDateLabel(questionnaire),
    questionnaire.estimatedMinutes
      ? `ok. ${questionnaire.estimatedMinutes} min`
      : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

function getSourceLabel(source: MyAssessmentQuestionnaire["source"]) {
  if (source === "public") return "Publiczne";
  if (source === "invited") return "Zaproszenie";
  return source;
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (!value) return null;

  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[120px_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function QuestionnaireSelectionCard({
  questionnaire,
}: QuestionnaireSelectionCardProps) {
  const disabled = isActionDisabled(questionnaire);
  const metaLine = getMetaLine(questionnaire);

  return (
    <article className="rounded-2xl border bg-background p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md">
      <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight">
              {questionnaire.name}
            </h3>

            <Badge
              variant="outline"
              className={`gap-1 rounded-full px-2.5 py-0.5 text-xs ${getStatusClassName(
                questionnaire.status,
              )}`}
            >
              {getStatusIcon(questionnaire.status)}
              {getStatusLabel(questionnaire.status)}
            </Badge>
          </div>

          {metaLine ? (
            <p className="truncate text-sm text-muted-foreground">{metaLine}</p>
          ) : questionnaire.description ? (
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
              {questionnaire.description}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2 md:justify-end">
          {disabled ? (
            <Button disabled className="min-w-32 gap-2">
              {getActionIcon(questionnaire.status)}
              {getActionLabel(questionnaire.status)}
            </Button>
          ) : (
            <Button asChild className="min-w-32 gap-2">
              <Link href={questionnaire.actionHref!}>
                {getActionIcon(questionnaire.status)}
                {getActionLabel(questionnaire.status)}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <details className="group mt-3 border-t pt-3">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-md text-sm text-muted-foreground outline-none transition hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
          Szczegóły
          <ChevronDown
            size={15}
            className="transition group-open:rotate-180"
          />
        </summary>

        <div className="mt-4 space-y-4">
          {questionnaire.description ? (
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {questionnaire.description}
            </p>
          ) : null}

          <dl className="space-y-2 rounded-xl bg-muted/40 p-4">
            <DetailRow label="Źródło" value={getSourceLabel(questionnaire.source)} />
            <DetailRow label="Kod" value={questionnaire.code} />
            <DetailRow label="Projekt" value={questionnaire.projectName} />
            <DetailRow
              label="Wersja"
              value={questionnaire.questionnaireVersionName}
            />
            <DetailRow
              label="Czas"
              value={
                questionnaire.estimatedMinutes
                  ? `ok. ${questionnaire.estimatedMinutes} min`
                  : null
              }
            />
          </dl>

          {questionnaire.secondaryActionHref ? (
            <Button asChild variant="outline" size="sm">
              <Link href={questionnaire.secondaryActionHref}>
                {questionnaire.secondaryActionLabel ?? "Wypełnij ponownie"}
              </Link>
            </Button>
          ) : null}

          <MyAssessmentCardSessionActions questionnaire={questionnaire} />
        </div>
      </details>
    </article>
  );
}