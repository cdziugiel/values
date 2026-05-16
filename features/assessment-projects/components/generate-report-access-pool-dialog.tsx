"use client";

import { useActionState, useMemo, useState } from "react";
import { PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import {
    generateProjectReportAccessPoolAction,
    type PartnerGrantReportAccessState,
} from "../api/partner-report-access.actions";

const initialState: PartnerGrantReportAccessState = {
    status: "idle",
    message: "",
};

type ReportAccessProductOption = {
    id: string;
    code: string;
    name: string;
    currency?: string | null;
    priceGross?: string | number | null;
    availableCount?: number | string | null;
};
type BillingProfile = {
    type?: string | null;
    companyName?: string | null;
    taxId?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    country?: string | null;
    postalCode?: string | null;
    city?: string | null;
    street?: string | null;
    buildingNumber?: string | null;
    apartmentNumber?: string | null;
    invoiceEmail?: string | null;
};

type GenerateReportAccessPoolDialogProps = {
    tenantSlug: string;
    projectId: string;
    products: ReportAccessProductOption[];
    billingProfile?: BillingProfile | null;
};
function numberValue(value: unknown) {
    const parsed = Number(value ?? 0);

    return Number.isFinite(parsed) ? parsed : 0;
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

export function GenerateReportAccessPoolDialog({
    tenantSlug,
    projectId,
    products,
    billingProfile,
}: GenerateReportAccessPoolDialogProps) {
    const [state, formAction, isPending] = useActionState(
        generateProjectReportAccessPoolAction,
        initialState,
    );

    const [selectedProductId, setSelectedProductId] = useState(
        products[0]?.id ?? "",
    );

    const [quantity, setQuantity] = useState(10);
    const [invoiceRequested, setInvoiceRequested] = useState(
        Boolean(billingProfile),
    );

    const [billingType, setBillingType] = useState(
        billingProfile?.type ?? "company",
    );
    const selectedProduct = useMemo(
        () => products.find((product) => product.id === selectedProductId) ?? null,
        [products, selectedProductId],
    );

    const unitGross = selectedProduct ? Number(selectedProduct.priceGross ?? 0) : 0;
    const totalGross =
        Number.isFinite(unitGross) && Number.isFinite(quantity)
            ? unitGross * quantity
            : 0;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" className="gap-2">
                    <PlusCircle size={16} />
                    Uzupełnij pulę dostępów
                </Button>
            </DialogTrigger>

            <DialogContent className="max-h-[88vh]  w-[min(1100px,calc(100vw-32px))] min-w-[50vw] max-w-[1000px] max-w-none overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Uzupełnij pulę dostępów raportowych</DialogTitle>
                    <DialogDescription>
                        Ten placeholder tworzy zamówienie testowe ze statusem opłaconym i generuje
                        wolne dostępy dla tenanta oraz projektu. W kolejnym etapie status paid będzie
                        nadawany przez bramkę płatniczą.
                    </DialogDescription>
                </DialogHeader>

                {products.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        Brak aktywnych produktów dostępu do raportów.
                    </div>
                ) : (
                    <form action={formAction} className="space-y-5">
                        <input type="hidden" name="tenantSlug" value={tenantSlug} />
                        <input type="hidden" name="projectId" value={projectId} />
                        <input type="hidden" name="productId" value={selectedProductId} />

                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px]">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Produkt / typ raportu
                                </label>

                                <select
                                    value={selectedProductId}
                                    onChange={(event) => setSelectedProductId(event.target.value)}
                                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                >
                                    {products.map((product) => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} ({product.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Liczba dostępów</label>

                                <Input
                                    name="quantity"
                                    type="number"
                                    min={1}
                                    max={500}
                                    value={quantity}
                                    onChange={(event) =>
                                        setQuantity(Number(event.target.value ?? 1))
                                    }
                                />
                            </div>
                        </div>

                        {selectedProduct ? (
                            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
                                <div className="grid gap-3 md:grid-cols-3">
                                    <div>
                                        <div className="text-xs uppercase text-muted-foreground">
                                            Aktualnie wolne
                                        </div>
                                        <div className="mt-1 text-xl font-semibold">
                                            {numberValue(selectedProduct.availableCount)}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs uppercase text-muted-foreground">
                                            Cena jednostkowa
                                        </div>
                                        <div className="mt-1 text-xl font-semibold">
                                            {formatMoney(
                                                selectedProduct.priceGross,
                                                selectedProduct.currency ?? "PLN",
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs uppercase text-muted-foreground">
                                            Wartość placeholder
                                        </div>
                                        <div className="mt-1 text-xl font-semibold">
                                            {formatMoney(
                                                totalGross,
                                                selectedProduct.currency ?? "PLN",
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-3 text-xs text-muted-foreground">
                                    Na tym etapie tworzymy techniczne zamówienie placeholder. Nie ma jeszcze
                                    realnej płatności ani faktury, ale model danych jest zgodny z przyszłym
                                    checkoutem.
                                </p>
                            </div>
                        ) : null}

                        {state.status !== "idle" ? (
                            <div
                                className={
                                    state.status === "success"
                                        ? "rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                                        : "rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                                }
                            >
                                {state.message}
                            </div>
                        ) : null}
                        <section className="space-y-4 rounded-xl border bg-background p-4">
                            <label className="flex items-center gap-2 text-sm font-medium">
                                <input
                                    type="checkbox"
                                    name="invoiceRequested"
                                    checked={invoiceRequested}
                                    onChange={(event) => setInvoiceRequested(event.target.checked)}
                                />
                                Chcę podać dane do faktury
                            </label>

                            {invoiceRequested ? (
                                <div className="space-y-4">
                                    <input type="hidden" name="billingType" value={billingType} />

                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={billingType === "company" ? "default" : "outline"}
                                            onClick={() => setBillingType("company")}
                                        >
                                            Firma
                                        </Button>

                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={billingType === "individual" ? "default" : "outline"}
                                            onClick={() => setBillingType("individual")}
                                        >
                                            Osoba fizyczna
                                        </Button>
                                    </div>

                                    {billingType === "company" ? (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <Input
                                                name="companyName"
                                                defaultValue={billingProfile?.companyName ?? ""}
                                                placeholder="Nazwa firmy"
                                            />

                                            <Input
                                                name="taxId"
                                                defaultValue={billingProfile?.taxId ?? ""}
                                                placeholder="NIP"
                                            />
                                        </div>
                                    ) : (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            <Input
                                                name="firstName"
                                                defaultValue={billingProfile?.firstName ?? ""}
                                                placeholder="Imię"
                                            />

                                            <Input
                                                name="lastName"
                                                defaultValue={billingProfile?.lastName ?? ""}
                                                placeholder="Nazwisko"
                                            />
                                        </div>
                                    )}

                                    <div className="grid gap-3 md:grid-cols-3">
                                        <Input
                                            name="billingEmail"
                                            defaultValue={billingProfile?.email ?? ""}
                                            placeholder="E-mail nabywcy"
                                        />

                                        <Input
                                            name="invoiceEmail"
                                            defaultValue={billingProfile?.invoiceEmail ?? ""}
                                            placeholder="E-mail do faktury"
                                        />

                                        <Input
                                            name="phone"
                                            defaultValue={billingProfile?.phone ?? ""}
                                            placeholder="Telefon"
                                        />
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-5">
                                        <Input
                                            name="country"
                                            defaultValue={billingProfile?.country ?? "PL"}
                                            placeholder="Kraj"
                                        />

                                        <Input
                                            name="postalCode"
                                            defaultValue={billingProfile?.postalCode ?? ""}
                                            placeholder="Kod pocztowy"
                                        />

                                        <Input
                                            name="city"
                                            defaultValue={billingProfile?.city ?? ""}
                                            placeholder="Miasto"
                                        />

                                        <Input
                                            name="street"
                                            defaultValue={billingProfile?.street ?? ""}
                                            placeholder="Ulica"
                                        />

                                        <Input
                                            name="buildingNumber"
                                            defaultValue={billingProfile?.buildingNumber ?? ""}
                                            placeholder="Nr budynku"
                                        />
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2">
                                        <Input
                                            name="apartmentNumber"
                                            defaultValue={billingProfile?.apartmentNumber ?? ""}
                                            placeholder="Nr lokalu"
                                        />

                                        <label className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                                            <input
                                                type="checkbox"
                                                name="saveBillingProfile"
                                                defaultChecked
                                            />
                                            Zapisz jako profil billingowy tenanta
                                        </label>
                                    </div>
                                </div>
                            ) : null}
                        </section>
                        <div className="flex justify-end border-t pt-4">
                            <Button type="submit" disabled={isPending || quantity < 1}>
                                {isPending
                                    ? "Generowanie..."
                                    : `Utwórz zamówienie (${quantity})`}
                            </Button>
                        </div>
                    </form>
                )}

            </DialogContent>
        </Dialog>
    );
}