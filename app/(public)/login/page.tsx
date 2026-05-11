import { Suspense } from "react";

import { LoginForm } from "@/features/auth";
import { AppShell, PageHeader } from "@/shared/ui";

export default function LoginPage() {
  return (
    <AppShell>
      <PageHeader
        title="Logowanie"
        description="Zaloguj się do HUMANET VALUES."
      />

      <div className="max-w-md rounded-2xl border bg-card p-6">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </AppShell>
  );
}