"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { ReportPreviewSessionOption } from "../api/report-preview-session.queries";

type ReportRealDataPreviewPickerProps = {
  reportTemplateVersionId: string;
  sessions: ReportPreviewSessionOption[];
};

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "brak daty";

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "nieprawidłowa data";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortId(value: string) {
  return value.slice(0, 8);
}

export function ReportRealDataPreviewPicker({
  reportTemplateVersionId,
  sessions,
}: ReportRealDataPreviewPickerProps) {
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const selectedSession = useMemo(
    () => sessions.find((session) => session.sessionId === selectedSessionId),
    [sessions, selectedSessionId],
  );

  const groupedSessions = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        tenantName: string;
        projectName: string;
        sessions: ReportPreviewSessionOption[];
      }
    >();

    for (const session of sessions) {
      const key = `${session.tenantSlug}:${session.projectId}`;

      const existing = groups.get(key);

      if (existing) {
        existing.sessions.push(session);
      } else {
        groups.set(key, {
          key,
          tenantName: session.tenantName,
          projectName: session.projectName,
          sessions: [session],
        });
      }
    }

    return Array.from(groups.values()).map((group) => ({
      ...group,
      sessions: group.sessions.toSorted((a, b) => {
        const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;

        return bTime - aTime;
      }),
    }));
  }, [sessions]);

  const previewHref = selectedSession
    ? `/t/${selectedSession.tenantSlug}/assessment-sessions/${selectedSession.sessionId}/report/${reportTemplateVersionId}?source=builder-preview&projectQuestionnaireId=${selectedSession.projectQuestionnaireId}`
    : null;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          Podgląd na danych
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl min-w-xl">
        <DialogHeader>
          <DialogTitle>Podgląd raportu na realnych danych</DialogTitle>
          <DialogDescription>
            Wybierz zakończoną sesję respondenta zgodną z wersją
            kwestionariusza przypisaną do tego szablonu raportu.
          </DialogDescription>
        </DialogHeader>

        {sessions.length === 0 ? (
          <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            Nie znaleziono zakończonych sesji dla wersji kwestionariusza
            powiązanej z tym szablonem raportu.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="max-h-[520px] overflow-y-auto rounded-xl border">
              {groupedSessions.map((group) => (
                <section key={group.key} className="border-b last:border-b-0">
                  <div className="sticky top-0 z-10 border-b bg-muted/70 px-4 py-3 backdrop-blur">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{group.projectName}</span>
                      <Badge variant="outline">{group.tenantName}</Badge>
                      <Badge variant="secondary">
                        {group.sessions.length} sesji
                      </Badge>
                    </div>
                  </div>

                  <div className="divide-y">
                    {group.sessions.map((session) => {
                      const isSelected =
                        selectedSessionId === session.sessionId;

                      return (
                        <button
                          key={`${session.projectQuestionnaireId}:${session.sessionId}`}
                          type="button"
                          onClick={() =>
                            setSelectedSessionId(session.sessionId)
                          }
                          className={[
                            "flex w-full items-start gap-3 px-4 py-3 text-left transition",
                            "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            isSelected ? "bg-primary/10" : "bg-background",
                          ].join(" ")}
                        >
                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                            {isSelected ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <span className="h-4 w-4 rounded-full border" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-medium">
                                {session.respondentLabel}
                              </span>

                              {session.respondentEmail ? (
                                <span className="text-sm text-muted-foreground">
                                  {session.respondentEmail}
                                </span>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3.5 w-3.5" />
                                zakończono:{" "}
                                {formatDateTime(session.completedAt)}
                              </span>

                              <span>
                                rozpoczęto: {formatDateTime(session.startedAt)}
                              </span>

                              <span>sesja: {shortId(session.sessionId)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Pokazywane są tylko zakończone sesje zgodne z wersją
                kwestionariusza przypisaną do tego raportu.
              </p>

              {previewHref ? (
                <Button asChild>
                  <Link href={previewHref} target="_blank">
                    Otwórz podgląd
                  </Link>
                </Button>
              ) : (
                <Button type="button" disabled>
                  Otwórz podgląd
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}