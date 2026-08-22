// @humanet-funnel-analytics-v1.1
import { AlertTriangle, CheckCircle2, FlaskConical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sendSuperAdminFunnelQaEventAction } from "@/features/analytics/server/superadmin-funnel-qa.action";
import { requireSuperAdmin } from "@/server/auth/require-super-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  status?: string;
  event?: string;
};

const EVENTS = [
  ["assessment_start", "Start badania"],
  ["assessment_complete", "Ukończenie badania"],
  ["join_research_program", "Dołączenie do programu badawczego"],
  ["view_basic_result", "Wyświetlenie podstawowego wyniku"],
  ["view_report", "Wyświetlenie pełnego raportu"],
] as const;

export default async function AnalyticsQaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireSuperAdmin();
  const params = await searchParams;

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-800">
            <FlaskConical className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-teal-800">SUPERADMIN · GA4 QA</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Test lejka HUMANET VALUES
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Panel wysyła wyłącznie testowe eventy analityczne. Nie zmienia odpowiedzi,
              scoringu, profilu statystycznego, płatności ani dostępu do raportów.
            </p>
          </div>
        </div>

        {params.status === "sent" ? (
          <div className="mt-6 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Event {params.event || "testowy"} został przekazany do warstwy GA4.</span>
          </div>
        ) : null}

        {params.status === "not-sent" ? (
          <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Event nie został wysłany. Najczęstsza przyczyna to brak aktywnej zgody analytics,
              brak cookie identity GA4 albo brak konfiguracji GA4 Measurement Protocol.
            </span>
          </div>
        ) : null}

        <div className="mt-6 rounded-xl bg-neutral-50 p-4 text-sm leading-6 text-muted-foreground">
          Testowe eventy mają parametry <code>qa_mode=1</code>, <code>debug_mode=1</code>
          oraz <code>surface=superadmin_analytics_qa</code>. Dzięki temu można je odróżnić od
          zwykłego ruchu. Są to jednak rzeczywiste eventy wysyłane do skonfigurowanej usługi GA4.
        </div>

        <div className="mt-8 space-y-3">
          {EVENTS.map(([eventName, label]) => (
            <form
              key={eventName}
              action={sendSuperAdminFunnelQaEventAction}
              className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{label}</p>
                <code className="text-xs text-muted-foreground">{eventName}</code>
              </div>
              <div className="flex items-center gap-2">
                <select
                  name="reportType"
                  defaultValue="relations"
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="relations">Ja i moje relacje</option>
                  <option value="work">Ja w pracy i współpracy</option>
                  <option value="change">Ja w zmianie</option>
                </select>
                <input type="hidden" name="eventName" value={eventName} />
                <Button type="submit" variant="outline">
                  Wyślij test
                </Button>
              </div>
            </form>
          ))}
        </div>

        <p className="mt-6 text-xs leading-5 text-muted-foreground">
          begin_checkout i purchase nie są generowane z tego panelu, ponieważ wymagają
          prawdziwego kontekstu transakcji. Te dwa eventy należy testować normalnym przebiegiem zakupu.
        </p>
      </div>
    </main>
  );
}
