// features/report-access/components/unlock-report-access-page.tsx
import Link from "next/link";

import { requireSession } from "@/server/auth/require-session";
import { Button } from "@/components/ui/button";

import {
  getActiveReportAccessGrantForSession,
  getReportAccessOfferForCompletedSession,
} from "../api/report-access.queries";

import { UnlockReportAccessPlaceholderForm } from "./unlock-report-access-placeholder-form";

type UnlockReportAccessPageProps = {
  tenantSlug: string;
  sessionId: string;
};

type ExtendedReportVersion = {
  reportTemplateId: string;
  reportTemplateVersionId: string;
  reportTemplateName?: string | null;
  reportTemplateCode?: string | null;
  reportTemplateVersionName?: string | null;
  reportTemplateVersion?: string | null;

  questionnaireName?: string | null;
  questionnaireVersionName?: string | null;
  questionnaireVersion?: string | null;
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

function formatReportVersionLabel(reportVersion: ExtendedReportVersion) {
  const name = reportVersion.reportTemplateVersionName;
  const version = reportVersion.reportTemplateVersion;

  if (name && version) {
    return `${name} (${version})`;
  }

  return name ?? version ?? "—";
}

function formatQuestionnaireLabel(reportVersion: ExtendedReportVersion) {
  const name = reportVersion.questionnaireName;
  const versionName = reportVersion.questionnaireVersionName;
  const version = reportVersion.questionnaireVersion;

  if (name && versionName && version) {
    return `${name} · ${versionName} (${version})`;
  }

  if (name && versionName) {
    return `${name} · ${versionName}`;
  }

  return name ?? versionName ?? version ?? "—";
}

export async function UnlockReportAccessPage({
  tenantSlug,
  sessionId,
}: UnlockReportAccessPageProps) {
  const authSession = await requireSession();

  const offer = await getReportAccessOfferForCompletedSession({
    tenantSlug,
    sessionId,
  });

  if (!offer.ok) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
        <section className="rounded-2xl border bg-card p-8">
          <div className="text-sm font-medium text-muted-foreground">
            HUMANET VALUES
          </div>

          <h1 className="mt-4 text-3xl font-semibold">
            Nie można odblokować raportu
          </h1>

          <p className="mt-4 text-muted-foreground">{offer.message}</p>

          <Button asChild variant="outline" className="mt-6">
            <Link href="/my/assessment">Wróć do moich badań</Link>
          </Button>
        </section>
      </main>
    );
  }

  const reportVersion = offer.reportVersion as ExtendedReportVersion;

  const existingGrant =
    offer.existingGrant ??
    (await getActiveReportAccessGrantForSession({
      tenantSlug,
      sessionId,
      reportTemplateVersionId: reportVersion.reportTemplateVersionId,
      userId: authSession.user.id,
    }));

  if (existingGrant) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6">
        <section className="rounded-2xl border bg-card p-8">
          <div className="text-sm font-medium text-muted-foreground">
            HUMANET VALUES
          </div>

          <h1 className="mt-4 text-3xl font-semibold">
            Raport jest już odblokowany
          </h1>

          <p className="mt-4 text-muted-foreground">
            Masz aktywny dostęp do tego raportu. Możesz przejść bezpośrednio do
            podglądu.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild>
              <Link
                href={`/my/assessment/sessions/${sessionId}/report/${existingGrant.reportTemplateVersionId}?tenant=${tenantSlug}`}
              >
                Zobacz raport
              </Link>
            </Button>

            <Button asChild variant="outline">
              <Link
                href={`/my/assessment/sessions/${sessionId}/completed?tenant=${tenantSlug}`}
              >
                Wróć do wyniku
              </Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  const product = offer.product;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <section className="rounded-2xl border bg-card p-6 md:p-8">
        <div className="text-sm font-medium text-muted-foreground">
          HUMANET VALUES
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Odblokuj raport</h1>

            <p className="mt-3 max-w-2xl text-muted-foreground">
              Ten raport wymaga aktywnego dostępu. Na tym etapie używamy
              placeholdera płatności — kliknięcie przycisku zasymuluje opłacenie
              dostępu i zapisze dostęp do tej konkretnej wersji raportu.
            </p>
          </div>

          <Button asChild variant="outline">
            <Link
              href={`/my/assessment/sessions/${sessionId}/completed?tenant=${tenantSlug}`}
            >
              Wróć do wyniku
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="text-xs uppercase text-muted-foreground">
              Raport
            </div>

            <div className="mt-1 font-medium">
              {reportVersion.reportTemplateName ??
                reportVersion.reportTemplateVersionName ??
                "Raport"}
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              Wersja: {formatReportVersionLabel(reportVersion)}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="text-xs uppercase text-muted-foreground">
              Kwestionariusz
            </div>

            <div className="mt-1 font-medium">
              {formatQuestionnaireLabel(reportVersion)}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="text-xs uppercase text-muted-foreground">
              Cena
            </div>

            <div className="mt-1 text-2xl font-semibold">
              {product
                ? formatMoney({
                    amount: product.priceGross,
                    currency: product.currency,
                  })
                : "—"}
            </div>

            {product ? (
              <div className="mt-1 text-xs text-muted-foreground">
                Brutto, VAT {product.vatRate ?? "—"}%
              </div>
            ) : null}
          </div>
        </div>

        {!product ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Dla tego raportu nie ma jeszcze aktywnego produktu sprzedażowego.
            Utwórz produkt raportowy w panelu administracyjnym i ustaw jego
            status na active.
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border bg-background p-5">
            <h2 className="text-lg font-semibold">Placeholder płatności</h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Docelowo tutaj pojawi się integracja z bramką płatniczą oraz dane
              do faktury. Na teraz przycisk poniżej tworzy opłacone zamówienie i
              aktywny dostęp do raportu.
            </p>

            <UnlockReportAccessPlaceholderForm
              tenantSlug={tenantSlug}
              sessionId={sessionId}
            />
          </div>
        )}
      </section>
    </main>
  );
}