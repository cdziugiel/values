"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarCheck2, FileText, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatReportDateTime } from "../lib/format-report-date";

type SessionOption = {
  id: string;
  completedAt: Date | string | null;
  assessmentProjectId: string | null;
  assessmentProjectName: string | null;
};

type MySessionReportPurchaseCardProps = {
  tenantSlug: string;
  product: {
    name: string;
    description: string | null;
    priceGross: unknown;
    currency: string | null;
  };
  reportTemplate: {
    name: string | null;
    code: string | null;
  };
  reportTemplateVersion: {
    name: string | null;
    version: string | null;
  };
  sessions: SessionOption[];
};

function formatMoney({
  amount,
  currency,
}: {
  amount: unknown;
  currency: string | null | undefined;
}) {
  const numberValue = Number(amount);

  if (!Number.isFinite(numberValue)) {
    return "—";
  }

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: currency || "PLN",
  }).format(numberValue);
}



export function MySessionReportPurchaseCard({
  tenantSlug,
  product,
  reportTemplate,
  reportTemplateVersion,
  sessions,
}: MySessionReportPurchaseCardProps) {
  const [selectedSessionId, setSelectedSessionId] = useState(
    sessions[0]?.id ?? "",
  );

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId],
  );

  const unlockHref = selectedSession
    ? `/my/assessment/sessions/${selectedSession.id}/unlock-report?tenant=${encodeURIComponent(
        tenantSlug,
      )}`
    : null;

  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
              {reportTemplate.name ?? product.name}
            </h3>

            <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-2.5 py-1 text-xs font-medium text-[#0f766e]">
              <ShoppingCart size={13} />
              Do zakupu
            </span>
          </div>

          <p className="max-w-3xl text-sm leading-6 text-[#6b7280]">
            {product.description ||
              "Wybierz zakończone badanie, dla którego chcesz odblokować raport. Sesje, dla których raport jest już odblokowany, nie są tutaj pokazane."}
          </p>

          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-[#171717]">
                <CalendarCheck2 size={15} />
                Zakończone badanie bez raportu
              </span>

              <select
                value={selectedSessionId}
                onChange={(event) => setSelectedSessionId(event.target.value)}
                className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
              >
{sessions.map((session) => (
  <option
    key={`${reportTemplateVersion.version ?? "version"}-${session.id}`}
    value={session.id}
  >
    {session.assessmentProjectName ?? "Badanie publiczne"} ·{" "}
    {formatReportDateTime(session.completedAt)}
  </option>
))}
              </select>
            </label>

            <div className="rounded-[1.25rem] border border-black/10 bg-white/70 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">
                Cena
              </div>

              <div className="mt-1 text-lg font-semibold text-[#171717]">
                {formatMoney({
                  amount: product.priceGross,
                  currency: product.currency,
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#6b7280]">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-[#8b9099]" />
              <span>Wersja:</span>
              <span className="font-medium text-[#171717]">
                {reportTemplateVersion.name ?? "—"}{" "}
                {reportTemplateVersion.version
                  ? `(${reportTemplateVersion.version})`
                  : ""}
              </span>
            </div>

            {reportTemplate.code ? (
              <div className="font-mono text-xs text-[#8b9099]">
                {reportTemplate.code}
              </div>
            ) : null}
          </div>
        </div>

<div className="flex md:justify-end">
  {unlockHref ? (
    <Button
      asChild
      className="w-full rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] md:w-auto"
    >
      <Link href={unlockHref}>Kup raport</Link>
    </Button>
  ) : (
    <Button
      disabled
      className="w-full rounded-full md:w-auto"
      variant="outline"
    >
      Kup raport
    </Button>
  )}
</div>
      </div>
    </article>
  );
}