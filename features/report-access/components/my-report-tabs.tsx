"use client";

import {
  useState,
  type ReactNode,
} from "react";
import {
  FileText,
  Plus,
  ShoppingBag,
} from "lucide-react";

type MyReportTabKey = "owned" | "purchase";

type MyReportTabsProps = {
  purchaseSlot: ReactNode;
  ownedSlot: ReactNode;
  defaultTab?: MyReportTabKey;

  ownedCount?: number;
  purchaseCount?: number;
};

const REPORT_TABS: Array<{
  key: MyReportTabKey;
  label: string;
  shortLabel: string;
  icon: ReactNode;
}> = [
  {
    key: "owned",
    label: "Moje raporty",
    shortLabel: "Raporty",
    icon: <FileText size={17} />,
  },
  {
    key: "purchase",
    label: "Kup nowy raport",
    shortLabel: "Kup raport",
    icon: <ShoppingBag size={17} />,
  },
];

function getReportTabPanelId(key: MyReportTabKey) {
  return `my-report-panel-${key}`;
}

function getReportTabButtonId(key: MyReportTabKey) {
  return `my-report-tab-${key}`;
}

export function MyReportTabs({
  purchaseSlot,
  ownedSlot,
  defaultTab = "owned",
  ownedCount,
  purchaseCount,
}: MyReportTabsProps) {
  const [activeTab, setActiveTab] =
    useState<MyReportTabKey>(defaultTab);

  const activeTabConfig =
    REPORT_TABS.find((tab) => tab.key === activeTab) ??
    REPORT_TABS[0];

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#0f766e]">
            {activeTabConfig.icon}
            <span>
              {activeTab === "owned"
                ? "Twoja biblioteka"
                : "Sklep z raportami"}
            </span>
          </div>

          <h2 className="text-2xl font-semibold tracking-[-0.035em] text-[#171717]">
            {activeTab === "owned"
              ? "Twoje raporty"
              : "Wybierz nowy raport"}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
            {activeTab === "owned"
              ? "Tutaj znajdziesz wszystkie raporty, do których masz dostęp."
              : "Odblokuj raport na podstawie zakończonych przez Ciebie badań."}
          </p>
        </div>

        {activeTab === "owned" ? (
          <button
            type="button"
            onClick={() => setActiveTab("purchase")}
            className={[
              "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full",
              "bg-[#171717] px-5 text-sm font-medium text-white",
              "shadow-[0_8px_22px_rgba(15,23,42,0.14)]",
              "transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/50",
            ].join(" ")}
          >
            <Plus size={17} />
            Kup nowy raport
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab("owned")}
            className={[
              "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full",
              "border border-black/10 bg-white px-5 text-sm font-medium text-[#171717]",
              "shadow-sm transition hover:bg-black/[0.03]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/50",
            ].join(" ")}
          >
            <FileText size={17} />
            Wróć do moich raportów
          </button>
        )}
      </header>

      <div className="border-b border-black/10">
        <div
          role="tablist"
          aria-label="Widoki raportów"
          className="flex items-center gap-7"
        >
          {REPORT_TABS.map((tab) => {
            const isActive = activeTab === tab.key;

            const count =
              tab.key === "owned"
                ? ownedCount
                : purchaseCount;

            return (
              <button
                key={tab.key}
                id={getReportTabButtonId(tab.key)}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={getReportTabPanelId(tab.key)}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.key)}
                className={[
                  "group relative flex h-12 items-center gap-2 text-sm transition",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40",
                  isActive
                    ? "font-semibold text-[#171717]"
                    : "font-medium text-[#7a7f87] hover:text-[#171717]",
                ].join(" ")}
              >
                <span
                  className={
                    isActive
                      ? "text-[#0f766e]"
                      : "text-[#9ca3af] transition group-hover:text-[#4b5563]"
                  }
                >
                  {tab.icon}
                </span>

                <span className="hidden sm:inline">
                  {tab.label}
                </span>

                <span className="sm:hidden">
                  {tab.shortLabel}
                </span>

                {typeof count === "number" ? (
                  <span
                    className={[
                      "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5",
                      "text-[11px] font-semibold",
                      isActive
                        ? "bg-[rgba(45,212,191,0.15)] text-[#0f766e]"
                        : "bg-black/[0.05] text-[#6b7280]",
                    ].join(" ")}
                  >
                    {count}
                  </span>
                ) : null}

                {isActive ? (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div
        id={getReportTabPanelId(activeTab)}
        role="tabpanel"
        aria-labelledby={getReportTabButtonId(activeTab)}
        className="min-h-[240px]"
      >
        {activeTab === "owned"
          ? ownedSlot
          : purchaseSlot}
      </div>
    </section>
  );
}