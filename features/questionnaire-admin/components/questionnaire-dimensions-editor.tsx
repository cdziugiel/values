"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  archiveQuestionnaireDimensionAction,
  createQuestionnaireDimensionAction,
  type QuestionnaireAdminActionState,
  updateQuestionnaireDimensionAction,
} from "../api/questionnaire-admin.actions";
import type { QuestionnaireDimensionEditorItem } from "../types/questionnaire-admin.types";

type QuestionnaireDimensionsEditorProps = {
  versionId: string;
  dimensions: QuestionnaireDimensionEditorItem[];
};

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

function EditQuestionnaireDimensionForm({
  versionId,
  dimension,
  onCancel,
}: {
  versionId: string;
  dimension: QuestionnaireDimensionEditorItem;
  onCancel: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    updateQuestionnaireDimensionAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3 rounded-xl border bg-muted/30 p-4">
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="dimensionId" value={dimension.id} />

      <div className="grid gap-3 md:grid-cols-4">
        <Input name="code" defaultValue={dimension.code} required />
        <Input name="name" defaultValue={dimension.name} required />
        <Input
          name="orderIndex"
          type="number"
          defaultValue={dimension.orderIndex}
          required
        />
        <Input
          name="description"
          defaultValue={dimension.description ?? ""}
          placeholder="Opis wymiaru"
        />
      </div>

      {state.status !== "idle" ? (
        <p
          className={
            state.status === "success"
              ? "text-sm text-green-700"
              : "text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Zapisywanie..." : "Zapisz wymiar"}
        </Button>

        <Button type="button" variant="outline" onClick={onCancel}>
          Anuluj
        </Button>
      </div>
    </form>
  );
}

function ArchiveQuestionnaireDimensionButton({
  versionId,
  dimension,
}: {
  versionId: string;
  dimension: QuestionnaireDimensionEditorItem;
}) {
  const [state, formAction, isPending] = useActionState(
    archiveQuestionnaireDimensionAction,
    initialState,
  );

  return (
    <div className="space-y-1">
      <form
        action={formAction}
        onSubmit={(event) => {
          const confirmed = window.confirm(
            `Usunąć wymiar "${dimension.name}"? Powiązania scoringowe itemów z tym wymiarem zostaną usunięte.`,
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="versionId" value={versionId} />
        <input type="hidden" name="dimensionId" value={dimension.id} />

        <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
          {isPending ? "Usuwanie..." : "Usuń wymiar"}
        </Button>
      </form>

      {state.status !== "idle" ? (
        <p
          className={
            state.status === "success"
              ? "text-xs text-green-700"
              : "text-xs text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

export function QuestionnaireDimensionsEditor({
  versionId,
  dimensions,
}: QuestionnaireDimensionsEditorProps) {
  const [editingDimensionId, setEditingDimensionId] = useState<string | null>(
    null,
  );

  const [state, formAction, isPending] = useActionState(
    createQuestionnaireDimensionAction,
    initialState,
  );

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">Wymiary scoringowe</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Wymiary są konstruktami, do których później przypisujesz itemy.
        </p>
      </div>

      <form action={formAction} className="grid gap-3 md:grid-cols-5">
        <input type="hidden" name="versionId" value={versionId} />

        <Input name="code" placeholder="STABILITY" required />
        <Input name="name" placeholder="Stabilność" required />
        <Input name="description" placeholder="Opis wymiaru" />
        <Input
          name="orderIndex"
          type="number"
          placeholder="0"
          defaultValue={dimensions.length + 1}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Dodawanie..." : "Dodaj wymiar"}
        </Button>
      </form>

      {state.status !== "idle" ? (
        <p
          className={
            state.status === "success"
              ? "text-sm text-green-700"
              : "text-sm text-destructive"
          }
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        {dimensions.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Brak wymiarów.
          </div>
        ) : (
          dimensions.map((dimension) => {
            const isEditing = editingDimensionId === dimension.id;

            return (
              <div key={dimension.id} className="rounded-xl border p-3">
                {isEditing ? (
                  <EditQuestionnaireDimensionForm
                    versionId={versionId}
                    dimension={dimension}
                    onCancel={() => setEditingDimensionId(null)}
                  />
                ) : (
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{dimension.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {dimension.code}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          kolejność: {dimension.orderIndex}
                        </span>
                      </div>

                      {dimension.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {dimension.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingDimensionId(dimension.id)}
                      >
                        Edytuj wymiar
                      </Button>

                      <ArchiveQuestionnaireDimensionButton
                        versionId={versionId}
                        dimension={dimension}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}