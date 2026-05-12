import type { ReactNode } from "react";
import Link from "next/link";
import type { Session } from "next-auth";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ProtectedNavigationItem } from "@/server/navigation/get-protected-navigation";

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
  const userLabel = session.user.email ?? session.user.name ?? "Użytkownik";

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="grid min-h-svh lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r bg-muted/20 lg:block">
          <div className="flex h-full flex-col">
            <div className="px-6 py-5">
              <div className="text-lg font-semibold tracking-tight">
                HUMANET VALUES
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Panel administracyjny
              </p>
            </div>

            <Separator />

            <nav className="flex-1 space-y-1 px-3 py-4">
              {navigationItems.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </nav>

            <Separator />

            <div className="space-y-1 px-6 py-4 text-xs text-muted-foreground">
              <div>Zalogowano jako</div>
              <div className="truncate font-medium text-foreground">
                {userLabel}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col">
          <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-4 px-5 lg:px-8">
              <div>
                <div className="text-sm font-medium">HUMANET VALUES</div>
                <div className="text-xs text-muted-foreground">
                  Sesja aktywna
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden max-w-[260px] truncate text-sm text-muted-foreground sm:block">
                  {userLabel}
                </div>

                <form action="/api/auth/signout" method="post">
                  <Button type="submit" variant="outline" size="sm">
                    Wyloguj
                  </Button>
                </form>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-5 py-8 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}