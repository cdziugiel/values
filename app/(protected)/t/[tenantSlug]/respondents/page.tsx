import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/shared/ui";

export default function RespondentsPage() {
  return (
    <>
      <PageHeader
        title="Respondenci"
        description="Lista respondentów przypisanych do organizacji i projektów badawczych."
        actions={<Button>Dodaj respondenta</Button>}
      />

      <EmptyState
        title="Brak respondentów"
        description="Docelowo dane identyfikujące respondentów będą oddzielone od odpowiedzi i wyników."
      />
    </>
  );
}