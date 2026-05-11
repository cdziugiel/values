import { AppShell, PageHeader } from "@/shared/ui";

export default function VerifyRequestPage() {
  return (
    <AppShell>
      <PageHeader
        title="Sprawdź skrzynkę email"
        description="Wysłaliśmy link logujący. Otwórz wiadomość i kliknij link, aby wejść do systemu."
      />

      <div className="max-w-xl rounded-2xl border bg-card p-6 text-sm leading-6 text-muted-foreground">
        Jeśli wiadomość nie dotarła, sprawdź folder spam lub wróć do logowania i
        wyślij link ponownie.
      </div>
    </AppShell>
  );
}