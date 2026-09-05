// @humanet-respondent-directory-v1
// features/respondents/components/admin-respondent-directory.tsx

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type {
  AdminRespondentListItem,
  AdminRespondentQuestionnaireRun,
} from "../types/admin-respondent.types";

type AdminRespondentDirectoryProps = {
  respondents: AdminRespondentListItem[];
};

type ProgressFilter =
  | "all"
  | "completed"
  | "started"
  | "none";

type SortKey =
  | "tenant_name"
  | "respondent_name"
  | "created_desc"
  | "completed_desc";

const selectClassName =
  "h-10 min-w-0 rounded-xl border border-black/10 bg-white px-3 text-sm text-[#171717] outline-none transition focus:border-[#2dd4bf] focus:ring-2 focus:ring-[rgba(45,212,191,0.18)]";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("pl-PL");
}

function respondentName(respondent: AdminRespondentListItem) {
  const fullName = [respondent.firstName, respondent.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    fullName ||
    respondent.email ||
    respondent.externalCode ||
    "Bez nazwy"
  );
}

function formatDate(value: Date | string | null) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function completedCount(respondent: AdminRespondentListItem) {
  return respondent.questionnaireRuns.filter(
    (run) => run.status === "completed",
  ).length;
}

function searchableText(respondent: AdminRespondentListItem) {
  return normalize(
    [
      respondent.tenantName,
      respondent.tenantSlug,
      respondent.firstName,
      respondent.lastName,
      respondent.email,
      respondent.externalCode,
      respondent.organizationName,
      respondent.unitName,
      ...respondent.questionnaireRuns.flatMap((run) => [
        run.questionnaireName,
        run.questionnaireCode,
        run.projectName,
      ]),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function QuestionnaireStatusBadge({
  run,
}: {
  run: AdminRespondentQuestionnaireRun;
}) {
  if (run.status === "completed") {
    return (
      <Badge className="rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
        <CheckCircle2 size={13} />
        Zakończony
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="rounded-full border-blue-200 bg-blue-50 text-blue-700"
    >
      <Clock3 size={13} />
      Rozpoczęty
    </Badge>
  );
}

export function AdminRespondentDirectory({
  respondents,
}: AdminRespondentDirectoryProps) {
  const [query, setQuery] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [progressFilter, setProgressFilter] =
    useState<ProgressFilter>("all");
  const [sort, setSort] = useState<SortKey>("tenant_name");

  const tenants = useMemo(() => {
    const map = new Map<string, string>();

    for (const respondent of respondents) {
      map.set(respondent.tenantSlug, respondent.tenantName);
    }

    return Array.from(map.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pl", {
          sensitivity: "base",
          numeric: true,
        }),
      );
  }, [respondents]);

  const visibleRespondents = useMemo(() => {
    const normalizedQuery = normalize(query);

    const rows = respondents.filter((respondent) => {
      if (
        normalizedQuery &&
        !searchableText(respondent).includes(normalizedQuery)
      ) {
        return false;
      }

      if (tenantSlug && respondent.tenantSlug !== tenantSlug) {
        return false;
      }

      if (
        progressFilter === "completed" &&
        !respondent.questionnaireRuns.some(
          (run) => run.status === "completed",
        )
      ) {
        return false;
      }

      if (
        progressFilter === "started" &&
        !respondent.questionnaireRuns.some(
          (run) => run.status === "started",
        )
      ) {
        return false;
      }

      if (
        progressFilter === "none" &&
        respondent.questionnaireRuns.length > 0
      ) {
        return false;
      }

      return true;
    });

    return [...rows].sort((a, b) => {
      if (sort === "respondent_name") {
        return respondentName(a).localeCompare(
          respondentName(b),
          "pl",
          { sensitivity: "base", numeric: true },
        );
      }

      if (sort === "created_desc") {
        return b.createdAt.getTime() - a.createdAt.getTime();
      }

      if (sort === "completed_desc") {
        const difference = completedCount(b) - completedCount(a);

        if (difference !== 0) return difference;
      }

      const tenantComparison = a.tenantName.localeCompare(
        b.tenantName,
        "pl",
        { sensitivity: "base", numeric: true },
      );

      if (tenantComparison !== 0) return tenantComparison;

      return respondentName(a).localeCompare(
        respondentName(b),
        "pl",
        { sensitivity: "base", numeric: true },
      );
    });
  }, [progressFilter, query, respondents, sort, tenantSlug]);

  const hasFilters =
    Boolean(query.trim()) ||
    Boolean(tenantSlug) ||
    progressFilter !== "all" ||
    sort !== "tenant_name";

  function resetFilters() {
    setQuery("");
    setTenantSlug("");
    setProgressFilter("all");
    setSort("tenant_name");
  }

  if (respondents.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm text-[#6b7280]">
        W dostępnych bazach tenantów nie ma respondentów.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-black/10 bg-white/65 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
          <SlidersHorizontal size={14} />
          Wyszukiwanie, filtry i sortowanie
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1.5fr)_repeat(3,minmax(180px,0.8fr))]">
          <label className="relative block">
            <span className="sr-only">Szukaj respondentów</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9099]"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Szukaj respondenta, tenanta, projektu lub kwestionariusza…"
              className="h-10 rounded-xl border-black/10 bg-white pl-9"
            />
          </label>

          <label>
            <span className="sr-only">Tenant</span>
            <select
              className={`${selectClassName} w-full`}
              value={tenantSlug}
              onChange={(event) => setTenantSlug(event.target.value)}
            >
              <option value="">Wszyscy partnerzy</option>
              {tenants.map((tenant) => (
                <option key={tenant.slug} value={tenant.slug}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Postęp badania</span>
            <select
              className={`${selectClassName} w-full`}
              value={progressFilter}
              onChange={(event) =>
                setProgressFilter(
                  event.target.value as ProgressFilter,
                )
              }
            >
              <option value="all">Każdy status</option>
              <option value="completed">Ma zakończone</option>
              <option value="started">Ma rozpoczęte</option>
              <option value="none">Bez rozpoczętych</option>
            </select>
          </label>

          <label className="relative">
            <span className="sr-only">Sortowanie</span>
            <ArrowUpDown
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9099]"
            />
            <select
              className={`${selectClassName} w-full pl-8`}
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as SortKey)
              }
            >
              <option value="tenant_name">Partner → respondent</option>
              <option value="respondent_name">Respondent A–Z</option>
              <option value="created_desc">Najnowsi respondenci</option>
              <option value="completed_desc">
                Najwięcej zakończonych
              </option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#6b7280]">
            Wyświetlono{" "}
            <span className="font-semibold text-[#171717]">
              {visibleRespondents.length}
            </span>{" "}
            z {respondents.length} respondentów.
          </p>

          {hasFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="rounded-full"
            >
              <X size={15} />
              Wyczyść
            </Button>
          ) : null}
        </div>
      </div>

      {visibleRespondents.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-8 text-center">
          <p className="font-medium text-[#171717]">
            Brak respondentów spełniających wybrane kryteria.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetFilters}
            className="mt-4 rounded-full"
          >
            Wyczyść filtry
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70">
          <div className="hidden grid-cols-[minmax(260px,1.4fr)_minmax(190px,0.8fr)_minmax(230px,0.9fr)_44px] border-b border-black/10 bg-[#f7f7f8] px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280] md:grid">
            <div>Respondent</div>
            <div>Partner</div>
            <div>Kwestionariusze</div>
            <div className="text-right">Szczegóły</div>
          </div>

          {visibleRespondents.map((respondent) => {
            const completed = completedCount(respondent);
            const total = respondent.questionnaireRuns.length;

            return (
              <details
                key={`${respondent.tenantId}:${respondent.respondentId}`}
                className="group border-b border-black/10 last:border-0"
              >
                <summary className="grid cursor-pointer list-none gap-3 px-5 py-4 transition hover:bg-black/[0.025] md:grid-cols-[minmax(260px,1.4fr)_minmax(190px,0.8fr)_minmax(230px,0.9fr)_44px] md:items-center [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-[#171717]">
                      {respondentName(respondent)}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6b7280]">
                      <span>{respondent.email ?? "Brak emaila"}</span>
                      {respondent.externalCode ? (
                        <span className="font-mono">
                          {respondent.externalCode}
                        </span>
                      ) : null}
                      {respondent.organizationName ? (
                        <span>{respondent.organizationName}</span>
                      ) : null}
                      {respondent.unitName ? (
                        <span>{respondent.unitName}</span>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <Badge
                      variant="outline"
                      className="rounded-full border-black/10 bg-white/80 text-[#171717]"
                    >
                      {respondent.tenantName}
                    </Badge>
                    <div className="mt-1 font-mono text-[11px] text-[#8b9099]">
                      {respondent.tenantSlug}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex max-w-[150px] flex-wrap gap-1.5">
                      {respondent.questionnaireRuns
                        .slice(0, 6)
                        .map((run, index) => (
                          <span
                            key={`${run.projectId}:${run.questionnaireVersionId}:${index}`}
                            title={`${run.questionnaireName}: ${
                              run.status === "completed"
                                ? "zakończony"
                                : "rozpoczęty"
                            }`}
                            className={[
                              "h-4 w-4 rounded-full border",
                              run.status === "completed"
                                ? "border-[#14b8a6] bg-[#2dd4bf]"
                                : "border-blue-300 bg-blue-100",
                            ].join(" ")}
                          />
                        ))}
                      {total > 6 ? (
                        <span className="text-xs font-medium text-[#6b7280]">
                          +{total - 6}
                        </span>
                      ) : null}
                      {total === 0 ? (
                        <Circle
                          size={16}
                          className="text-[#d1d5db]"
                        />
                      ) : null}
                    </div>

                    <div className="whitespace-nowrap text-sm font-semibold text-[#171717]">
                      {completed}/{total}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <ChevronDown
                      size={18}
                      className="text-[#8b9099] transition-transform group-open:rotate-180"
                    />
                  </div>
                </summary>

                <div className="border-t border-black/10 bg-[#fbfbfc] px-5 py-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-[#171717]">
                        Sesje i kwestionariusze
                      </h3>
                      <p className="mt-1 text-sm text-[#6b7280]">
                        Sesje: {respondent.sessionsCount}. Statusy pokazują
                        faktycznie rozpoczęte lub zakończone kwestionariusze.
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className="rounded-full border-black/10 bg-white text-[#6b7280]"
                    >
                      {completed} zakończonych
                    </Badge>
                  </div>

                  {respondent.questionnaireRuns.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-black/10 bg-white p-5 text-sm text-[#6b7280]">
                      Brak rozpoczętych kwestionariuszy.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
                      <table className="w-full min-w-[920px] text-left text-sm">
                        <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.1em] text-[#6b7280]">
                          <tr>
                            <th className="px-4 py-3 font-semibold">
                              Kwestionariusz
                            </th>
                            <th className="px-4 py-3 font-semibold">
                              Projekt
                            </th>
                            <th className="px-4 py-3 font-semibold">
                              Status
                            </th>
                            <th className="px-4 py-3 font-semibold">
                              Rozpoczęto
                            </th>
                            <th className="px-4 py-3 font-semibold">
                              Zakończono
                            </th>
                            <th className="px-4 py-3 font-semibold">
                              Odpowiedzi
                            </th>
                            <th className="px-4 py-3 text-right font-semibold">
                              Akcja
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {respondent.questionnaireRuns.map(
                            (run, index) => (
                              <tr
                                key={`${run.projectId}:${run.questionnaireVersionId}:${index}`}
                                className="border-b border-black/10 last:border-0"
                              >
                                <td className="px-4 py-4">
                                  <div className="font-semibold text-[#171717]">
                                    {run.questionnaireName}
                                  </div>
                                  <div className="mt-1 text-xs text-[#6b7280]">
                                    {[
                                      run.questionnaireCode,
                                      run.questionnaireVersion
                                        ? `v${run.questionnaireVersion}`
                                        : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ") || "—"}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-[#171717]">
                                  {run.projectName ?? "—"}
                                </td>
                                <td className="px-4 py-4">
                                  <QuestionnaireStatusBadge run={run} />
                                </td>
                                <td className="px-4 py-4 text-[#6b7280]">
                                  {formatDate(run.startedAt)}
                                </td>
                                <td className="px-4 py-4 text-[#6b7280]">
                                  {formatDate(run.completedAt)}
                                </td>
                                <td className="px-4 py-4 text-[#171717]">
                                  {run.responseCount}
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <Link
                                    href={`/dashboard/partner-assessment/${encodeURIComponent(
                                      respondent.tenantSlug,
                                    )}/projects/${encodeURIComponent(
                                      run.projectId,
                                    )}`}
                                    className="inline-flex min-h-9 items-center justify-center rounded-full border border-black/10 bg-white px-3 text-xs font-semibold text-[#171717] transition hover:bg-[#f3f4f6]"
                                  >
                                    Projekt
                                  </Link>
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
