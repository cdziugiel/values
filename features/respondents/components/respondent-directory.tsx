// @humanet-respondent-directory-v1
// features/respondents/components/respondent-directory.tsx

"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  Clock3,
  Mail,
  Phone,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type {
  RespondentListItem,
  RespondentOrganizationOption,
  RespondentUnitOption,
} from "../types/respondent.types";
import { RespondentRowActions } from "./respondent-row-actions";

type RespondentDirectoryProps = {
  tenantSlug: string;
  respondents: RespondentListItem[];
  organizations: RespondentOrganizationOption[];
  units: RespondentUnitOption[];
  canManage: boolean;
};

type RespondentSort =
  | "name_asc"
  | "email_asc"
  | "organization_asc"
  | "created_desc"
  | "created_asc";

type RespondentTypeFilter = "all" | "leader" | "team";

const selectClassName =
  "h-10 min-w-0 rounded-xl border border-black/10 bg-white px-3 text-sm text-[#171717] outline-none transition focus:border-[#2dd4bf] focus:ring-2 focus:ring-[rgba(45,212,191,0.18)]";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLocaleLowerCase("pl-PL");
}

function getRespondentName({
  firstName,
  lastName,
  email,
}: Pick<RespondentListItem, "firstName" | "lastName" | "email">) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return fullName || email || "—";
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function respondentSearchText(respondent: RespondentListItem) {
  return normalize(
    [
      respondent.firstName,
      respondent.lastName,
      respondent.email,
      respondent.externalCode,
      respondent.clientOrganizationName,
      respondent.clientUnitName,
      respondent.clientUnitRole,
      respondent.phone,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function compareNullableText(a: string | null, b: string | null) {
  return (a ?? "").localeCompare(b ?? "", "pl", {
    sensitivity: "base",
    numeric: true,
  });
}

export function RespondentDirectory({
  tenantSlug,
  respondents,
  organizations,
  units,
  canManage,
}: RespondentDirectoryProps) {
  const [query, setQuery] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [typeFilter, setTypeFilter] =
    useState<RespondentTypeFilter>("all");
  const [sort, setSort] = useState<RespondentSort>("name_asc");

  const availableUnits = useMemo(() => {
    if (!organizationId) return units;

    return units.filter(
      (unit) => unit.clientOrganizationId === organizationId,
    );
  }, [organizationId, units]);

  const visibleRespondents = useMemo(() => {
    const normalizedQuery = normalize(query);

    const rows = respondents.filter((respondent) => {
      if (
        normalizedQuery &&
        !respondentSearchText(respondent).includes(normalizedQuery)
      ) {
        return false;
      }

      if (
        organizationId &&
        respondent.clientOrganizationId !== organizationId
      ) {
        return false;
      }

      if (unitId && respondent.clientUnitId !== unitId) {
        return false;
      }

      if (typeFilter === "leader" && !respondent.isLeader) {
        return false;
      }

      if (typeFilter === "team" && respondent.isLeader) {
        return false;
      }

      return true;
    });

    return [...rows].sort((a, b) => {
      if (sort === "email_asc") {
        return compareNullableText(a.email, b.email);
      }

      if (sort === "organization_asc") {
        const organizationComparison = compareNullableText(
          a.clientOrganizationName,
          b.clientOrganizationName,
        );

        if (organizationComparison !== 0) {
          return organizationComparison;
        }

        return getRespondentName(a).localeCompare(
          getRespondentName(b),
          "pl",
          { sensitivity: "base", numeric: true },
        );
      }

      if (sort === "created_desc" || sort === "created_asc") {
        const aTime = a.createdAt.getTime();
        const bTime = b.createdAt.getTime();

        return sort === "created_desc" ? bTime - aTime : aTime - bTime;
      }

      return getRespondentName(a).localeCompare(
        getRespondentName(b),
        "pl",
        { sensitivity: "base", numeric: true },
      );
    });
  }, [
    organizationId,
    query,
    respondents,
    sort,
    typeFilter,
    unitId,
  ]);

  const hasFilters =
    Boolean(query.trim()) ||
    Boolean(organizationId) ||
    Boolean(unitId) ||
    typeFilter !== "all" ||
    sort !== "name_asc";

  function resetFilters() {
    setQuery("");
    setOrganizationId("");
    setUnitId("");
    setTypeFilter("all");
    setSort("name_asc");
  }

  if (respondents.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-8 text-sm leading-6 text-[#6b7280]">
        Brak respondentów. Dodaj pierwszą osobę, aby móc przypisywać ją
        do projektów badawczych.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.5rem] border border-black/10 bg-white/65 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
          <SlidersHorizontal size={14} />
          Wyszukiwanie i filtry
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.4fr)_repeat(4,minmax(150px,0.7fr))]">
          <label className="relative block">
            <span className="sr-only">Szukaj respondentów</span>
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9099]"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Szukaj po nazwie, emailu, kodzie, roli…"
              className="h-10 rounded-xl border-black/10 bg-white pl-9"
            />
          </label>

          <label className="grid gap-1">
            <span className="sr-only">Organizacja</span>
            <select
              className={selectClassName}
              value={organizationId}
              onChange={(event) => {
                const nextOrganizationId = event.target.value;
                setOrganizationId(nextOrganizationId);

                if (
                  unitId &&
                  !units.some(
                    (unit) =>
                      unit.id === unitId &&
                      (!nextOrganizationId ||
                        unit.clientOrganizationId === nextOrganizationId),
                  )
                ) {
                  setUnitId("");
                }
              }}
            >
              <option value="">Wszystkie organizacje</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="sr-only">Jednostka</span>
            <select
              className={selectClassName}
              value={unitId}
              onChange={(event) => setUnitId(event.target.value)}
            >
              <option value="">Wszystkie jednostki</option>
              {availableUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="sr-only">Typ respondenta</span>
            <select
              className={selectClassName}
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as RespondentTypeFilter)
              }
            >
              <option value="all">Liderzy i zespół</option>
              <option value="leader">Tylko liderzy</option>
              <option value="team">Tylko zespół</option>
            </select>
          </label>

          <label className="relative grid gap-1">
            <span className="sr-only">Sortowanie</span>
            <ArrowUpDown
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8b9099]"
            />
            <select
              className={`${selectClassName} pl-8`}
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as RespondentSort)
              }
            >
              <option value="name_asc">Nazwa A–Z</option>
              <option value="email_asc">Email A–Z</option>
              <option value="organization_asc">Organizacja A–Z</option>
              <option value="created_desc">Najnowsi</option>
              <option value="created_asc">Najstarsi</option>
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
          <p className="mt-1 text-sm text-[#6b7280]">
            Zmień wyszukiwaną frazę albo wyczyść filtry.
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
        <>
          <div className="grid gap-4 lg:hidden">
            {visibleRespondents.map((respondent) => (
              <article
                key={respondent.id}
                className="rounded-[1.5rem] border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold tracking-[-0.02em] text-[#171717]">
                      {getRespondentName(respondent)}
                    </h3>

                    <p className="mt-1 truncate font-mono text-xs text-[#6b7280]">
                      {respondent.email ?? respondent.externalCode ?? "—"}
                    </p>
                  </div>

                  {respondent.externalCode ? (
                    <Badge
                      variant="outline"
                      className="shrink-0 rounded-full border-black/10 bg-white/70 font-mono text-[#6b7280]"
                    >
                      {respondent.externalCode}
                    </Badge>
                  ) : null}
                </div>

                <dl className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6b7280]">Organizacja</dt>
                    <dd className="text-right font-medium text-[#171717]">
                      {respondent.clientOrganizationName ?? "—"}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6b7280]">Jednostka</dt>
                    <dd className="text-right font-medium text-[#171717]">
                      {respondent.clientUnitName ?? "—"}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6b7280]">Rola</dt>
                    <dd className="text-right font-medium text-[#171717]">
                      {respondent.clientUnitRole ?? "member"}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6b7280]">Typ</dt>
                    <dd className="text-right font-medium text-[#171717]">
                      {respondent.isLeader ? "Lider" : "Zespół"}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6b7280]">Telefon</dt>
                    <dd className="text-right font-medium text-[#171717]">
                      {respondent.phone ?? "—"}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-[#6b7280]">Utworzono</dt>
                    <dd className="text-right text-[#171717]">
                      {formatDate(respondent.createdAt)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5">
                  <RespondentRowActions
                    tenantSlug={tenantSlug}
                    respondent={respondent}
                    organizations={organizations}
                    units={units}
                    canManage={canManage}
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70 lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Respondent</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Kod</th>
                    <th className="px-4 py-3 font-semibold">Organizacja</th>
                    <th className="px-4 py-3 font-semibold">Jednostka</th>
                    <th className="px-4 py-3 font-semibold">Rola</th>
                    <th className="px-4 py-3 font-semibold">Typ</th>
                    <th className="px-4 py-3 font-semibold">Telefon</th>
                    <th className="px-4 py-3 font-semibold">Utworzono</th>
                    <th className="px-4 py-3 font-semibold">Akcje</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleRespondents.map((respondent) => (
                    <tr
                      key={respondent.id}
                      className="border-b border-black/10 last:border-0"
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#171717]">
                          {getRespondentName(respondent)}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-[#171717]">
                        {respondent.email ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Mail size={13} className="text-[#8b9099]" />
                            {respondent.email}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-4 py-4">
                        {respondent.externalCode ? (
                          <Badge
                            variant="outline"
                            className="rounded-full border-black/10 bg-white/70 font-mono text-[#6b7280]"
                          >
                            {respondent.externalCode}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-4 py-4 text-[#171717]">
                        {respondent.clientOrganizationName ?? "—"}
                      </td>

                      <td className="px-4 py-4 text-[#171717]">
                        {respondent.clientUnitName ?? "—"}
                      </td>

                      <td className="px-4 py-4 text-[#171717]">
                        {respondent.clientUnitRole ?? "member"}
                      </td>

                      <td className="px-4 py-4">
                        <Badge
                          variant="outline"
                          className={[
                            "rounded-full border-black/10 bg-white/70",
                            respondent.isLeader
                              ? "text-[#0f766e]"
                              : "text-[#6b7280]",
                          ].join(" ")}
                        >
                          {respondent.isLeader ? "Lider" : "Zespół"}
                        </Badge>
                      </td>

                      <td className="px-4 py-4 text-[#171717]">
                        {respondent.phone ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone size={13} className="text-[#8b9099]" />
                            {respondent.phone}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td className="px-4 py-4 text-[#6b7280]">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={13} />
                          {formatDate(respondent.createdAt)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <RespondentRowActions
                          tenantSlug={tenantSlug}
                          respondent={respondent}
                          organizations={organizations}
                          units={units}
                          canManage={canManage}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
