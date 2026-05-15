// features/report-builder/components/report-template-version-editor.tsx
"use client";

import { useActionState, useMemo, useState, type CSSProperties } from "react";
import {
    ChevronDown,
    ChevronRight,
    Eye,
    FileText,
    LayoutTemplate,
    Plus,
    Settings2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { ReportDataReferencePanel } from "./report-data-reference-panel";

import {
    archiveReportTemplatePageAction,
    createReportTemplatePageAction,
    reorderReportTemplatePageAction,
    updateReportTemplatePageAction,
    updateReportTemplateVersionAction,
    type ReportBuilderActionState,
} from "../api/report-builder.actions";

import { ReportA4PreviewFrame } from "./report-a4-preview-frame";

const initialState: ReportBuilderActionState = {
    status: "idle",
    message: "",
};

type ReportTemplateVersionEditorProps = {
    reportTemplateVersion: any;
};

function stringifyJson(value: unknown, fallback: unknown) {
    try {
        return JSON.stringify(value ?? fallback, null, 2);
    } catch {
        return JSON.stringify(fallback, null, 2);
    }
}

function getPageSizeClass({
    pageSize,
    orientation,
}: {
    pageSize?: string | null;
    orientation?: string | null;
}) {
    if (pageSize !== "A4") {
        return "A4 portrait";
    }

    return orientation === "landscape" ? "A4 landscape" : "A4 portrait";
}

function ReportTemplateVersionSettingsForm({
    reportTemplateVersion,
}: {
    reportTemplateVersion: any;
}) {
    const [state, formAction, isPending] = useActionState(
        updateReportTemplateVersionAction,
        initialState,
    );

    const [configText, setConfigText] = useState(
        stringifyJson(reportTemplateVersion.config, {}),
    );

    const [dataBindingsText, setDataBindingsText] = useState(
        stringifyJson(reportTemplateVersion.dataBindings, {}),
    );

    return (
        <form action={formAction} className="space-y-4 rounded-2xl border bg-card p-5">
            <input
                type="hidden"
                name="reportTemplateVersionId"
                value={reportTemplateVersion.id}
            />

            <div className="flex items-start gap-3">
                <Settings2 className="mt-1 h-5 w-5 text-muted-foreground" />

                <div>
                    <h2 className="text-lg font-semibold">Ustawienia wersji raportu</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Globalny CSS/JS działa na wszystkich stronach raportu. Kod JS będzie
                        wykonywany dopiero w sandboxowanym podglądzie.
                    </p>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
                <Input name="name" defaultValue={reportTemplateVersion.name} required />

                <Input
                    name="description"
                    defaultValue={reportTemplateVersion.description ?? ""}
                    placeholder="Opis wersji"
                />


                <select
                    name="orientation"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    defaultValue={reportTemplateVersion.orientation ?? "portrait"}
                >
                    <option value="portrait">A4 pionowo</option>
                    <option value="landscape">A4 poziomo</option>
                </select>
            </div>



            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <div className="text-sm font-medium">Global CSS</div>
                    <textarea
                        name="globalCss"
                        defaultValue={reportTemplateVersion.globalCss ?? ""}
                        className="min-h-48 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                        spellCheck={false}
                        placeholder={".report-page-content { padding: 32px; }"}
                    />
                </div>

                <div className="space-y-2">
                    <div className="text-sm font-medium">Global JS</div>
                    <textarea
                        name="globalJs"
                        defaultValue={reportTemplateVersion.globalJs ?? ""}
                        className="min-h-48 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                        spellCheck={false}
                        placeholder={"console.log('report context', window.__REPORT__);"}
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <div className="text-sm font-medium">Config JSON</div>
                    <textarea
                        name="config"
                        value={configText}
                        onChange={(event) => setConfigText(event.target.value)}
                        className="min-h-40 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                        spellCheck={false}
                    />
                </div>

                <div className="space-y-2">
                    <div className="text-sm font-medium">Data bindings JSON</div>
                    <textarea
                        name="dataBindings"
                        value={dataBindingsText}
                        onChange={(event) => setDataBindingsText(event.target.value)}
                        className="min-h-40 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                        spellCheck={false}
                        placeholder={'{ "primaryScore": "scores.vMEME.TRADITION" }'}
                    />
                </div>
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

            <Button type="submit" disabled={isPending}>
                {isPending ? "Zapisywanie..." : "Zapisz ustawienia raportu"}
            </Button>
        </form>
    );
}

function CreateReportTemplatePageForm({
    reportTemplateVersionId,
}: {
    reportTemplateVersionId: string;
}) {
    const [state, formAction, isPending] = useActionState(
        createReportTemplatePageAction,
        initialState,
    );

    return (
        <form action={formAction} className="rounded-2xl border bg-card p-5">
            <input
                type="hidden"
                name="reportTemplateVersionId"
                value={reportTemplateVersionId}
            />

            <div className="flex flex-col gap-3 md:flex-row md:items-end">
                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Nowa strona raportu</label>
                    <Input name="title" placeholder="Np. Strona tytułowa" required />
                </div>

                <div className="flex-1 space-y-2">
                    <label className="text-sm font-medium">Opis</label>
                    <Input name="description" placeholder="Opcjonalny opis techniczny" />
                </div>

                <Button type="submit" disabled={isPending} className="gap-2">
                    <Plus size={16} />
                    {isPending ? "Dodawanie..." : "Dodaj stronę"}
                </Button>
            </div>

            {state.status !== "idle" ? (
                <p
                    className={
                        state.status === "success"
                            ? "mt-3 text-sm text-green-700"
                            : "mt-3 text-sm text-destructive"
                    }
                >
                    {state.message}
                </p>
            ) : null}
        </form>
    );
}

function ReorderReportTemplatePageButtons({
    pageId,
}: {
    pageId: string;
}) {
    const [_upState, upAction, isUpPending] = useActionState(
        reorderReportTemplatePageAction,
        initialState,
    );

    const [_downState, downAction, isDownPending] = useActionState(
        reorderReportTemplatePageAction,
        initialState,
    );

    return (
        <div className="flex gap-1">
            <form action={upAction}>
                <input type="hidden" name="reportTemplatePageId" value={pageId} />
                <input type="hidden" name="direction" value="up" />
                <Button type="submit" size="sm" variant="outline" disabled={isUpPending}>
                    ↑
                </Button>
            </form>

            <form action={downAction}>
                <input type="hidden" name="reportTemplatePageId" value={pageId} />
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

function ArchiveReportTemplatePageButton({
    page,
}: {
    page: any;
}) {
    const [state, formAction, isPending] = useActionState(
        archiveReportTemplatePageAction,
        initialState,
    );

    return (
        <div className="space-y-1">
            <form
                action={formAction}
                onSubmit={(event) => {
                    const confirmed = window.confirm(
                        `Usunąć stronę raportu "${page.title}"?`,
                    );

                    if (!confirmed) {
                        event.preventDefault();
                    }
                }}
            >
                <input type="hidden" name="reportTemplatePageId" value={page.id} />

                <Button type="submit" size="sm" variant="destructive" disabled={isPending}>
                    {isPending ? "Usuwanie..." : "Usuń"}
                </Button>
            </form>

            {state.status === "error" ? (
                <p className="text-xs text-destructive">{state.message}</p>
            ) : null}
        </div>
    );
}

function ReportTemplatePageEditor({
    page,
    reportTemplateVersion,
    selected,
    onSelect,
}: {
    page: any;
    reportTemplateVersion: any;
    selected: boolean;
    onSelect: () => void;
}) {
    const [state, formAction, isPending] = useActionState(
        updateReportTemplatePageAction,
        initialState,
    );

    const [visibilityConditionText, setVisibilityConditionText] = useState(
        stringifyJson(page.visibilityCondition, null),
    );

    const [componentBindingsText, setComponentBindingsText] = useState(
        stringifyJson(page.componentBindings, []),
    );

    const [configText, setConfigText] = useState(stringifyJson(page.config, {}));
    const [previewWidth, setPreviewWidth] = useState(620);

    return (
        <div className="overflow-hidden rounded-2xl border bg-card">
            <button
                type="button"
                onClick={onSelect}
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left hover:bg-muted/40"
            >
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        {selected ? (
                            <ChevronDown size={18} className="text-muted-foreground" />
                        ) : (
                            <ChevronRight size={18} className="text-muted-foreground" />
                        )}

                        <span className="font-semibold">{page.title}</span>

                        <span className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                            {page.code}
                        </span>

                        <span className="rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                            kolejność: {page.orderIndex}
                        </span>
                    </div>

                    {page.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {page.description}
                        </p>
                    ) : null}
                </div>

                <div className="shrink-0 text-xs text-muted-foreground">
                    {selected ? "Zwiń" : "Edytuj"}
                </div>
            </button>

            {selected ? (
                <div className="border-t bg-muted/10 p-4">
                    <form action={formAction} className="space-y-4">
                        <input type="hidden" name="reportTemplatePageId" value={page.id} />

                        <div className="grid gap-3 md:grid-cols-3">
                            <Input name="code" defaultValue={page.code} required />

                            <Input name="title" defaultValue={page.title} required />

                            <Input
                                name="description"
                                defaultValue={page.description ?? ""}
                                placeholder="Opis techniczny"
                            />
                        </div>

                        <div
                            className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_var(--preview-width)]"
                            style={
                                {
                                    "--preview-width": `${previewWidth}px`,
                                } as CSSProperties
                            }
                        >
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="text-sm font-medium">HTML strony</div>

                                    <textarea
                                        name="html"
                                        defaultValue={page.html ?? ""}
                                        className="min-h-72 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                                        spellCheck={false}
                                    />
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">CSS strony</div>

                                        <textarea
                                            name="css"
                                            defaultValue={page.css ?? ""}
                                            className="min-h-56 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                                            spellCheck={false}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">JS strony</div>

                                        <textarea
                                            name="js"
                                            defaultValue={page.js ?? ""}
                                            className="min-h-56 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                                            spellCheck={false}
                                            placeholder="console.log(window.__REPORT__);"
                                        />
                                    </div>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">
                                            Warunek widoczności JSON
                                        </div>

                                        <textarea
                                            name="visibilityCondition"
                                            value={visibilityConditionText}
                                            onChange={(event) =>
                                                setVisibilityConditionText(event.target.value)
                                            }
                                            className="min-h-44 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                                            spellCheck={false}
                                            placeholder={
                                                '{ "type": "score", "category": "vMEME", "code": "TRADITION", "metric": "weightedMeanScore", "operator": "gte", "value": 2 }'
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">
                                            Component bindings JSON
                                        </div>

                                        <textarea
                                            name="componentBindings"
                                            value={componentBindingsText}
                                            onChange={(event) =>
                                                setComponentBindingsText(event.target.value)
                                            }
                                            className="min-h-44 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                                            spellCheck={false}
                                            placeholder={
                                                '[{ "slot": "chart-1", "component": "DimensionBarChart", "props": { "category": "vMEME" } }]'
                                            }
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-sm font-medium">Config JSON</div>

                                        <textarea
                                            name="config"
                                            value={configText}
                                            onChange={(event) => setConfigText(event.target.value)}
                                            className="min-h-44 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                                            spellCheck={false}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex flex-col gap-2 rounded-xl border bg-background p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Eye size={16} />
                                            Podgląd A4
                                        </div>

                                        <select
                                            value={previewWidth}
                                            onChange={(event) => setPreviewWidth(Number(event.target.value))}
                                            className="h-9 rounded-md border bg-background px-2 text-xs"
                                        >
                                            <option value={420}>Wąski · 420 px</option>
                                            <option value={520}>Średni · 520 px</option>
                                            <option value={620}>Duży · 620 px</option>
                                            <option value={760}>Pełniejszy · 760 px</option>
                                            <option value={900}>Szeroki · 900 px</option>
                                        </select>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        Zwiększ szerokość, jeśli chcesz widzieć całą stronę A4 bardziej czytelnie.
                                        Przy mniejszej szerokości podgląd może być skalowany albo przewijany,
                                        zależnie od ustawień ramki.
                                    </p>
                                </div>

                                <ReportA4PreviewFrame
                                    page={page}
                                    reportTemplateVersion={reportTemplateVersion}
                                    pageSizeClass={getPageSizeClass({
                                        pageSize: reportTemplateVersion.pageSize,
                                        orientation: reportTemplateVersion.orientation,
                                    })}
                                />
                            </div>
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

                        <div className="flex flex-wrap items-center gap-2">
                            <Button type="submit" disabled={isPending}>
                                {isPending ? "Zapisywanie..." : "Zapisz stronę"}
                            </Button>
                        </div>
                    </form>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
                        <ReorderReportTemplatePageButtons pageId={page.id} />

                        <ArchiveReportTemplatePageButton page={page} />
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export function ReportTemplateVersionEditor({
    reportTemplateVersion,
}: ReportTemplateVersionEditorProps) {
    const [selectedPageId, setSelectedPageId] = useState<string | null>(
        reportTemplateVersion.pages?.[0]?.id ?? null,
    );

    const pages = useMemo(
        () =>
            [...(reportTemplateVersion.pages ?? [])].sort(
                (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
            ),
        [reportTemplateVersion.pages],
    );

    return (
        <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                        <LayoutTemplate size={14} />
                        Szablon
                    </div>
                    <div className="mt-2 font-semibold">
                        {reportTemplateVersion.reportTemplateCode}
                    </div>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <div className="text-xs uppercase text-muted-foreground">Status</div>
                    <div className="mt-2 font-semibold">
                        {reportTemplateVersion.status}
                    </div>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <div className="text-xs uppercase text-muted-foreground">Format</div>
                    <div className="mt-2 font-semibold">
                        {reportTemplateVersion.pageSize ?? "A4"} ·{" "}
                        {reportTemplateVersion.orientation ?? "portrait"}
                    </div>
                </div>

                <div className="rounded-2xl border bg-card p-5">
                    <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                        <FileText size={14} />
                        Strony
                    </div>
                    <div className="mt-2 font-semibold">{pages.length}</div>
                </div>
            </section>

            <ReportTemplateVersionSettingsForm
                reportTemplateVersion={reportTemplateVersion}
            />

            <ReportDataReferencePanel />
            <CreateReportTemplatePageForm
                reportTemplateVersionId={reportTemplateVersion.id}
            />

            <section className="space-y-4">
                <div>
                    <h2 className="text-xl font-semibold">Strony raportu</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Każda strona jest edytowana jako osobny arkusz A4. Możesz używać HTML,
                        CSS, JS oraz wiązać sloty z komponentami aplikacji.
                    </p>
                </div>

                {pages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                        Ten raport nie ma jeszcze stron.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pages.map((page) => (
                            <ReportTemplatePageEditor
                                key={page.id}
                                page={page}
                                reportTemplateVersion={reportTemplateVersion}
                                selected={selectedPageId === page.id}
                                onSelect={() =>
                                    setSelectedPageId((previous) =>
                                        previous === page.id ? null : page.id,
                                    )
                                }
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}