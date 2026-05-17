import type { MyAssessmentQuestionnaireStatus } from "../types/my-assessment.types";

type Input = {
  sessionStatus?: string | null;
  completedAt?: Date | string | null;
  isEnabled?: boolean;
  isLocked?: boolean;
  isComingSoon?: boolean;
};

export function resolveMyAssessmentQuestionnaireStatus(
  input: Input,
): MyAssessmentQuestionnaireStatus {
  if (input.isComingSoon) return "coming_soon";
  if (input.isLocked) return "locked";
  if (input.isEnabled === false) return "disabled";

  if (input.completedAt || input.sessionStatus === "completed") {
    return "completed";
  }

  if (
    input.sessionStatus === "opened" ||
    input.sessionStatus === "in_progress"
  ) {
    return "in_progress";
  }

  return "available";
}

export function canContinueMyAssessmentSession(input: {
  sessionStatus?: string | null;
  completedAt?: Date | string | null;
}) {
  return (
    !input.completedAt &&
    (input.sessionStatus === "opened" || input.sessionStatus === "in_progress")
  );
}

export function canShowMyAssessmentResult(input: {
  sessionStatus?: string | null;
  completedAt?: Date | string | null;
}) {
  return Boolean(input.completedAt || input.sessionStatus === "completed");
}