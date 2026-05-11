import { EmptyState, PageHeader } from "@/shared/ui";

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Raporty"
        description="Raporty indywidualne i grupowe z kontrolą dostępu, snapshotem i audytem."
      />

      <EmptyState
        title="Brak raportów"
        description="Raporty pojawią się po zakończeniu sesji, scoringu i wygenerowaniu wersjonowanego raportu."
      />
    </>
  );
}