// components/protected-app-shell.tsx
// albo aktualna ścieżka Twojego pliku

"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import type { Session } from "next-auth";
import {
  FileText,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ProtectedNavigationGroup } from "@/server/navigation/get-protected-navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Badge } from "@/components/ui/badge";
import {
  AppShellTopbarProvider,
  useAppShellTopbar,
  type AppShellTopbarBadgeTone,
} from "@/shared/ui/app-shell-topbar-context";

type ProtectedAppShellProps = {
  children: ReactNode;
  session: Session;
  navigationGroups: ProtectedNavigationGroup[];
};

const legalLinks = [
  {
    label: "Regulamin",
    href: "/legal/regulamin",
    icon: <FileText className="h-3.5 w-3.5" />,
  },
  {
    label: "Polityka prywatności",
    href: "/legal/polityka-prywatnosci",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
  },
];


function getNavigationGroupShortLabel(label: string) {
  return label
    .replace(/^Panel\s+/i, "")
    .slice(0, 1)
    .toUpperCase();
}

export function ProtectedAppShell(props: ProtectedAppShellProps) {
  return (
    <AppShellTopbarProvider>
      <ProtectedAppShellInner {...props} />
    </AppShellTopbarProvider>
  );
}

function getTopbarBadgeClassName(tone: AppShellTopbarBadgeTone = "neutral") {
  switch (tone) {
    case "accent":
      return "rounded-full border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
    case "danger":
      return "rounded-full border-red-200 bg-red-50 text-red-700";
    case "neutral":
    default:
      return "rounded-full border-border bg-muted text-muted-foreground";
  }
}

function ProtectedAppShellInner({
  children,
  session,
  navigationGroups,
}: ProtectedAppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { topbarContext } = useAppShellTopbar();

  const userLabel = session.user.email ?? session.user.name ?? "Użytkownik";

  return (
    <div
      className={
        isSidebarCollapsed
          ? "fixed inset-0 grid overflow-hidden bg-background text-foreground lg:grid-cols-[72px_1fr]"
          : "fixed inset-0 grid overflow-hidden bg-background text-foreground lg:grid-cols-[280px_1fr]"
      }
    >
      <aside className="hidden h-screen min-h-0 border-r bg-muted/20 lg:block">
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div
            className={
              isSidebarCollapsed
                ? "flex min-h-16 shrink-0 items-center justify-center px-3"
                : "flex min-h-16 shrink-0 items-center justify-between gap-3 px-6 py-5"
            }
          >
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center space-x-3 truncate text-lg font-semibold tracking-tight">
                  <img src="/logo.svg" alt="logo" width={20} height={20} />
                  <div>HUMANET</div>
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label={
                isSidebarCollapsed
                  ? "Rozwiń pasek boczny"
                  : "Zwiń pasek boczny"
              }
              title={
                isSidebarCollapsed
                  ? "Rozwiń pasek boczny"
                  : "Zwiń pasek boczny"
              }
              onClick={() => setIsSidebarCollapsed((value) => !value)}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          <Separator />

          <nav
            className={
              isSidebarCollapsed
                ? "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 [scrollbar-gutter:stable]"
                : "min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 [scrollbar-gutter:stable]"
            }
          >
            <div className={isSidebarCollapsed ? "space-y-5" : "space-y-6"}>
              {navigationGroups.map((group) => (
                <section key={group.label} className="space-y-1">
                  {isSidebarCollapsed ? (
                    <div
                      className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold uppercase text-muted-foreground"
                      title={group.label}
                    >
                      {getNavigationGroupShortLabel(group.label)}
                    </div>
                  ) : (
                    <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </div>
                  )}

                  {group.items.map((item) => (
                    <Button
                      key={item.href}
                      asChild
                      variant="ghost"
                      className={
                        isSidebarCollapsed
                          ? "h-10 w-full justify-center px-0"
                          : "w-full justify-start"
                      }
                      title={item.label}
                    >
                      <Link
                        href={item.href}
                        className={
                          isSidebarCollapsed
                            ? "flex w-full items-center justify-center"
                            : "flex w-full items-center gap-2"
                        }
                      >
                        {isSidebarCollapsed ? (
                          item.icon ? (
                            item.icon
                          ) : (
                            <span className="text-xs font-semibold">
                              {item.label.slice(0, 1).toUpperCase()}
                            </span>
                          )
                        ) : (
                          <>
                            {item.icon}
                            <span className="truncate">{item.label}</span>
                          </>
                        )}
                      </Link>
                    </Button>
                  ))}
                </section>
              ))}
            </div>
          </nav>
          <div className="mt-auto border-t p-3">
            <Link
              href="/my/support"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-xs"
            >
              <LifeBuoy
                size={18}
                className="shrink-0"
              />

              <span>Zgłoś problem</span>
            </Link>
          </div>
          <Separator />

          {isSidebarCollapsed ? (
            <div className="flex shrink-0 flex-col items-center gap-2 px-3 py-4">
              {legalLinks.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  title={item.label}
                >
                  <Link href={item.href}>
                    {item.icon}
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </Button>
              ))}

              <div
                className="mt-2 flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground"
                title={userLabel}
              >
                {(session.user.name ?? session.user.email ?? "U")
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="shrink-0 px-6 py-4">
              <div className="mb-4 grid gap-1.5">
                {legalLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="space-y-1 border-t pt-4 text-xs text-muted-foreground">
                <div>Zalogowano jako</div>
                <div className="truncate font-medium text-foreground">
                  {userLabel}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <header className="shrink-0 bg-background/90 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-5 lg:px-8">
            <div className="min-w-0">
              {topbarContext ? (
                <>
                  <div className="text-xs font-medium text-muted-foreground">
                    {topbarContext.eyebrow ?? "Kontekst"}
                  </div>

                  <div className="max-w-[260px] truncate text-sm font-semibold text-foreground md:max-w-[380px]">
                    {topbarContext.title ?? "HUMANET VALUES"}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-sm font-medium">HUMANET VALUES</div>
                  <div className="text-xs text-muted-foreground">Sesja aktywna</div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {topbarContext?.badges?.length ? (
                <div className="hidden items-center gap-2 md:flex">
                  {topbarContext.badges.map((badge) => (
                    <Badge
                      key={`${badge.label}-${badge.tone ?? "neutral"}`}
                      className={getTopbarBadgeClassName(badge.tone)}
                    >
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="hidden max-w-[260px] truncate text-sm text-muted-foreground sm:block">
                {userLabel}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    aria-label="Otwórz menu nawigacji"
                  >
                    <Menu className="h-4 w-4" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-64">
                  {navigationGroups.map((group) => (
                    <div key={group.label}>
                      <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </div>

                      {group.items.map((item) => (
                        <DropdownMenuItem key={item.href} asChild>
                          <Link
                            href={item.href}
                            className="flex w-full items-center gap-2"
                          >
                            {item.icon ? (
                              item.icon
                            ) : (
                              <span className="flex h-4 w-4 items-center justify-center text-xs font-semibold">
                                {item.label.slice(0, 1).toUpperCase()}
                              </span>
                            )}

                            <span className="truncate">{item.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ))}

                  <Separator className="my-1" />

                  {legalLinks.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className="flex w-full items-center gap-2"
                      >
                        {item.icon}
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <Separator className="my-1" />
                  <DropdownMenuItem key={'support'} asChild>
                    <Link
                      href="/my/support"
                      className="flex w-full items-center gap-2 text-xs"
                    >
                      <LifeBuoy
                        size={18}
                        className="shrink-0"
                      />

                      <span>Zgłoś problem</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <form action="/api/auth/signout" method="post">
                <Button type="submit" variant="outline" size="sm">
                  Wyloguj
                </Button>
              </form>
            </div>
          </div>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-8 lg:px-8 ">
          {children}
        </main>
      </div>
    </div>
  );
}