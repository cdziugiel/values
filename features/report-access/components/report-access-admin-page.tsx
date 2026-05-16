"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
    archiveReportAccessProductAction,
    createReportAccessProductAction,
    generateReportAccessCodesAction,
    revokeReportAccessCodeAction,
    updateReportAccessProductAction,
    type ReportAccessAdminActionState,
} from "../api/report-access-admin.actions";

const initialState: ReportAccessAdminActionState = {
    status: "idle",
    message: "",
};

type ReportAccessAdminPageProps = {
    data: {
        templates: any[];
        products: any[];
        recentCodes: any[];
    };
};

function formatDate(value: unknown) {
    if (!value) return "—";

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("pl-PL", {
        timeZone: "Europe/Warsaw",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

function formatMoney(value: unknown, currency = "PLN") {
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue)) {
        return "—";
    }

    return new Intl.NumberFormat("pl-PL", {
        style: "currency",
        currency,
    }).format(numberValue);
}

function ActionMessage({ state }: { state: ReportAccessAdminActionState }) {
    if (state.status === "idle") {
        return null;
    }

    return (
        <div
            className={
                state.status === "success"
                    ? "rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
                    : "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            }
        >
            {state.message}
        </div>
    );
}

function CreateProductForm({ templates }: { templates: any[] }) {
    const [state, formAction, isPending] = useActionState(
        createReportAccessProductAction,
        initialState,
    );

    return (
        <form action={formAction} className="space-y-4 rounded-2xl border bg-card p-5">
            <div>
                <h2 className="text-lg font-semibold">Nowy produkt raportowy</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Produkt określa, jaki typ raportu można kupić lub odblokować kodem.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <select
                    name="reportTemplateId"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    required
                >
                    <option value="">Wybierz template raportu</option>
                    {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                            {template.name} ({template.code})
                        </option>
                    ))}
                </select>

                <Input name="code" placeholder="INDIVIDUAL_REPORT_ACCESS" required />

                <Input name="name" placeholder="Dostęp do raportu indywidualnego" required />
            </div>

            <Input
                name="description"
                placeholder="Opis produktu, widoczny technicznie w panelu admina"
            />

            <div className="grid gap-3 md:grid-cols-5">
                <select
                    name="status"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    defaultValue="draft"
                >
                    <option value="draft">draft</option>
                    <option value="active">active</option>
                    <option value="archived">archived</option>
                </select>

                <Input name="accessCount" type="number" min={1} defaultValue="1" />

                <Input name="currency" defaultValue="PLN" />

                <Input name="priceNet" type="number" step="0.01" placeholder="netto" />

                <Input name="vatRate" type="number" step="0.01" defaultValue="23" />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <Input
                    name="priceGross"
                    type="number"
                    step="0.01"
                    placeholder="brutto, np. 99.00"
                    required
                />
            </div>

            <ActionMessage state={state} />

            <Button type="submit" disabled={isPending}>
                {isPending ? "Tworzenie..." : "Utwórz produkt"}
            </Button>
        </form>
    );
}

function ProductEditCard({ product }: { product: any }) {
    const [state, formAction, isPending] = useActionState(
        updateReportAccessProductAction,
        initialState,
    );

    const [archiveState, archiveAction, isArchivePending] = useActionState(
        archiveReportAccessProductAction,
        initialState,
    );

    return (
        <div className="rounded-2xl border bg-card p-5">
            <form action={formAction} className="space-y-4">
                <input type="hidden" name="productId" value={product.id} />

                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="text-sm text-muted-foreground">
                            {product.reportTemplateName} ({product.reportTemplateCode})
                        </div>

                        <h3 className="mt-1 text-lg font-semibold">{product.name}</h3>

                        <p className="mt-1 text-xs text-muted-foreground">
                            Ostatnia aktualizacja: {formatDate(product.updatedAt)}
                        </p>
                    </div>

                    <div className="rounded-full border px-3 py-1 text-xs">
                        {product.status}
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                    <Input name="code" defaultValue={product.code} required />
                    <Input name="name" defaultValue={product.name} required />

                    <select
                        name="status"
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                        defaultValue={product.status}
                    >
                        <option value="draft">draft</option>
                        <option value="active">active</option>
                        <option value="archived">archived</option>
                    </select>
                </div>

                <Input
                    name="description"
                    defaultValue={product.description ?? ""}
                    placeholder="Opis produktu"
                />

                <div className="grid gap-3 md:grid-cols-5">
                    <Input
                        name="accessCount"
                        type="number"
                        min={1}
                        defaultValue={String(product.accessCount ?? 1)}
                    />

                    <Input name="currency" defaultValue={product.currency ?? "PLN"} />

                    <Input
                        name="priceNet"
                        type="number"
                        step="0.01"
                        defaultValue={String(product.priceNet ?? "")}
                    />

                    <Input
                        name="vatRate"
                        type="number"
                        step="0.01"
                        defaultValue={String(product.vatRate ?? "23")}
                    />

                    <Input
                        name="priceGross"
                        type="number"
                        step="0.01"
                        defaultValue={String(product.priceGross ?? "")}
                        required
                    />
                </div>

                <div className="rounded-xl border bg-muted/20 p-3 text-sm">
                    <div className="text-xs uppercase text-muted-foreground">Cena brutto</div>
                    <div className="mt-1 text-lg font-semibold">
                        {formatMoney(product.priceGross, product.currency)}
                    </div>
                </div>

                <ActionMessage state={state} />

                <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Zapisywanie..." : "Zapisz produkt"}
                    </Button>
                </div>
            </form>

            <form
                action={archiveAction}
                className="mt-3 border-t pt-3"
                onSubmit={(event) => {
                    if (!window.confirm(`Zarchiwizować produkt "${product.name}"?`)) {
                        event.preventDefault();
                    }
                }}
            >
                <input type="hidden" name="productId" value={product.id} />

                <Button type="submit" variant="destructive" disabled={isArchivePending}>
                    {isArchivePending ? "Archiwizowanie..." : "Archiwizuj produkt"}
                </Button>

                <div className="mt-2">
                    <ActionMessage state={archiveState} />
                </div>
            </form>
        </div>
    );
}

function GenerateCodesForm({ products }: { products: any[] }) {
    const [state, formAction, isPending] = useActionState(
        generateReportAccessCodesAction,
        initialState,
    );

    const activeProducts = products.filter((product) => product.status === "active");

    return (
        <form action={formAction} className="space-y-4 rounded-2xl border bg-card p-5">
            <div>
                <h2 className="text-lg font-semibold">Generuj kody dostępu</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Kody można później przekazać userowi albo przypisać do zaproszenia.
                    Pełna treść kodu pojawia się tylko po wygenerowaniu.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
                <select
                    name="productId"
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    required
                >
                    <option value="">Wybierz produkt</option>
                    {activeProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                            {product.name} ({product.code})
                        </option>
                    ))}
                </select>

                <Input name="tenantSlug" placeholder="tenant, np. humanet" />

                <Input
                    name="quantity"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue="1"
                />

                <Input
                    name="assignedToEmail"
                    placeholder="e-mail respondenta"
                />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                <Input
                    name="assessmentProjectId"
                    placeholder="assessmentProjectId"
                />

                <Input
                    name="assessmentAccessLinkId"
                    placeholder="assessmentAccessLinkId"
                />

                <Input
                    name="assessmentSessionId"
                    placeholder="assessmentSessionId"
                />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <Input
                    name="assignedToUserId"
                    placeholder="assignedToUserId"
                />

                <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Kod może być przypisany do projektu, linku zaproszenia, konkretnej sesji,
                    e-maila albo usera. Przy zakończeniu badania system spróbuje automatycznie
                    utworzyć grant.
                </div>
            </div>

            <ActionMessage state={state} />

            {state.generatedCodes && state.generatedCodes.length > 0 ? (
                <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="text-sm font-medium">
                        Wygenerowane kody — skopiuj teraz
                    </div>

                    <div className="mt-3 space-y-2">
                        {state.generatedCodes.map((code) => (
                            <div
                                key={code}
                                className="rounded-md border bg-background px-3 py-2 font-mono text-sm"
                            >
                                {code}
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <Button type="submit" disabled={isPending || activeProducts.length === 0}>
                {isPending ? "Generowanie..." : "Wygeneruj kody"}
            </Button>

            {activeProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    Nie masz jeszcze aktywnego produktu. Utwórz produkt i ustaw status
                    active.
                </p>
            ) : null}
        </form>
    );
}

function RecentCodesTable({ codes }: { codes: any[] }) {
    const [state, formAction, isPending] = useActionState(
        revokeReportAccessCodeAction,
        initialState,
    );

    return (
        <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="border-b p-5">
                <h2 className="text-lg font-semibold">Ostatnie kody dostępu</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Pełne kody nie są przechowywane jawnie — widzisz tylko podgląd.
                </p>
            </div>

            {codes.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">
                    Brak wygenerowanych kodów.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-muted/40">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Kod</th>
                                <th className="px-4 py-3 text-left font-medium">Produkt</th>
                                <th className="px-4 py-3 text-left font-medium">Tenant</th>
                                <th className="px-4 py-3 text-left font-medium">Przypisanie</th>
                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                <th className="px-4 py-3 text-left font-medium">Utworzono</th>
                                <th className="px-4 py-3 text-right font-medium">Akcja</th>
                            </tr>
                        </thead>

                        <tbody>
                            {codes.map((code) => (
                                <tr key={code.id} className="border-t">
                                    <td className="px-4 py-3 font-mono text-xs">
                                        {code.codePreview}
                                    </td>

                                    <td className="px-4 py-3">
                                        <div className="font-medium">{code.productName}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {code.productCode}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3">{code.tenantSlug ?? "—"}</td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-1 text-xs">
                                            {code.assignedToEmail ? (
                                                <div>
                                                    e-mail: <span className="font-mono">{code.assignedToEmail}</span>
                                                </div>
                                            ) : null}

                                            {code.assignedToUserId ? (
                                                <div>
                                                    user: <span className="font-mono">{code.assignedToUserId}</span>
                                                </div>
                                            ) : null}

                                            {code.assessmentProjectId ? (
                                                <div>
                                                    project: <span className="font-mono">{code.assessmentProjectId}</span>
                                                </div>
                                            ) : null}

                                            {code.assessmentAccessLinkId ? (
                                                <div>
                                                    link: <span className="font-mono">{code.assessmentAccessLinkId}</span>
                                                </div>
                                            ) : null}

                                            {code.assessmentSessionId ? (
                                                <div>
                                                    session: <span className="font-mono">{code.assessmentSessionId}</span>
                                                </div>
                                            ) : null}

                                            {!code.assignedToEmail &&
                                                !code.assignedToUserId &&
                                                !code.assessmentProjectId &&
                                                !code.assessmentAccessLinkId &&
                                                !code.assessmentSessionId ? (
                                                <span className="text-muted-foreground">wolny kod</span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{code.status}</td>
                                    <td className="px-4 py-3">{formatDate(code.createdAt)}</td>

                                    <td className="px-4 py-3 text-right">
                                        {code.status === "available" || code.status === "assigned" ? (
                                            <form action={formAction}>
                                                <input type="hidden" name="codeId" value={code.id} />
                                                <Button
                                                    type="submit"
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={isPending}
                                                >
                                                    Unieważnij
                                                </Button>
                                            </form>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="p-4">
                <ActionMessage state={state} />
            </div>
        </div>
    );
}

export function ReportAccessAdminPage({ data }: ReportAccessAdminPageProps) {
    return (
        <div className="space-y-8">
            <section className="rounded-2xl border bg-card p-5">
                <h1 className="text-2xl font-semibold">
                    Dostępy do raportów
                </h1>

                <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                    Zarządzaj produktami raportowymi, cenami oraz kodami dostępu. Produkt
                    definiuje typ raportu, a kod umożliwia odblokowanie dostępu poza
                    standardową płatnością.
                </p>
            </section>

            <CreateProductForm templates={data.templates} />

            <GenerateCodesForm products={data.products} />

            <section className="space-y-4">
                <div>
                    <h2 className="text-xl font-semibold">Produkty raportowe</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Aktywne produkty będą widoczne w placeholderze zakupu raportu.
                    </p>
                </div>

                {data.products.length === 0 ? (
                    <div className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                        Brak produktów raportowych.
                    </div>
                ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                        {data.products.map((product) => (
                            <ProductEditCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </section>

            <RecentCodesTable codes={data.recentCodes} />
        </div>
    );
}