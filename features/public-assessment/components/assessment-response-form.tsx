"use client";

import { useActionState } from "react";

import {
  saveAssessmentResponsesAction,
  type SaveAssessmentResponsesState,
} from "../api/assessment-response.actions";

type AssessmentResponseFormItem = {
  id: string;
  code: string;
  type: string;
  text: string;
  helpText: string | null;
  required: boolean;
  scaleMin: number | null;
  scaleMax: number | null;
  scaleMinLabel: string | null;
  scaleMaxLabel: string | null;
  existingNumberValue: number | null;
  questionnaireId: string;
  questionnaireVersionId: string;
  questionnaireName: string;
  questionnaireVersionName: string;
};

type AssessmentResponseFormProps = {
  token: string;
  sessionId: string;
  items: AssessmentResponseFormItem[];
};

const initialState: SaveAssessmentResponsesState = {
  status: "idle",
  message: "",
};

export function AssessmentResponseForm({
  token,
  sessionId,
  items,
}: AssessmentResponseFormProps) {
  const [state, formAction, isPending] = useActionState(
    saveAssessmentResponsesAction,
    initialState,
  );

  const groupedItems = items.reduce<Record<string, AssessmentResponseFormItem[]>>(
    (acc, item) => {
      const key = item.questionnaireVersionId;
      acc[key] ??= [];
      acc[key].push(item);
      return acc;
    },
    {},
  );

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="sessionId" value={sessionId} />

      {Object.entries(groupedItems).map(([versionId, versionItems]) => {
        const firstItem = versionItems[0];

        return (
          <section key={versionId} className="space-y-5 rounded-2xl border p-5">
            <div>
              <h2 className="text-xl font-semibold">
                {firstItem.questionnaireName}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {firstItem.questionnaireVersionName}
              </p>
            </div>

            <div className="space-y-6">
              {versionItems.map((item, index) => {
                const scaleMin = item.scaleMin ?? 1;
                const scaleMax = item.scaleMax ?? 5;
                const values = Array.from(
                  { length: scaleMax - scaleMin + 1 },
                  (_, i) => scaleMin + i,
                );

                const fieldName = [
                  "response",
                  item.questionnaireId,
                  item.questionnaireVersionId,
                  item.id,
                  item.code,
                ].join(":");

                return (
                  <div key={item.id} className="rounded-xl border bg-background p-4">
                    <div className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-medium leading-relaxed">
                          {item.text}
                        </div>

                        {item.helpText ? (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.helpText}
                          </p>
                        ) : null}

                        <div className="mt-4 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {values.map((value) => (
                              <label
                                key={value}
                                className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
                              >
                                <input
                                  type="radio"
                                  name={fieldName}
                                  value={value}
                                  required={item.required}
                                  defaultChecked={
                                    item.existingNumberValue === value
                                  }
                                />
                                <span>{value}</span>
                              </label>
                            ))}
                          </div>

                          <div className="flex justify-between gap-4 text-xs text-muted-foreground">
                            <span>{item.scaleMinLabel ?? scaleMin}</span>
                            <span>{item.scaleMaxLabel ?? scaleMax}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {state.status !== "idle" ? (
        <div
          className={
            state.status === "success"
              ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
              : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {isPending ? "Zapisywanie..." : "Zapisz odpowiedzi"}
      </button>
    </form>
  );
}