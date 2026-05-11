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

function isActionDisabled(status: MyAssessmentQuestionnaireStatus) {
  return status === "locked" || status === "coming_soon" || status === "disabled";
}

export function QuestionnaireSelectionCard({
  questionnaire,
}: QuestionnaireSelectionCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="leading-7">{questionnaire.name}</CardTitle>
          <Badge variant={getStatusVariant(questionnaire.status)}>
            {getStatusLabel(questionnaire.status)}
          </Badge>
        </div>

        <div className="text-xs text-muted-foreground">
          Kod: {questionnaire.code}
          {questionnaire.estimatedMinutes
            ? ` · ok. ${questionnaire.estimatedMinutes} min`
            : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <p className="text-sm leading-6 text-muted-foreground">
          {questionnaire.description}
        </p>

        <Button
          className="w-full"
          disabled={isActionDisabled(questionnaire.status)}
        >
          {getActionLabel(questionnaire.status)}
        </Button>
      </CardContent>
    </Card>
  );
}