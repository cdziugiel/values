// features/my-assessment/components/my-assessment-tabs.tsx

"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  Mail,
  PlayCircle,
} from "lucide-react";
import { MyAssessmentQuestionnaireSection } from "./my-assessment-questionnaire-section";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/shared/ui";

import type { MyAssessmentQuestionnaire } from "../types/my-assessment.types";

export type MyAssessmentTabKey =
  | "todo"
  | "in_progress"
  | "invitations"
  | "completed"
  | "reports";

type MyAssessmentTabsProps = {
  publicQuestionnaires: MyAssessmentQuestionnaire[];
  invitedQuestionnaires: MyAssessmentQuestionnaire[];
  reportsSlot: ReactNode;
  initialActiveTab?: MyAssessmentTabKey;
};

type TabConfig = {
  key: MyAssessmentTabKey;
  label: string;
  shortLabel: string;
  description: string;
  helperText: string;
  count: number | null;
  icon: ReactNode;
};

function QuestionnaireList({
  questionnaires,
  emptyTitle,
  emptyDescription,
}: {
  questionnaires: MyAssessmentQuestionnaire[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const invitedQuestionnaires = questionnaires.filter(
    (questionnaire) => questionnaire.source === "invited",
  );

  const publicQuestionnaires = questionnaires.filter(
    (questionnaire) => questionnaire.source === "public",
  );

  const hasInvitedQuestionnaires = invitedQuestionnaires.length > 0;
  const hasPublicQuestionnaires = publicQuestionnaires.length > 0;

  if (questionnaires.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-black/10 bg-white/60 p-8 shadow-sm backdrop-blur">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {hasInvitedQuestionnaires ? (
        <MyAssessmentQuestionnaireSection
          title="Zaproszenia "
          description="Kwestionariusze przypisane przez organizację, projekt badawczy albo indywidualne zaproszenie."
          emptyMessage="Nie masz obecnie aktywnych zaproszeń ani badań organizacyjnych."
          variant="organization"
          questionnaires={invitedQuestionnaires}
          defaultOpen
        />
      ) : null}

      {hasPublicQuestionnaires ? (
        <MyAssessmentQuestionnaireSection
          title="Badania publiczne"
          description="Kwestionariusze publiczne, które możesz wypełnić niezależnie od zaproszenia organizacji."
          emptyMessage="Nie masz obecnie dostępnych publicznych kwestionariuszy."
          variant="public"
          questionnaires={publicQuestionnaires}
          defaultOpen={!hasInvitedQuestionnaires}
        />
      ) : null}
    </div>
  );
}

function CountPill({
  count,
  active = false,
}: {
  count: number | null;
  active?: boolean;
}) {
  if (count === null) return null;

  return (
    <span
      className={[
        "ml-1 inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        active
          ? "bg-[#171717] text-white"
          : "bg-white/75 text-[#6b7280] ring-1 ring-black/10",
      ].join(" ")}
    >
      {count}
    </span>
  );
}

function getTabPanelId(key: MyAssessmentTabKey) {
  return `my-assessment-panel-${key}`;
}

function getTabButtonId(key: MyAssessmentTabKey) {
  return `my-assessment-tab-${key}`;
}

export function MyAssessmentTabs({
  publicQuestionnaires,
  invitedQuestionnaires,
  reportsSlot,
  initialActiveTab,
}: MyAssessmentTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const allQuestionnaires = useMemo(
    () => [...invitedQuestionnaires, ...publicQuestionnaires],
    [invitedQuestionnaires, publicQuestionnaires],
  );

  const todoQuestionnaires = allQuestionnaires.filter(
    (questionnaire) => questionnaire.status === "available",
  );

  const inProgressQuestionnaires = allQuestionnaires.filter(
    (questionnaire) => questionnaire.status === "in_progress",
  );

  const activeInvitationQuestionnaires = invitedQuestionnaires.filter(
    (questionnaire) =>
      questionnaire.status === "available" ||
      questionnaire.status === "in_progress",
  );

  const completedQuestionnaires = allQuestionnaires.filter(
    (questionnaire) => questionnaire.status === "completed",
  );

  const defaultTab: MyAssessmentTabKey =
    inProgressQuestionnaires.length > 0
      ? "in_progress"
      : todoQuestionnaires.length > 0
        ? "todo"
        : activeInvitationQuestionnaires.length > 0
          ? "invitations"
          : completedQuestionnaires.length > 0
            ? "completed"
            : "reports";

  const resolvedInitialTab = initialActiveTab ?? defaultTab;

  const [activeTab, setActiveTab] =
    useState<MyAssessmentTabKey>(resolvedInitialTab);

  useEffect(() => {
    setActiveTab(resolvedInitialTab);
  }, [resolvedInitialTab]);

  function handleActiveTabChange(nextTab: MyAssessmentTabKey) {
    setActiveTab(nextTab);

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  }

  const tabs: TabConfig[] = [
    {
      key: "todo",
      label: "Do wypełnienia",
      shortLabel: "Do wypełnienia",
      description: "Nowe badania gotowe do rozpoczęcia",
      helperText:
        "Tutaj znajdziesz badania, które możesz rozpocząć od razu.",
      count: todoQuestionnaires.length,
      icon: <ClipboardList size={16} />,
    },
    {
      key: "in_progress",
      label: "Rozpoczęte",
      shortLabel: "Rozpoczęte",
      description: "Sesje, do których możesz wrócić",
      helperText:
        "Wróć do badania i kontynuuj od miejsca, w którym przerwano.",
      count: inProgressQuestionnaires.length,
      icon: <PlayCircle size={16} />,
    },
    {
      key: "invitations",
      label: "Zaproszenia",
      shortLabel: "Zaproszenia",
      description: "Badania przypisane do Twojego konta",
      helperText:
        "Tutaj widzisz badania, do których otrzymano zaproszenie.",
      count: activeInvitationQuestionnaires.length,
      icon: <Mail size={16} />,
    },
    {
      key: "completed",
      label: "Zakończone",
      shortLabel: "Zakończone",
      description: "Badania już wypełnione",
      helperText:
        "Tu możesz wrócić do zakończonych badań i dostępnych podsumowań.",
      count: completedQuestionnaires.length,
      icon: <CheckCircle2 size={16} />,
    },
{
  key: "reports",
  label: "Raporty",
  shortLabel: "Raporty",
  description: "Raporty do zakupu i zakupione",
  helperText:
    "Wybierz raport do odblokowania albo wróć do raportów, które zostały już zakupione.",
  count: null,
  icon: <FileText size={16} />,
},
  ];

  const activeTabConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];


  return (
    <section className="space-y-5">
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Wybierz widok badań"
              className={[
                "flex w-full items-center justify-between gap-4 rounded-[1.5rem] border border-black/10 bg-white/85 px-4 py-3.5 text-left shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur",
                "transition hover:bg-white",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40",
              ].join(" ")}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
                  {activeTabConfig.icon}
                </span>

                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-[#171717]">
                      {activeTabConfig.label}
                    </span>
                    <CountPill count={activeTabConfig.count} />
                  </span>

                  <span className="mt-0.5 block truncate text-xs text-[#6b7280]">
                    {activeTabConfig.description}
                  </span>
                </span>
              </span>

              <ChevronDown size={18} className="shrink-0 text-[#6b7280]" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-[calc(100vw-2rem)] rounded-[1.5rem] border-black/10 bg-white/95 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <DropdownMenuItem
                  key={tab.key}
                  onSelect={() => handleActiveTabChange(tab.key)}
                  className={[
                    "flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 py-3",
                    isActive ? "bg-[#f3f4f6]" : "",
                  ].join(" ")}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={[
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        isActive
                          ? "bg-white text-[#0f766e] shadow-sm"
                          : "bg-[#f3f4f6] text-[#8b9099]",
                      ].join(" ")}
                    >
                      {tab.icon}
                    </span>

                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[#171717]">
                        {tab.label}
                      </span>
                      <span className="block truncate text-xs text-[#6b7280]">
                        {tab.description}
                      </span>
                    </span>
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    <CountPill count={tab.count} />
                    {isActive ? (
                      <Check size={16} className="text-[#0f766e]" />
                    ) : null}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="hidden md:block">
        <div
          role="tablist"
          aria-label="Widoki moich badań"
          className="rounded-[2rem] border border-black/10 bg-white/55 p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur"
        >
          <div className="grid gap-1 md:grid-cols-3 xl:grid-cols-5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  key={tab.key}
                  id={getTabButtonId(tab.key)}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={getTabPanelId(tab.key)}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleActiveTabChange(tab.key)}
                  className={[
                    "group relative flex min-h-4 items-center justify-center gap-2 rounded-[1.55rem] px-3 py-2.5 text-sm transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40",
                    isActive
                      ? "bg-white text-[#171717] shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-1 ring-black/10"
                      : "text-[#6b7280] hover:bg-white/70 hover:text-[#171717]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "shrink-0 transition",
                      isActive ? "text-[#0f766e]" : "text-[#8b9099]",
                    ].join(" ")}
                  >
                    {tab.icon}
                  </span>

                  <span className="truncate font-medium">{tab.shortLabel}</span>

                  <CountPill count={tab.count} active={isActive} />

                  {isActive ? (
                    <span className="absolute inset-x-6 -bottom-1 h-[2px] rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        id={getTabPanelId(activeTab)}
        role="tabpanel"
        aria-labelledby={getTabButtonId(activeTab)}
        className="min-h-[320px] space-y-4"
      >
        <header className="rounded-[2rem] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
                {activeTabConfig.icon}
                {activeTabConfig.label}
              </div>

              <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                {activeTabConfig.description}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#6b7280]">
                {activeTabConfig.helperText}
              </p>
            </div>

            {activeTabConfig.count !== null ? (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-lg font-semibold text-[#171717]">
                {activeTabConfig.count}
              </div>
            ) : null}
          </div>
        </header>

        {activeTab === "todo" ? (
          <QuestionnaireList
            questionnaires={todoQuestionnaires}
            emptyTitle="Brak badań do wypełnienia"
            emptyDescription="Nie masz obecnie nowych badań dostępnych do rozpoczęcia."
          />
        ) : null}

        {activeTab === "in_progress" ? (
          <QuestionnaireList
            questionnaires={inProgressQuestionnaires}
            emptyTitle="Brak rozpoczętych badań"
            emptyDescription="Nie masz obecnie żadnego badania w toku."
          />
        ) : null}

        {activeTab === "invitations" ? (
          <QuestionnaireList
            questionnaires={activeInvitationQuestionnaires}
            emptyTitle="Brak aktywnych zaproszeń"
            emptyDescription="Nie znaleźliśmy aktywnych zaproszeń przypisanych do Twojego konta."
          />
        ) : null}

        {activeTab === "completed" ? (
          <QuestionnaireList
            questionnaires={completedQuestionnaires}
            emptyTitle="Brak zakończonych badań"
            emptyDescription="Po zakończeniu badania pojawi się ono w tej zakładce."
          />
        ) : null}

        {activeTab === "reports" ? reportsSlot : null}
      </div>
    </section>
  );
}