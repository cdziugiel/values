// features/public-assessment/components/public-assessment-session-overview.tsx

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  PlayCircle,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import type { AssessmentSessionOverviewQuestionnaire } from "@/server/assessment/resolve-assessment-session-overview";

import { CompleteAssessmentSessionForm } from "./complete-assessment-session-form";

type PublicAssessmentSessionOverviewProps = {
  token: string;
  sessionId: string;
  project: {
    name: string;
    description: string | null;
  };
  respondent: {
    displayName: string;
    email: string | null;
  };
  session: {
    status: string;
  };
  questionnaires: AssessmentSessionOverviewQuestionnaire[];
  allRequiredCompleted: boolean;
};

function statusLabel(questionnaire: AssessmentSessionOverviewQuestionnaire) {
  if (questionnaire.isCompleted) {
    return "Ukończony";
  }

  if (questionnaire.answeredItemsCount > 0) {
    return "W trakcie";
  }

  return "Nierozpoczęty";
}

function getStatusBadgeClassName(
  questionnaire: AssessmentSessionOverviewQuestionnaire,
) {
  if (questionnaire.isCompleted) {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (questionnaire.answeredItemsCount > 0) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-black/10 bg-white/70 text-[#6b7280]";
}

function getSessionStatusLabel(status: string) {
  switch (status) {
    case "opened":
      return "Otwarta";
    case "in_progress":
      return "W trakcie";
    case "completed":
      return "Zakończona";
    case "cancelled":
      return "Anulowana";
    default:
      return status;
  }
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-[1.5rem] border border-black/10 bg-white/65 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b7280]">
            {label}
          </p>

          <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[#171717]">
            {value}
          </div>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          {icon}
        </div>
      </div>
    </article>
  );
}

function QuestionnaireProgressBar({ value }: { value: number }) {
  const normalizedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf]"
        style={{ width: `${normalizedValue}%` }}
      />
    </div>
  );
}

export function PublicAssessmentSessionOverview({
  token,
  sessionId,
  project,
  respondent,
  session,
  questionnaires,
  allRequiredCompleted,
}: PublicAssessmentSessionOverviewProps) {
  const canComplete = session.status === "in_progress" && allRequiredCompleted;

  const completedCount = questionnaires.filter(
    (questionnaire) => questionnaire.isCompleted,
  ).length;

  const startedCount = questionnaires.filter(
    (questionnaire) => questionnaire.answeredItemsCount > 0,
  ).length;

  return (
    
    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <ShieldCheck size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  HUMANET VALUES
                </span>
              </div>

              <h1 className="max-w-4xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                {project.name}
              </h1>

              {project.description ? (
                <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                  {project.description}
                </p>
              ) : (
                <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                  Wypełnij przypisane kwestionariusze. Odpowiedzi są zapisywane
                  podczas przechodzenia między stronami.
                </p>
              )}
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <ClipboardList size={20} />
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#171717]">
                    Postęp
                  </p>
                  <p className="mt-0.5 text-sm text-[#6b7280]">
                    {completedCount} / {questionnaires.length} ukończonych
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-black/10 bg-white/35 p-6 md:grid-cols-3 md:p-8">
            <MetricCard
              label="Respondent"
              value={
                <span>
                  {respondent.displayName}
                  {respondent.email ? (
                    <span className="mt-1 block font-mono text-xs font-normal text-[#6b7280]">
                      {respondent.email}
                    </span>
                  ) : null}
                </span>
              }
              icon={<UserRound size={18} />}
            />

            <MetricCard
              label="Status sesji"
              value={getSessionStatusLabel(session.status)}
              icon={<CheckCircle2 size={18} />}
            />

            <MetricCard
              label="Kwestionariusze"
              value={`${startedCount} rozpoczętych / ${questionnaires.length}`}
              icon={<FileText size={18} />}
            />
          </div>
        </section>

        <section className="rounded-[2rem] hv-brand-card p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                <FileText size={13} />
                Kwestionariusze
              </div>

              <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
                Wybierz część badania
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7280]">
                Możesz wypełniać kwestionariusze w dowolnej kolejności.
                Odpowiedzi są zapisywane podczas przechodzenia między stronami.
              </p>
            </div>

            <div className="w-fit rounded-[1.25rem] border border-black/10 bg-white/70 px-4 py-3 text-sm text-[#6b7280] shadow-sm">
              <span className="font-semibold text-[#171717]">
                {questionnaires.length}
              </span>{" "}
              części badania
            </div>
          </div>

          {questionnaires.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm leading-6 text-[#6b7280]">
              Brak przypisanych kwestionariuszy.
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {questionnaires.map((questionnaire) => (
                <Link
                  key={questionnaire.projectQuestionnaireId}
                  href={`/a/${token}/session/${sessionId}/questionnaire/${questionnaire.projectQuestionnaireId}`}
                  className="group block rounded-[1.5rem] border border-black/10 bg-white/75 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:bg-white hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                >
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold tracking-[-0.03em] text-[#171717]">
                          {questionnaire.questionnaireName}
                        </h3>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusBadgeClassName(
                            questionnaire,
                          )}`}
                        >
                          {statusLabel(questionnaire)}
                        </span>
                      </div>

                      <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                        {questionnaire.questionnaireVersionName}
                      </p>

                      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                            Odpowiedzi
                          </div>
                          <div className="mt-1 font-medium text-[#171717]">
                            {questionnaire.answeredItemsCount}/
                            {questionnaire.totalItemsCount}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                            Wymagane
                          </div>
                          <div className="mt-1 font-medium text-[#171717]">
                            {questionnaire.requiredItemsCount > 0
                              ? `${questionnaire.answeredRequiredItemsCount}/${questionnaire.requiredItemsCount}`
                              : "—"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
                            Postęp
                          </div>
                          <div className="mt-1 font-medium text-[#171717]">
                            {questionnaire.completionPercent}%
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <QuestionnaireProgressBar
                          value={questionnaire.completionPercent}
                        />
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold text-[#171717] shadow-sm group-hover:bg-[#171717] group-hover:text-white">
                      {questionnaire.answeredItemsCount > 0 ? (
                        <>
                          Kontynuuj
                          <ArrowRight size={15} />
                        </>
                      ) : (
                        <>
                          Rozpocznij
                          <PlayCircle size={15} />
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[2rem] hv-brand-card p-6 md:p-8">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
              <ClipboardList size={20} />
            </div>

            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                Zakończenie badania
              </h2>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                Badanie można zakończyć po uzupełnieniu wszystkich wymaganych
                kwestionariuszy.
              </p>
            </div>
          </div>

          {canComplete ? (
            <CompleteAssessmentSessionForm token={token} sessionId={sessionId} />
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-5 text-sm leading-6 text-[#6b7280]">
              Badanie będzie można zakończyć po uzupełnieniu wszystkich
              wymaganych kwestionariuszy.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}