import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/shared/ui";

import {
  getNormativeProfileLabel,
  getNormativeProfileLabels,
} from "../lib/normative-profile-labels";
import type { NormativeProfileAdminDetailDto } from "../types/normative-admin.types";
import { NormativeProfileExclusionControl } from "./normative-profile-exclusion-control";

// @humanet-normative-admin-v1_1_2-r2-detail

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b py-3 sm:grid-cols-[240px_1fr]">
      <dt className="text-sm text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium">
        {value ?? "—"}
      </dd>
    </div>
  );
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

function boolLabel(
  value: boolean | null,
) {
  if (value === true) {
    return "Tak";
  }

  if (value === false) {
    return "Nie";
  }

  return "—";
}

function countryLabel(
  value: string,
) {
  return value === "PL"
    ? "Polska (PL)"
    : value;
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
    : "—";
}

// @humanet-normative-work-situation-v1_2-admin-detail
function currentSituationValue(profile: NormativeProfileAdminDetailDto) {
  if (profile.workSituation) return enumLabel("workSituation", profile.workSituation);
  if (profile.workedLastWeek === true) return "Historyczny profil v1.1: pracował(a) w okresie referencyjnym 7 dni";
  if (profile.workedLastWeek === false && profile.hasJobTemporaryAbsence === true) return "Historyczny profil v1.1: czasowa nieobecność w pracy";
  if (profile.workedLastWeek === false && profile.hasJobTemporaryAbsence === false) return "Historyczny profil v1.1: niepracujący(a)";
  return "Nieustalone";
}

function workingLabel(
  profile: NormativeProfileAdminDetailDto,
) {
  if (
    profile.isWorkingForNorms === true
  ) {
    return "Tak — kwalifikuje się jako osoba pracująca";
  }

  if (
    profile.isWorkingForNorms === false
  ) {
    return "Nie — nie kwalifikuje się jako osoba pracująca";
  }

  if (
    profile.employmentStatus ===
      "employed" ||
    profile.employmentStatus ===
      "self_employed"
  ) {
    return "Prawdopodobnie tak — profil v1.0, brak screenera v1.1";
  }

  if (
    profile.employmentStatus ===
      "unemployed" ||
    profile.employmentStatus ===
      "retired"
  ) {
    return "Prawdopodobnie nie — profil v1.0, brak screenera v1.1";
  }

  return "Nieustalone — brak pełnego screenera";
}

function absenceLabel(
  profile: NormativeProfileAdminDetailDto,
) {
  if (
    profile.workedLastWeek === true
  ) {
    return "Nie dotyczy";
  }

  return boolLabel(
    profile.hasJobTemporaryAbsence,
  );
}

function ownershipValue(
  profile: NormativeProfileAdminDetailDto,
) {
  if (profile.ownershipSector) {
    return enumLabel(
      "ownershipSector",
      profile.ownershipSector,
    );
  }

  return profile.employmentSector
    ? `Legacy: ${enumLabel(
        "employmentSector",
        profile.employmentSector,
      )}`
    : "—";
}

function industryValue(
  profile: NormativeProfileAdminDetailDto,
) {
  if (profile.industrySection) {
    return enumLabel(
      "industrySection",
      profile.industrySection,
    );
  }

  return profile.industryCode
    ? `Legacy: ${enumLabel(
        "industry",
        profile.industryCode,
      )}`
    : "—";
}

function employmentFormValue(
  profile: NormativeProfileAdminDetailDto,
) {
  if (profile.employmentForm) {
    return enumLabel(
      "employmentForm",
      profile.employmentForm,
    );
  }

  return profile.employmentStatus
    ? `Legacy: ${enumLabel(
        "employmentStatus",
        profile.employmentStatus,
      )}`
    : "—";
}

export function NormativeProfileAdminDetail({
  profile,
}: {
  profile: NormativeProfileAdminDetailDto;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profil normatywny"
        description="Globalny profil użytkownika i jego powiązania ze wszystkimi tenantami."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <NormativeProfileExclusionControl
              profileId={
                profile.profileId
              }
              excludedFromNorms={
                profile.excludedFromNorms
              }
            />

            <Button
              asChild
              variant="outline"
            >
              <Link href="/dashboard/normative-data">
                Wróć
              </Link>
            </Button>
          </div>
        }
      />

      <Card
        className={
          profile.excludedFromNorms
            ? "border-destructive/40"
            : undefined
        }
      >
        <CardHeader>
          <CardTitle>
            Status w danych normatywnych
          </CardTitle>
        </CardHeader>

        <CardContent>
          <dl>
            <Row
              label="Status"
              value={
                profile.excludedFromNorms ? (
                  <Badge variant="destructive">
                    Wyłączony z dalszych analiz
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    Włączony do analiz
                  </Badge>
                )
              }
            />

            {profile.excludedFromNorms ? (
              <>
                <Row
                  label="Powód wyłączenia"
                  value={
                    profile.normativeExclusionReason
                  }
                />
                <Row
                  label="Wyłączono"
                  value={
                    profile.normativeExcludedAt
                  }
                />
                <Row
                  label="SUPER_ADMIN"
                  value={
                    profile.normativeExcludedByUserId ? (
                      <span className="font-mono text-xs">
                        {
                          profile.normativeExcludedByUserId
                        }
                      </span>
                    ) : (
                      "—"
                    )
                  }
                />
              </>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Użytkownik i profil
          </CardTitle>
        </CardHeader>

        <CardContent>
          <dl>
            <Row
              label="Użytkownik"
              value={`${profile.ownerName ?? "—"} (${profile.ownerEmail})`}
            />
            <Row
              label="ID użytkownika"
              value={
                <span className="font-mono text-xs">
                  {profile.ownerUserId}
                </span>
              }
            />
            <Row
              label="ID profilu"
              value={
                <span className="font-mono text-xs">
                  {profile.profileId}
                </span>
              }
            />
            <Row
              label="Rewizja"
              value={profile.revision}
            />
            <Row
              label="Wersja schematu"
              value={
                profile.schemaVersion
              }
            />
            <Row
              label="Wersja słownika"
              value={
                profile.dictionaryVersion
              }
            />
            <Row
              label="Kanał rekrutacji"
              value={
                profile.recruitmentChannel
              }
            />
            <Row
              label="Sesje / tenanty"
              value={`${profile.sessionCount} / ${profile.tenantCount}`}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Dane demograficzne
          </CardTitle>
        </CardHeader>

        <CardContent>
          <dl>
            <Row
              label="Data urodzenia"
              value={
                profile.dateOfBirth
              }
            />
            <Row
              label="Rok urodzenia"
              value={
                profile.birthYear
              }
            />
            <Row
              label="Wiek w chwili badania"
              value={
                profile.ageAtAssessment ==
                null
                  ? "—"
                  : `${profile.ageAtAssessment} lat`
              }
            />
            <Row
              label="Płeć"
              value={enumLabel(
                "sex",
                profile.sex,
              )}
            />
            <Row
              label="Kraj"
              value={countryLabel(
                profile.countryCode,
              )}
            />
            <Row
              label="Województwo"
              value={enumLabel(
                "voivodeship",
                profile.voivodeshipCode,
              )}
            />
            <Row
              label="Wielkość miejscowości"
              value={enumLabel(
                "localitySize",
                profile.localitySize,
              )}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Wykształcenie
          </CardTitle>
        </CardHeader>

        <CardContent>
          <dl>
            <Row
              label="Poziom wykształcenia"
              value={enumLabel(
                "educationLevel",
                profile.educationLevel,
              )}
            />
            <Row
              label="Dziedziny wykształcenia"
              value={getNormativeProfileLabels(
                "educationField",
                profile.educationFields,
              )}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Sytuacja zawodowa
          </CardTitle>
        </CardHeader>

        <CardContent>
          <dl>
            <Row
              label="Obecna sytuacja zawodowa"
              value={currentSituationValue(profile)}
            />
            <Row
              label="Kwalifikacja „Pracujący”"
              value={workingLabel(
                profile,
              )}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Główna praca
          </CardTitle>
        </CardHeader>

        <CardContent>
          <dl>
            <Row
              label="Forma pracy"
              value={employmentFormValue(
                profile,
              )}
            />
            <Row
              label="Wymiar pracy"
              value={enumLabel(
                "workTime",
                profile.workTime,
              )}
            />
            <Row
              label="Klasyfikacja branży"
              value={
                profile.industryClassification ??
                "—"
              }
            />
            <Row
              label="Branża"
              value={industryValue(
                profile,
              )}
            />
            <Row
              label="Grupa zawodowa"
              value={enumLabel(
                "occupationMajorGroup",
                profile.occupationMajorGroup,
              )}
            />
            <Row
              label="Poziom stanowiska"
              value={enumLabel(
                "jobLevel",
                profile.jobLevel,
              )}
            />
            <Row
              label="Obszar funkcjonalny"
              value={enumLabel(
                "jobFunction",
                profile.jobFunction,
              )}
            />
            <Row
              label="Zarządzanie ludźmi"
              value={
                profile.isWorkingForNorms ===
                false
                  ? "Nie dotyczy"
                  : boolLabel(
                      profile.managesPeople,
                    )
              }
            />
            <Row
              label="Wielkość organizacji"
              value={enumLabel(
                "organizationSize",
                profile.organizationSize,
              )}
            />
            <Row
              label="Sektor własności"
              value={ownershipValue(
                profile,
              )}
            />
            <Row
              label="Staż w obecnej pracy"
              value={enumLabel(
                "organizationTenure",
                profile.organizationTenure,
              )}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Pola legacy
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Zachowane dla audytowalności
            wcześniejszych profili i
            kompatybilności ze schematem v1.0.
          </p>

          <dl>
            <Row label="Praca w okresie 7 dni (v1.1)" value={boolLabel(profile.workedLastWeek)} />
            <Row label="Czasowa nieobecność (v1.1)" value={absenceLabel(profile)} />
            <Row
              label="Status zawodowy"
              value={enumLabel(
                "employmentStatus",
                profile.employmentStatus,
              )}
            />
            <Row
              label="Branża HUMANET"
              value={enumLabel(
                "industry",
                profile.industryCode,
              )}
            />
            <Row
              label="Sektor"
              value={enumLabel(
                "employmentSector",
                profile.employmentSector,
              )}
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Zgoda i nagroda
          </CardTitle>
        </CardHeader>

        <CardContent>
          <dl>
            <Row
              label="Zgoda"
              value={
                profile.consentWithdrawnAt
                  ? "Wycofana"
                  : "Aktywna"
              }
            />
            <Row
              label="Wersja zgody"
              value={
                profile.consentVersion
              }
            />
            <Row
              label="Status nagrody"
              value={rewardLabel(
                profile.rewardStatus,
              )}
            />
            <Row
              label="Kod"
              value={
                profile.discountCodePreview
              }
            />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
