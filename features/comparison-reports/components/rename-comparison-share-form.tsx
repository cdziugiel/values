"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  renameMyComparisonShareAction,
  type RenameComparisonShareState,
} from "../api/my-comparison-tokens.actions";

const initialState: RenameComparisonShareState = {
  status: "idle",
  message: "",
};

type RenameComparisonShareFormProps = {
  tenantSlug: string;
  shareId: string;
  initialLabel: string | null;
};

export function RenameComparisonShareForm({
  tenantSlug,
  shareId,
  initialLabel,
}: RenameComparisonShareFormProps) {
  const [state, formAction, isPending] = useActionState(
    renameMyComparisonShareAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="shareId" value={shareId} />

      <Input
        name="label"
        defaultValue={initialLabel ?? ""}
        placeholder="Nazwa tokenu, np. Token dla Ani"
        className="h-10 rounded-full"
      />

      <Button
        type="submit"
        disabled={isPending}
        variant="outline"
        className="rounded-full"
      >
        <Save className="h-4 w-4" />
        {isPending ? "Zapisuję..." : "Zapisz"}
      </Button>

      {state.status === "error" ? (
        <p className="text-xs text-red-600">{state.message}</p>
      ) : null}
    </form>
  );
}