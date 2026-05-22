"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import type { Session } from "next-auth";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ProtectedNavigationItem } from "@/server/navigation/get-protected-navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


type ProtectedAppShellProps = {
  children: ReactNode;
  session: Session;
  navigationItems: ProtectedNavigationItem[];
};

export function ProtectedAppShell({
  children,
  session,
  navigationItems,
}: ProtectedAppShellProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const userLabel = session.user.email ?? session.user.name ?? "Użytkownik";

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div
        className={
          isSidebarCollapsed
            ? "grid h-svh overflow-hidden lg:grid-cols-[72px_1fr]"
            : "grid h-svh overflow-hidden lg:grid-cols-[280px_1fr]"
        }
      >
        <aside className="hidden h-svh border-r bg-muted/20 lg:block">
          <div className="flex h-svh flex-col">
            <div
              className={
                isSidebarCollapsed
                  ? "flex min-h-16 items-center justify-center px-3"
                  : "flex min-h-16 items-center justify-between gap-3 px-6 py-5"
              }
            >
              {!isSidebarCollapsed && (
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold tracking-tight flex items-center space-x-3">
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
                  ? "min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-4"
                  : "min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4"
              }
            >
              {navigationItems.map((item) => (
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
            </nav>

            <Separator />

            {isSidebarCollapsed ? (
              <div className="flex justify-center px-3 py-4">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground"
                  title={userLabel}
                >
                  {(session.user.name ?? session.user.email ?? "U")
                    .slice(0, 1)
                    .toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="space-y-1 px-6 py-4 text-xs text-muted-foreground">
                <div>Zalogowano jako</div>
                <div className="truncate font-medium text-foreground">
                  {userLabel}
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-col">
          <header className="shrink-0 border-b bg-background/90 backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-4 px-5 lg:px-8">
              <div>
                <div className="text-sm font-medium">HUMANET VALUES</div>
                <div className="text-xs text-muted-foreground">
                  Sesja aktywna
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
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

                  <DropdownMenuContent align="end" className="w-56">
                    {navigationItems.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="flex w-full items-center gap-2">
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

          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-5 py-8 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}