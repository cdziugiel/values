import type { ReactNode } from "react";
import { AppShell } from "@/shared/ui";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <AppShell>
      <div className="mb-6 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
        Protected layout placeholder — tutaj później dodamy sesję, sidebar,
        topbar, tenant switcher i kontrolę dostępu.
      </div>

      {children}
    </AppShell>
  );
}