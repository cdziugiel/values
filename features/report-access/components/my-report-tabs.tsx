"use client";

import { useState, type ReactNode } from "react";
import { CheckCircle2, ShoppingCart } from "lucide-react";

type MyReportTabKey = "purchase" | "owned";

type MyReportTabsProps = {
  purchaseSlot: ReactNode;
  ownedSlot: ReactNode;
  defaultTab?: MyReportTabKey;
};

const REPORT_TABS: Array<{
  key: MyReportTabKey;
  label: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    key: "purchase",
    label: "Dostępne",
    description:
      "Raporty, które możesz odblokować na podstawie zakończonych badań.",
    icon: <ShoppingCart size={16} />,
  },
  {
    key: "owned",
    label: "Zakupione",
    description:
      "Raporty, do których masz już aktywny dostęp.",
    icon: <CheckCircle2 size={16} />,
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
  defaultTab = "purchase",
}: MyReportTabsProps) {
  const [activeTab, setActiveTab] = useState<MyReportTabKey>(defaultTab);

  const activeTabConfig =
    REPORT_TABS.find((tab) => tab.key === activeTab) ?? REPORT_TABS[0];

  return (
    <section className="space-y-5">
      <div className="rounded-[2rem] border border-black/10 bg-white/55 p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.06)] backdrop-blur">
        <div
          role="tablist"
          aria-label="Widoki raportów"
          className="grid gap-1 sm:grid-cols-2"
        >
          {REPORT_TABS.map((tab) => {
            const isActive = activeTab === tab.key;

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
                  "group relative flex min-h-12 items-center justify-center gap-2 rounded-[1.55rem] px-4 py-3 text-sm transition",
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

                <span className="truncate font-medium">{tab.label}</span>

                {isActive ? (
                  <span className="absolute inset-x-8 -bottom-1 h-[2px] rounded-full bg-gradient-to-r from-[#171717] to-[#2dd4bf]" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <header className="rounded-[2rem] border border-black/10 bg-white/70 p-5 shadow-sm backdrop-blur">
        <div className="max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
            {activeTabConfig.icon}
            {activeTabConfig.label}
          </div>

          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
            {activeTabConfig.label === "Dostępne"
              ? "Raporty dostępne do odblokowania"
              : "Twoje odblokowane raporty"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#6b7280]">
            {activeTabConfig.description}
          </p>
        </div>
      </header>

      <div
        id={getReportTabPanelId(activeTab)}
        role="tabpanel"
        aria-labelledby={getReportTabButtonId(activeTab)}
        className="min-h-[240px]"
      >
        {activeTab === "purchase" ? purchaseSlot : null}
        {activeTab === "owned" ? ownedSlot : null}
      </div>
    </section>
  );
}