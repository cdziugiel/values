
import type { ReactNode } from "react";

import { getProtectedNavigation } from "@/server/navigation/get-protected-navigation";
import { requireSession } from "@/server/auth/require-session";
import { ProtectedAppShell } from "@/shared/ui";

type ProtectedLayoutProps = {
  children: ReactNode;
};

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps) {
  const session = await requireSession();

  const navigationGroups = await getProtectedNavigation(session);

  return (
    <ProtectedAppShell
      session={session}
      navigationGroups={navigationGroups}
    >
      {children}
    </ProtectedAppShell>
  );
}