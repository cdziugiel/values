import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/shared/ui";

import { getNormativeProfileLabel } from "../lib/normative-profile-labels";
import type {
  NormativeProfilesAdminFilters,
  NormativeProfilesAdminPageDto,
} from "../types/normative-admin.types";

// @humanet-normative-admin-v1_1_2-r2-page

function href(
  filters: NormativeProfilesAdminFilters,
  page: number,
) {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set("query", filters.query);
  }

  if (
    filters.consentStatus &&
    filters.consentStatus !== "all"
  ) {
    params.set(
      "consentStatus",
      filters.consentStatus,
    );
  }

  if (
    filters.rewardStatus &&
    filters.rewardStatus !== "all"
  ) {
    params.set(
      "rewardStatus",
      filters.rewardStatus,
    );
  }

  if (
    filters.inclusionStatus &&
    filters.inclusionStatus !== "all"
  ) {
    params.set(
      "inclusionStatus",
      filters.inclusionStatus,
    );
  }

  params.set("page", String(page));

  return `/dashboard/normative-data?${params.toString()}`;
}

function enumLabel(
  kind: Parameters<
    typeof getNormativeProfileLabel
  >[0],
  value: string | null | undefined,
) {
  return getNormativeProfileLabel(
    kind,
    value,
  );
}

function countryLabel(
  value: string | null | undefined,
) {
  if (value === "PL") {
    return "Polska";
  }

  return value || "—";
}

function rewardLabel(
  value: string | null,
) {
  const labels: Record<string, string> = {
    pending: "Oczekuje",
    issued: "Wydana",
    redeemed: "Wykorzystana",
    expired: "Wygasła",
    revoked: "Cofnięta",
  };

  return value
    ? labels[value] ?? value
    : null;
}

// @humanet-normative-work-situation-v1_2-admin-page
function currentSituationLabel(row: { workSituation: string | null; workedLastWeek: boolean | null; hasJobTemporaryAbsence: boolean | null; employmentStatus: string | null }) {
  if (row.workSituation) return enumLabel("workSituation", row.workSituation);
  if (row.workedLastWeek === true) return "Historycznie: pracował(a) w okresie 7 dni";
  if (row.workedLastWeek === false && row.hasJobTemporaryAbsence === true) return "Historycznie: czasowa nieobecność w pracy";
  if (row.workedLastWeek === false && row.hasJobTemporaryAbsence === false) return "Historycznie: niepracujący(a)";
  return row.employmentStatus ? `Legacy: ${enumLabel("employmentStatus", row.employmentStatus)}` : "—";
}

function workingLabel(
  row: {
    isWorkingForNorms: boolean | null;
    employmentStatus: string | null;
  },
) {
  if (row.isWorkingForNorms === true) {
    return "Pracujący";
  }

  if (row.isWorkingForNorms === false) {
    return "Niepracujący";
  }

  if (
    row.employmentStatus === "employed" ||
    row.employmentStatus === "self_employed"
  ) {
    return "Pracujący · profil v1.0";
  }

  if (
    row.employmentStatus === "unemployed" ||
    row.employmentStatus === "retired"
  ) {
    return "Niepracujący · profil v1.0";
  }

  return "Nieustalone";
}

function workFormLabel(
  row: {
    employmentForm: string | null;
    employmentStatus: string | null;
  },
) {
  if (row.employmentForm) {
    return enumLabel(
      "employmentForm",
      row.employmentForm,
    );
  }

  return row.employmentStatus
    ? `Legacy: ${enumLabel(
        "employmentStatus",
        row.employmentStatus,
      )}`
    : "—";
}

function industryLabel(
  row: {
    industrySection: string | null;
    industryCode: string | null;
  },
) {
  if (row.industrySection) {
    return enumLabel(
      "industrySection",
      row.industrySection,
    );
  }

  return row.industryCode
    ? `Legacy: ${enumLabel(
        "industry",
        row.industryCode,
      )}`
    : "—";
}

function ownershipLabel(
  row: {
    ownershipSector: string | null;
    employmentSector: string | null;
  },
) {
  if (row.ownershipSector) {
    return enumLabel(
      "ownershipSector",
      row.ownershipSector,
    );
  }

  return row.employmentSector
    ? `Legacy: ${enumLabel(
        "employmentSector",
        row.employmentSector,
      )}`
    : "—";
}

function managesPeopleLabel(
  value: boolean | null,
) {
  if (value === true) {
    return "Zarządza";
  }

  if (value === false) {
    return "Nie zarządza";
  }

  return "—";
}

export function NormativeProfilesAdminPage({
  data,
  filters,
}: {
  data: NormativeProfilesAdminPageDto;
  filters: NormativeProfilesAdminFilters;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dane normatywne"
        description="Globalny rejestr profili statystycznych użytkowników ze wszystkich tenantów. Dostęp wyłącznie dla SUPER_ADMIN."
      />

      <Card>
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>
              Profile użytkowników
            </CardTitle>

            <p className="mt-1 text-sm text-muted-foreground">
              Łącznie: {data.total}
            </p>
          </div>

          <Button
            asChild
            variant="outline"
          >
            <a href="/dashboard/normative-data/export">
              Eksport XLSX + legenda
            </a>
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_210px_210px_190px_auto]">
            <Input
              name="query"
              defaultValue={
                filters.query ?? ""
              }
              placeholder="E-mail, nazwa, ID profilu lub użytkownika"
            />

            <select
              name="consentStatus"
              defaultValue={
                filters.consentStatus ??
                "all"
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">
                Wszystkie zgody
              </option>
              <option value="active">
                Zgoda aktywna
              </option>
              <option value="withdrawn">
                Zgoda wycofana
              </option>
            </select>

            <select
              name="rewardStatus"
              defaultValue={
                filters.rewardStatus ??
                "all"
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">
                Wszystkie nagrody
              </option>
              <option value="pending">
                Oczekuje
              </option>
              <option value="issued">
                Wydana
              </option>
              <option value="redeemed">
                Wykorzystana
              </option>
              <option value="expired">
                Wygasła
              </option>
              <option value="revoked">
                Cofnięta
              </option>
            </select>

            <select
              name="inclusionStatus"
              defaultValue={
                filters.inclusionStatus ??
                "all"
              }
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label="Status w danych normatywnych"
            >
              <option value="all">
                Wszystkie rekordy
              </option>
              <option value="included">
                Włączone do analiz
              </option>
              <option value="excluded">
                Wyłączone z analiz
              </option>
            </select>

            <Button type="submit">
              Filtruj
            </Button>
          </form>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[2200px] text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3">
                    Użytkownik
                  </th>
                  <th className="px-4 py-3">
                    Profil
                  </th>
                  <th className="px-4 py-3">
                    Do analiz
                  </th>
                  <th className="px-4 py-3">
                    Demografia
                  </th>
                  <th className="px-4 py-3">
                    Wykształcenie
                  </th>
                  <th className="px-4 py-3">
                    Praca
                  </th>
                  <th className="px-4 py-3">
                    Stanowisko
                  </th>
                  <th className="px-4 py-3">
                    Organizacja
                  </th>
                  <th className="px-4 py-3">
                    Źródło
                  </th>
                  <th className="px-4 py-3">
                    Sesje
                  </th>
                  <th className="px-4 py-3">
                    Zgoda
                  </th>
                  <th className="px-4 py-3">
                    Rabat
                  </th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.profileId}
                    className={
                      row.excludedFromNorms
                        ? "border-t bg-destructive/5 align-top"
                        : "border-t align-top"
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {row.ownerName ?? "—"}
                      </div>
                      <div className="text-muted-foreground">
                        {row.ownerEmail}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-mono text-xs">
                        {row.profileId}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        rew. {row.revision} ·{" "}
                        schema {row.schemaVersion}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {row.excludedFromNorms ? (
                        <Badge variant="destructive">
                          Wyłączony
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Włączony
                        </Badge>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div>
                        {row.ageAtAssessment ??
                          "—"}{" "}
                        lat ·{" "}
                        {enumLabel(
                          "sex",
                          row.sex,
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {countryLabel(
                          row.countryCode,
                        )}{" "}
                        ·{" "}
                        {enumLabel(
                          "voivodeship",
                          row.voivodeshipCode,
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {enumLabel(
                          "localitySize",
                          row.localitySize,
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div>
                        {enumLabel(
                          "educationLevel",
                          row.educationLevel,
                        )}
                      </div>

                      {row.educationFields.length >
                      0 ? (
                        <div className="text-muted-foreground">
                          {row.educationFields
                            .map((value) =>
                              enumLabel(
                                "educationField",
                                value,
                              ),
                            )
                            .join(", ")}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {currentSituationLabel(row)}
                      </div>
                      <div className="text-muted-foreground">
                        Normy: {workingLabel(row)}
                      </div>
                      <div className="text-muted-foreground">
                        {workFormLabel(row)}
                      </div>
                      <div className="text-muted-foreground">
                        {enumLabel(
                          "workTime",
                          row.workTime,
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {industryLabel(row)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div>
                        {enumLabel(
                          "occupationMajorGroup",
                          row.occupationMajorGroup,
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {enumLabel(
                          "jobLevel",
                          row.jobLevel,
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {enumLabel(
                          "jobFunction",
                          row.jobFunction,
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {managesPeopleLabel(
                          row.managesPeople,
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div>
                        {enumLabel(
                          "organizationSize",
                          row.organizationSize,
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        {ownershipLabel(row)}
                      </div>
                      <div className="text-muted-foreground">
                        {enumLabel(
                          "organizationTenure",
                          row.organizationTenure,
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {row.recruitmentChannel}
                    </td>

                    <td className="px-4 py-3">
                      {row.sessionCount} sesji
                      <br />
                      <span className="text-muted-foreground">
                        {row.tenantCount} tenantów
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      {row.consentWithdrawnAt ? (
                        <Badge variant="destructive">
                          Wycofana
                        </Badge>
                      ) : (
                        <Badge>
                          Aktywna
                        </Badge>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {row.rewardStatus ? (
                        <>
                          <Badge variant="outline">
                            {rewardLabel(
                              row.rewardStatus,
                            )}
                          </Badge>
                          <div className="mt-1 font-mono text-xs">
                            {row.discountCodePreview ??
                              "—"}
                          </div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                      >
                        <Link
                          href={`/dashboard/normative-data/${row.profileId}`}
                        >
                          Szczegóły
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between">
            <Button
              asChild
              variant="outline"
              disabled={data.page <= 1}
            >
              <Link
                href={href(
                  filters,
                  Math.max(
                    1,
                    data.page - 1,
                  ),
                )}
              >
                Poprzednia
              </Link>
            </Button>

            <span className="text-sm text-muted-foreground">
              Strona {data.page} z{" "}
              {data.pageCount}
            </span>

            <Button
              asChild
              variant="outline"
              disabled={
                data.page >= data.pageCount
              }
            >
              <Link
                href={href(
                  filters,
                  Math.min(
                    data.pageCount,
                    data.page + 1,
                  ),
                )}
              >
                Następna
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
