"use client";

import { useState } from "react";
import { ChevronDown, Building2, Globe2, Inbox } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { MyAssessmentQuestionnaire } from "../types/my-assessment.types";
import { QuestionnaireSelectionCard } from "./questionnaire-selection-card";

type MyAssessmentQuestionnaireSectionProps = {
  title: string;
  description: string;
  emptyMessage: string;
  defaultOpen?: boolean;
  variant: "organization" | "public";
  questionnaires: MyAssessmentQuestionnaire[];
};

export function MyAssessmentQuestionnaireSection({
  title,
  description,
  emptyMessage,
  defaultOpen = false,
  variant,
  questionnaires,
}: MyAssessmentQuestionnaireSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const Icon = variant === "organization" ? Building2 : Globe2;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left transition hover:bg-black/[0.015] md:px-6"
      >
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <Icon size={20} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                {title}
              </h2>

              <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                {questionnaires.length}
              </Badge>
            </div>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
              {description}
            </p>
          </div>
        </div>

        <ChevronDown
          size={20}
          className={[
            "mt-2 shrink-0 text-[#6b7280] transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>

      {open ? (
        <div className="border-t border-black/10 px-5 py-5 md:px-6">
          {questionnaires.length === 0 ? (
            <div className="flex items-start gap-3 rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-5 text-sm leading-6 text-[#6b7280]">
              <Inbox size={18} className="mt-0.5 shrink-0" />
              <p>{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questionnaires.map((questionnaire) => (
                <QuestionnaireSelectionCard
                  key={questionnaire.id}
                  questionnaire={questionnaire}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}