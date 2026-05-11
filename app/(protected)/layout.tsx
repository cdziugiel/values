import type { ReactNode } from "react";

import { AppShell } from "@/shared/ui";
import { requireSession } from "@/server/auth/require-session";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  await requireSession();

  return (
    <AppShell>
      <div className="mb-6 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
        Protected layout — sesja aktywna.
      </div>

      {children}
    </AppShell>
  );
}