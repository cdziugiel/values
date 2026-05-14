"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    archiveQuestionnairePageAction,
    assignPageDimensionAction,
    createQuestionnairePageAction,
    removePageDimensionAction,
    reorderQuestionnairePageAction,
    type QuestionnaireAdminActionState,
    updateQuestionnairePageAction,
} from "../api/questionnaire-admin.actions";
import type { QuestionnaireDimensionEditorItem, QuestionnairePageEditorItem } from "../types/questionnaire-admin.types";
import { Plus } from "lucide-react";

type QuestionnairePagesEditorProps = {
    versionId: string;
    pages: QuestionnairePageEditorItem[];
    dimensions: QuestionnaireDimensionEditorItem[];
};

const initialState: QuestionnaireAdminActionState = {
    status: "idle",
    message: "",
};



function AssignPageDimensionForm({
    versionId,
    pageId,
    availableDimensions,
}: {
    versionId: string;
    pageId: string;
    availableDimensions: QuestionnaireDimensionEditorItem[];
}) {
    const [state, formAction, isPending] = useActionState(
        assignPageDimensionAction,
        initialState,
    );

    if (availableDimensions.length === 0) {
        return (
            <p className="mt-3 text-sm text-muted-foreground">
                Wszystkie dostępne wymiary są już przypisane do tej strony.
            </p>
        );
    }

    return (
        <div className="space-y-2">
            <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="pageId" value={pageId} />

                <select
                    name="dimensionId"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                    {availableDimensions.map((dimension) => (
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

                <Button type="submit" size="sm" disabled={isPending}>
                    {isPending ? "Dodawanie..." : "Dodaj wymiar do strony"}
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

function RemovePageDimensionButton({
    versionId,
    pageDimensionScoreId,
}: {
    versionId: string;
    pageDimensionScoreId: string;
}) {
    const [state, formAction, isPending] = useActionState(
        removePageDimensionAction,
        initialState,
    );

    return (
        <div className="space-y-1">
            <form action={formAction}>
                <input type="hidden" name="versionId" value={versionId} />
                <input
                    type="hidden"
                    name="pageDimensionScoreId"
                    value={pageDimensionScoreId}
                />

                <Button type="submit" size="sm" variant="outline" disabled={isPending}>
                    {isPending ? "Usuwanie..." : "Usuń"}
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

function ReorderQuestionnairePageButtons({
    versionId,
    pageId,
}: {
    versionId: string;
    pageId: string;
}) {
    const [_stateUp, upAction, isUpPending] = useActionState(
        reorderQuestionnairePageAction,
        initialState,
    );

    const [_stateDown, downAction, isDownPending] = useActionState(
        reorderQuestionnairePageAction,
        initialState,
    );

    return (
        <div className="flex gap-1">
            <form action={upAction}>
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="pageId" value={pageId} />
                <input type="hidden" name="direction" value="up" />
                <Button type="submit" size="sm" variant="outline" disabled={isUpPending}>
                    ↑
                </Button>
            </form>

            <form action={downAction}>
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="pageId" value={pageId} />
                <input type="hidden" name="direction" value="down" />
                <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={isDownPending}
                >
                    ↓
                </Button>
            </form>
        </div>
    );
}

function EditQuestionnairePageForm({
    versionId,
    page,
    onCancel,
}: {
    versionId: string;
    page: QuestionnairePageEditorItem;
    onCancel: () => void;
}) {
    const [state, formAction, isPending] = useActionState(
        updateQuestionnairePageAction,
        initialState,
    );

    return (
        <form action={formAction} className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <input type="hidden" name="versionId" value={versionId} />
            <input type="hidden" name="pageId" value={page.id} />

            <div className="grid gap-3 md:grid-cols-4">
                <Input name="title" defaultValue={page.title} required />
                <Input
                    name="description"
                    defaultValue={page.description ?? ""}
                    placeholder="Opis / instrukcja"
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
                    {isPending ? "Zapisywanie..." : "Zapisz stronę"}
                </Button>

                <Button type="button" variant="outline" onClick={onCancel}>
                    Anuluj
                </Button>
            </div>
        </form>
    );
}

function ArchiveQuestionnairePageButton({
    versionId,
    page,
}: {
    versionId: string;
    page: QuestionnairePageEditorItem;
}) {
    const [state, formAction, isPending] = useActionState(
        archiveQuestionnairePageAction,
        initialState,
    );

    return (
        <div className="space-y-1">
            <form
                action={formAction}
                onSubmit={(event) => {
                    const confirmed = window.confirm(
                        `Usunąć stronę "${page.title}"? Itemy z tej strony nie zostaną usunięte, ale zostaną odpięte od strony.`,
                    );

                    if (!confirmed) {
                        event.preventDefault();
                    }
                }}
            >
                <input type="hidden" name="versionId" value={versionId} />
                <input type="hidden" name="pageId" value={page.id} />

                <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
                    {isPending ? "Usuwanie..." : "Usuń stronę"}
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

export function QuestionnairePagesEditor({
    versionId,
    pages,
    dimensions
}: QuestionnairePagesEditorProps) {
    const [editingPageId, setEditingPageId] = useState<string | null>(null);
    const [addingDimensionPageId, setAddingDimensionPageId] = useState<string | null>(
        null,
    );

    const [state, formAction, isPending] = useActionState(
        createQuestionnairePageAction,
        initialState,
    );


    return (
        <section className="space-y-4 rounded-2xl border bg-card p-5">
            <div>
                <h2 className="text-lg font-semibold">Strony / sekcje</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Strona może mieć tytuł typu „W pracy najbardziej lubię...” oraz grupować kilka itemów.
                </p>
            </div>

            <form action={formAction} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input type="hidden" name="versionId" value={versionId} />

                <Input name="title" placeholder="W pracy najbardziej lubię..." required />
                <Input name="description" placeholder="Opis / instrukcja" />

                <Button type="submit" disabled={isPending}>
                    {isPending ? "Dodawanie..." : "Dodaj stronę"}
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

            <div className="space-y-3">
                {pages.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        Brak stron.
                    </div>
                ) : (
                    pages.map((page) => {
                        const isEditing = editingPageId === page.id;
                        const assignedDimensionIds = new Set(
                            page.dimensionScores.map((score) => score.questionnaireDimensionId),
                        );

                        const availableDimensions = dimensions.filter(
                            (dimension) => !assignedDimensionIds.has(dimension.id),
                        );

                        return (
                            <div key={page.id} className="rounded-xl border p-3">
                                {isEditing ? (
                                    <EditQuestionnairePageForm
                                        versionId={versionId}
                                        page={page}
                                        onCancel={() => setEditingPageId(null)}
                                    />
                                ) : (
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium">{page.title}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        kolejność: {page.orderIndex}
                                                    </span>
                                                </div>

                                                {page.description ? (
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {page.description}
                                                    </p>
                                                ) : null}
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setEditingPageId(page.id)}
                                                >
                                                    Edytuj stronę
                                                </Button>

                                                <ReorderQuestionnairePageButtons
                                                    versionId={versionId}
                                                    pageId={page.id}
                                                />

                                                <ArchiveQuestionnairePageButton
                                                    versionId={versionId}
                                                    page={page}
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-lg bg-muted/40 p-3">
                                            <div className="mb-2 text-sm font-medium">Wymiary strony</div>

                                            {page.dimensionScores.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">
                                                    Brak wymiarów przypisanych do strony.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {page.dimensionScores.map((score) => (
                                                        <div
                                                            key={score.id}
                                                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                                                        >
                                                            <div>
                                                                <span className="font-medium">{score.dimensionName}</span>{" "}
                                                                <span className="font-mono text-xs text-muted-foreground">
                                                                    {score.dimensionCode}
                                                                </span>
                                                                <span className="ml-2 text-xs text-muted-foreground">
                                                                    weight: {score.weight}; reverse:{" "}
                                                                    {score.reverseScored ? "tak" : "nie"}
                                                                </span>
                                                            </div>

                                                            <RemovePageDimensionButton
                                                                versionId={versionId}
                                                                pageDimensionScoreId={score.id}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {addingDimensionPageId === page.id ? (
                                                <div className="mt-3 rounded-lg border bg-background p-3">
                                                    <AssignPageDimensionForm
                                                        versionId={versionId}
                                                        pageId={page.id}
                                                        availableDimensions={availableDimensions}
                                                    />

                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="ghost"
                                                        className="mt-2"
                                                        onClick={() => setAddingDimensionPageId(null)}
                                                    >
                                                        Anuluj
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="mt-3 gap-2"
                                                        onClick={() => setAddingDimensionPageId(page.id)}
                                                        disabled={availableDimensions.length === 0}
                                                    >
                                                        <Plus size={14} />
                                                        Dodaj wymiar
                                                    </Button>

                                                    {availableDimensions.length === 0 ? (
                                                        <p className="mt-2 text-xs text-muted-foreground">
                                                            Wszystkie wymiary są już przypisane do tej strony.
                                                        </p>
                                                    ) : null}
                                                </>
                                            )}
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