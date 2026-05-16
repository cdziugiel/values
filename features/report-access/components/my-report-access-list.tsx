import Link from "next/link";

import { Button } from "@/components/ui/button";

import { getMyReportAccesses } from "../api/my-report-access.queries";

function formatDateTime(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getSourceLabel(source: string) {
  switch (source) {
    case "purchase":
      return "Zakup";
    case "placeholder_payment":
      return "Płatność testowa";
    case "access_code":
      return "Kod dostępu";
    case "invitation":
      return "Zaproszenie";
    case "admin_grant":
      return "Nadany przez admina";
    default:
      return source;
  }
}

function getStatusLabel(access: {
  status: string;
  isCurrentlyActive: boolean;
}) {
  if (access.isCurrentlyActive) {
    return "Aktywny";
  }

  if (access.status === "revoked") {
    return "Cofnięty";
  }

  if (access.status === "expired") {
    return "Wygasły";
  }

  return access.status;
}

export async function MyReportAccessList() {
  const accesses = await getMyReportAccesses();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Moje dostępy do raportów</h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Tutaj widzisz raporty odblokowane przez zakup, kod dostępu,
          zaproszenie albo nadanie administracyjne.
        </p>
      </div>

      {accesses.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground">
          Nie masz jeszcze żadnych aktywnych dostępów do raportów.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accesses.map((access) => (
            <div
              key={access.id}
              className="flex flex-col rounded-2xl border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase text-muted-foreground">
                    {access.reportTemplateCode}
                  </div>

                  <h3 className="mt-1 font-semibold leading-6">
                    {access.reportTemplateName}
                  </h3>
                </div>

                <span
                  className={
                    access.isCurrentlyActive
                      ? "rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-800"
                      : "rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                  }
                >
                  {getStatusLabel(access)}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div>
                  Wersja:{" "}
                  <span className="font-medium text-foreground">
                    {access.reportTemplateVersionName} (
                    {access.reportTemplateVersion})
                  </span>
                </div>

                {access.productName ? (
                  <div>
                    Produkt:{" "}
                    <span className="font-medium text-foreground">
                      {access.productName}
                    </span>
                  </div>
                ) : null}

                <div>
                  Źródło:{" "}
                  <span className="font-medium text-foreground">
                    {getSourceLabel(access.source)}
                  </span>
                </div>

                <div>
                  Nadano:{" "}
                  <span className="font-medium text-foreground">
                    {formatDateTime(access.createdAt)}
                  </span>
                </div>

                <div>
                  Ważny do:{" "}
                  <span className="font-medium text-foreground">
                    {formatDateTime(access.validUntil)}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-1 items-end">
                {access.isCurrentlyActive && access.reportHref ? (
                  <Button asChild className="w-full">
                    <Link href={access.reportHref}>Zobacz raport</Link>
                  </Button>
                ) : (
                  <Button disabled className="w-full" variant="outline">
                    Brak aktywnego dostępu
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}