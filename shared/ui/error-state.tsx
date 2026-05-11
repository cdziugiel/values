import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ErrorStateProps = {
  title?: string;
  description?: string;
};

export function ErrorState({
  title = "Nie udało się wykonać operacji",
  description = "Odśwież stronę lub spróbuj ponownie za chwilę.",
}: ErrorStateProps) {
  return (
    <Alert variant="destructive">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}