import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  MyAssessmentQuestionnaire,
  MyAssessmentQuestionnaireStatus,
} from "../types/my-assessment.types";

type QuestionnaireSelectionCardProps = {
  questionnaire: MyAssessmentQuestionnaire;
};

function getStatusLabel(status: MyAssessmentQuestionnaireStatus) {
  switch (status) {
    case "available":
      return "Dostępny";
    case "in_progress":
      return "W trakcie";
    case "completed":
      return "Ukończony";
    case "locked":
      return "Zablokowany";
    case "coming_soon":
      return "Wkrótce";
    case "disabled":
      return "Niedostępny";
  }
}

function getStatusVariant(status: MyAssessmentQuestionnaireStatus) {
  switch (status) {
    case "available":
    case "in_progress":
    case "completed":
      return "default";
    case "locked":
    case "coming_soon":
    case "disabled":
      return "secondary";
  }
}

function getActionLabel(status: MyAssessmentQuestionnaireStatus) {
  switch (status) {
    case "available":
      return "Rozpocznij";
    case "in_progress":
      return "Kontynuuj";
    case "completed":
      return "Zobacz podsumowanie";
    case "locked":
      return "Zablokowany";
    case "coming_soon":
      return "Wkrótce";
    case "disabled":
      return "Niedostępny";
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

function getSourceLabel(source: MyAssessmentQuestionnaire["source"]) {
  if (source === "public") return "Publiczny";
  if (source === "invited") return "Zaproszenie";

  return source;
}

export function QuestionnaireSelectionCard({
  questionnaire,
}: QuestionnaireSelectionCardProps) {
  const disabled = isActionDisabled(questionnaire);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="leading-7">{questionnaire.name}</CardTitle>

          <Badge variant={getStatusVariant(questionnaire.status)}>
            {getStatusLabel(questionnaire.status)}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Kod: {questionnaire.code}</span>

          {questionnaire.estimatedMinutes ? (
            <span>· ok. {questionnaire.estimatedMinutes} min</span>
          ) : null}

          <span>· {getSourceLabel(questionnaire.source)}</span>
        </div>

        {questionnaire.projectName ? (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Projekt: {questionnaire.projectName}
          </div>
        ) : null}

        {questionnaire.questionnaireVersionName ? (
          <div className="text-xs text-muted-foreground">
            Wersja: {questionnaire.questionnaireVersionName}
          </div>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-5">
        <p className="text-sm leading-6 text-muted-foreground">
          {questionnaire.description ??
            "Kwestionariusz dostępny w ramach HUMANET VALUES."}
        </p>

        <div className="space-y-2">
          {disabled ? (
            <Button className="w-full" disabled>
              {getActionLabel(questionnaire.status)}
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link href={questionnaire.actionHref!}>
                {getActionLabel(questionnaire.status)}
              </Link>
            </Button>
          )}

          {questionnaire.secondaryActionHref ? (
            <Button asChild className="w-full" variant="outline">
              <Link href={questionnaire.secondaryActionHref}>
                {questionnaire.secondaryActionLabel ?? "Wypełnij ponownie"}
              </Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}