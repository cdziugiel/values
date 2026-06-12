"use client";

import { useActionState } from "react";
import { Ban, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  revokeMyComparisonShareAction,
  type RevokeComparisonShareState,
} from "../api/my-comparison-tokens.actions";

const initialState: RevokeComparisonShareState = {
  status: "idle",
  message: "",
};

type RevokeComparisonShareFormProps = {
  tenantSlug: string;
  shareId: string;
};

export function RevokeComparisonShareForm({
  tenantSlug,
  shareId,
}: RevokeComparisonShareFormProps) {
  const [state, formAction, isPending] = useActionState(
    revokeMyComparisonShareAction,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:items-end">
      <input type="hidden" name="tenantSlug" value={tenantSlug} />
      <input type="hidden" name="shareId" value={shareId} />

      <Button
        type="submit"
        disabled={isPending}
        variant="outline"
        className="rounded-full"
      >
        {isPending ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <Ban className="h-4 w-4" />
        )}
        {isPending ? "Unieważniam..." : "Unieważnij"}
      </Button>

      {state.status === "error" ? (
        <p className="max-w-xs text-xs leading-5 text-red-600">
          {state.message}
        </p>
      ) : null}

      {state.status === "success" ? (
        <p className="max-w-xs text-xs leading-5 text-[#0f766e]">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}