"use server";

import { redirect } from "next/navigation";

import { startAssessmentSessionFromToken } from "@/server/assessment/start-assessment-session";

export type StartPublicAssessmentState = {
  status: "idle" | "error";
  message: string;
};

export async function startPublicAssessmentAction(
  _previousState: StartPublicAssessmentState,
  formData: FormData,
): Promise<StartPublicAssessmentState> {
  const token = String(formData.get("token") ?? "");

  const result = await startAssessmentSessionFromToken(token);

  if (!result.ok) {
    return {
      status: "error",
      message: result.message,
    };
  }

if (result.sessionStatus === "completed") {
  redirect(`/a/${token}/session/${result.sessionId}/completed`);
}

redirect(`/a/${token}/session/${result.sessionId}`);
}