"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  assignItemDimensionAction,
  createQuestionnaireItemAction,
  removeItemDimensionAction,
  type QuestionnaireAdminActionState,
} from "../api/questionnaire-admin.actions";
import type {
  QuestionnaireDimensionEditorItem,
  QuestionnaireItemEditorItem,
  QuestionnairePageEditorItem,
} from "../types/questionnaire-admin.types";

type QuestionnaireItemsEditorProps = {
  versionId: string;
  pages: QuestionnairePageEditorItem[];
  dimensions: QuestionnaireDimensionEditorItem[];
  items: QuestionnaireItemEditorItem[];
};

const initialState: QuestionnaireAdminActionState = {
  status: "idle",
  message: "",
};

const itemTypes = [
  "likert",
  "true_false",
  "single_choice",
  "multiple_choice",
  "text",
  "number",
];

export function QuestionnaireItemsEditor({
  versionId,
  pages,
  dimensions,
  items,
}: QuestionnaireItemsEditorProps) {
  const [createState, createAction, isCreating] = useActionState(
    createQuestionnaireItemAction,
    initialState,
  );

  const [assignState, assignAction, isAssigning] = useActionState(
    assignItemDimensionAction,
    initialState,
  );

  const [removeState, removeAction, isRemoving] = useActionState(
    removeItemDimensionAction,
    initialState,
  );

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold">Itemy</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Item może należeć do strony, mieć typ odpowiedzi, skalę i jeden lub więcej wymiarów scoringowych.
        </p>
      </div>

      <form action={createAction} className="space-y-4 rounded-xl border p-4">
        <input type="hidden" name="versionId" value={versionId} />

        <div className="grid gap-3 md:grid-cols-4">
          <select
            name="pageId"
            className="h-10 rounded-md border bg-background px-3 text-sm"
            defaultValue=""
          >
            <option value="">Brak strony</option>
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.title}
              </option>
            ))}
          </select>

          <Input name="code" placeholder="ITEM_001" required />

          <Input
            name="orderIndex"
            type="number"
            defaultValue={items.length + 1}
          />

          <select
            name="type"
            className="h-10 rounded-md border bg-background px-3 text-sm"
            defaultValue="likert"
          >
            {itemTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <textarea
          name="text"
          required
          className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder='Treść itemu, np. "...atmosferę"'
        />

        <div className="grid gap-3 md:grid-cols-5">
          <Input name="helpText" placeholder="Pomoc / doprecyzowanie" />
          <Input name="scaleMin" type="number" placeholder="-3" defaultValue="-3" />
          <Input name="scaleMax" type="number" placeholder="3" defaultValue="3" />
          <Input name="scaleMinLabel" placeholder="Zdecydowanie nie" />
          <Input name="scaleMaxLabel" placeholder="Zdecydowanie tak" />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="required" defaultChecked />
          Wymagane
        </label>

        {createState.status !== "idle" ? (
          <p
            className={
              createState.status === "success"
                ? "text-sm text-green-700"
                : "text-sm text-destructive"
            }
          >
            {createState.message}
          </p>
        ) : null}

        <Button type="submit" disabled={isCreating}>
          {isCreating ? "Dodawanie..." : "Dodaj item"}
        </Button>
      </form>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Brak itemów.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="space-y-4 rounded-xl border p-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{item.text}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.code}
                  </span>
                  <span className="rounded-md border px-2 py-1 text-xs">
                    {item.type}
                  </span>
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  Strona: {item.pageTitle ?? "—"} · kolejność:{" "}
                  {item.orderIndex} · skala: {item.scaleMin ?? "—"}–
                  {item.scaleMax ?? "—"}
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-3">
                <div className="mb-2 text-sm font-medium">
                  Wymiary itemu
                </div>

                {item.dimensionScores.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Brak przypisanych wymiarów.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {item.dimensionScores.map((score) => (
                      <div
                        key={score.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">
                            {score.dimensionName}
                          </span>{" "}
                          <span className="font-mono text-xs text-muted-foreground">
                            {score.dimensionCode}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            weight: {score.weight}; reverse:{" "}
                            {score.reverseScored ? "tak" : "nie"}
                          </span>
                        </div>

                        <form action={removeAction}>
                          <input
                            type="hidden"
                            name="versionId"
                            value={versionId}
                          />
                          <input
                            type="hidden"
                            name="itemDimensionScoreId"
                            value={score.id}
                          />

                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            disabled={isRemoving}
                          >
                            Usuń
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}

                {dimensions.length > 0 ? (
                  <form
                    action={assignAction}
                    className="mt-3 flex flex-wrap items-end gap-2"
                  >
                    <input type="hidden" name="versionId" value={versionId} />
                    <input type="hidden" name="itemId" value={item.id} />

                    <select
                      name="dimensionId"
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      {dimensions.map((dimension) => (
                        <option key={dimension.id} value={dimension.id}>
                          {dimension.name} ({dimension.code})
                        </option>
                      ))}
                    </select>

                    <Input
                      name="weight"
                      type="number"
                      step="0.0001"
                      defaultValue="1"
                      className="w-28"
                    />

                    <label className="flex h-10 items-center gap-2 text-sm">
                      <input type="checkbox" name="reverseScored" />
                      Odwrócony
                    </label>

                    <Button type="submit" size="sm" disabled={isAssigning}>
                      Dodaj wymiar
                    </Button>
                  </form>
                ) : null}

                {assignState.status !== "idle" ? (
                  <p
                    className={
                      assignState.status === "success"
                        ? "mt-2 text-xs text-green-700"
                        : "mt-2 text-xs text-destructive"
                    }
                  >
                    {assignState.message}
                  </p>
                ) : null}

                {removeState.status !== "idle" ? (
                  <p
                    className={
                      removeState.status === "success"
                        ? "mt-2 text-xs text-green-700"
                        : "mt-2 text-xs text-destructive"
                    }
                  >
                    {removeState.message}
                  </p>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}