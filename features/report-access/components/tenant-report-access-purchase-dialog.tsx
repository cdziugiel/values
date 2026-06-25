// features/report-access/components/tenant-report-access-purchase-dialog.tsx

"use client";
import { ApplyDiscountCodeForm } from "@/features/discount-codes/components/apply-discount-code-form";
import { useActionState, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  KeyRound,
  PlusCircle,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

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
  purchaseTenantReportAccessAction,
  type ReportAccessPurchaseState,
} from "../api/report-access-purchase.actions";

const initialState: ReportAccessPurchaseState = {
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

type TenantReportAccessPurchaseDialogProps = {
  tenantSlug: string;
  products: ReportAccessProductOption[];
  billingProfile?: BillingProfile | null;
};

type AppliedDiscount = {
  discountCode: string;
  discountCodeId: string;
  discountAmountCents: number;
  finalAmountCents: number;
  isFullyDiscounted: boolean;
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

function ActionMessage({
  status,
  message,
}: {
  status: "idle" | "success" | "error";
  message: string;
}) {
  if (status === "idle") return null;

  return (
    <div
      className={[
        "rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
        status === "success"
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <div className="flex gap-2">
        {status === "success" ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        ) : (
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        )}

        <span>{message}</span>
      </div>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-black/10 bg-white/70 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">
            {label}
          </p>
          <div className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#171717]">
            {value}
          </div>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function TextInput({
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  name: string;
  defaultValue?: string | null;
  placeholder: string;
  type?: string;
}) {
  return (
    <Input
      name={name}
      type={type}
      defaultValue={defaultValue ?? ""}
      placeholder={placeholder}
      className="rounded-2xl border-black/10 bg-white"
    />
  );
}

export function TenantReportAccessPurchaseDialog({
  tenantSlug,
  products,
  billingProfile,
}: TenantReportAccessPurchaseDialogProps) {
  const [state, formAction, isPending] = useActionState(
    purchaseTenantReportAccessAction,
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
const [appliedDiscount, setAppliedDiscount] = useState<AppliedDiscount | null>(
  null,
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

console.log("PRODUCTS", products)

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]">
          <PlusCircle size={16} />
          Kup dostępy
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[88vh] w-[min(1100px,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-[2rem] border-black/10 bg-white/95 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur md:min-w-[700px]">
        <div className="border-b border-black/10 bg-white/70 px-6 py-5 md:px-8">
          <DialogHeader>
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
              <KeyRound size={13} />
              Zakup dostępów raportowych
            </div>

            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Kup dostępy do raportów
            </DialogTitle>

            <DialogDescription className="max-w-3xl text-sm leading-6 text-[#6b7280]">
              Wybierz produkt i liczbę dostępów. Po potwierdzeniu dostępy trafią
              do globalnej puli partnera i będą mogły zostać nadane respondentom.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 md:p-8">
          {products.length === 0 ? (
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
              Brak aktywnych produktów dostępu do raportów.
            </div>
          ) : (
            <form action={formAction} className="space-y-6">
              <input type="hidden" name="tenantSlug" value={tenantSlug} />
              <input type="hidden" name="productId" value={selectedProductId} />
<input
  type="hidden"
  name="discountCode"
  value={appliedDiscount?.discountCode ?? ""}
/>
              <section className="rounded-[1.75rem] border border-black/10 bg-white/70 p-5 shadow-sm">
                <div className="mb-5">
                  <h3 className="font-semibold tracking-[-0.02em] text-[#171717]">
                    Produkt i liczba dostępów
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                    Zakup dotyczy puli partnera, nie konkretnego projektu.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#171717]">
                      Produkt / typ raportu
                    </label>

                    <select
                      value={selectedProductId}
                      onChange={(event) => {
  setSelectedProductId(event.target.value);
  setAppliedDiscount(null);
}}
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                    >
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} 
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#171717]">
                      Liczba dostępów
                    </label>

                    <Input
                      name="quantity"
                      type="number"
                      min={1}
                      max={500}
                      value={quantity}
                      onChange={(event) => {
  setQuantity(Number(event.target.value ?? 1));
  setAppliedDiscount(null);
}}
                      className="rounded-2xl border-black/10 bg-white h-11"
                    />
                  </div>
                </div>

                {selectedProduct ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <MiniMetric
                      label="Aktualnie wolne"
                      value={numberValue(selectedProduct.availableCount)}
                      icon={<KeyRound size={16} />}
                    />

                    <MiniMetric
                      label="Cena jednostkowa"
                      value={formatMoney(
                        selectedProduct.priceGross,
                        selectedProduct.currency ?? "PLN",
                      )}
                      icon={<CreditCard size={16} />}
                    />

                    <MiniMetric
                      label="Wartość"
                      value={formatMoney(
                        totalGross,
                        selectedProduct.currency ?? "PLN",
                      )}
                      icon={<ReceiptText size={16} />}
                    />
                  </div>
                ) : null}

              </section>
<section className="rounded-[1.75rem] border border-black/10 bg-white/70 p-5 shadow-sm">
  <div className="mb-5">
    <h3 className="font-semibold tracking-[-0.02em] text-[#171717]">
      Kod rabatowy
    </h3>
    <p className="mt-1 text-sm leading-6 text-[#6b7280]">
      Kod może obniżyć wartość zakupu częściowo albo pokryć całą kwotę.
    </p>
  </div>

  <ApplyDiscountCodeForm
    context="report_access_purchase"
    originalAmountCents={Math.round(totalGross * 100)}
    tenantId={null}
    onApplied={setAppliedDiscount}
  />

  {appliedDiscount ? (
    <div className="mt-4 rounded-[1.25rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.12)] px-4 py-3 text-sm leading-6 text-[#0f766e]">
      <div className="flex items-start gap-2">
        <CheckCircle2 size={16} className="mt-1 shrink-0" />
        <div>
          <p className="font-semibold">
            Kod zastosowany.
          </p>
          <p>
            Rabat:{" "}
            {formatMoney(
              appliedDiscount.discountAmountCents / 100,
              selectedProduct?.currency ?? "PLN",
            )}
          </p>
          <p>
            Do zapłaty:{" "}
            {formatMoney(
              appliedDiscount.finalAmountCents / 100,
              selectedProduct?.currency ?? "PLN",
            )}
          </p>
          {appliedDiscount.isFullyDiscounted ? (
            <p className="mt-1 font-medium">
              Kod pokrywa całą kwotę. Dostępy zostaną dodane bez płatności.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  ) : null}
</section>
              <section className="rounded-[1.75rem] border border-black/10 bg-white/70 p-5 shadow-sm">
                <label className="flex items-start gap-3 text-sm font-medium text-[#171717]">
                  <input
                    type="checkbox"
                    name="invoiceRequested"
                    checked={invoiceRequested}
                    onChange={(event) =>
                      setInvoiceRequested(event.target.checked)
                    }
                    className="mt-1"
                  />
                  <span>
                    Chcę podać dane do faktury
                    <span className="mt-1 block text-xs font-normal leading-5 text-[#6b7280]">
                      Dane mogą zostać zapisane jako profil billingowy partnera.
                    </span>
                  </span>
                </label>

                {invoiceRequested ? (
                  <div className="mt-5 space-y-4">
                    <input type="hidden" name="billingType" value={billingType} />

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={billingType === "company" ? "default" : "outline"}
                        className={
                          billingType === "company"
                            ? "rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
                            : "rounded-full border-black/10 bg-white/70 text-[#171717] hover:bg-white"
                        }
                        onClick={() => setBillingType("company")}
                      >
                        Firma
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={
                          billingType === "individual" ? "default" : "outline"
                        }
                        className={
                          billingType === "individual"
                            ? "rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
                            : "rounded-full border-black/10 bg-white/70 text-[#171717] hover:bg-white"
                        }
                        onClick={() => setBillingType("individual")}
                      >
                        Osoba fizyczna
                      </Button>
                    </div>

                    {billingType === "company" ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <TextInput
                          name="companyName"
                          defaultValue={billingProfile?.companyName}
                          placeholder="Nazwa firmy"
                        />

                        <TextInput
                          name="taxId"
                          defaultValue={billingProfile?.taxId}
                          placeholder="NIP"
                        />
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        <TextInput
                          name="firstName"
                          defaultValue={billingProfile?.firstName}
                          placeholder="Imię"
                        />

                        <TextInput
                          name="lastName"
                          defaultValue={billingProfile?.lastName}
                          placeholder="Nazwisko"
                        />
                      </div>
                    )}

                    <div className="grid gap-3 md:grid-cols-3">
                      <TextInput
                        name="billingEmail"
                        type="email"
                        defaultValue={billingProfile?.email}
                        placeholder="E-mail nabywcy"
                      />

                      <TextInput
                        name="invoiceEmail"
                        type="email"
                        defaultValue={billingProfile?.invoiceEmail}
                        placeholder="E-mail do faktury"
                      />

                      <TextInput
                        name="phone"
                        defaultValue={billingProfile?.phone}
                        placeholder="Telefon"
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-5">
                      <TextInput
                        name="country"
                        defaultValue={billingProfile?.country ?? "PL"}
                        placeholder="Kraj"
                      />

                      <TextInput
                        name="postalCode"
                        defaultValue={billingProfile?.postalCode}
                        placeholder="Kod pocztowy"
                      />

                      <TextInput
                        name="city"
                        defaultValue={billingProfile?.city}
                        placeholder="Miasto"
                      />

                      <TextInput
                        name="street"
                        defaultValue={billingProfile?.street}
                        placeholder="Ulica"
                      />

                      <TextInput
                        name="buildingNumber"
                        defaultValue={billingProfile?.buildingNumber}
                        placeholder="Nr budynku"
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <TextInput
                        name="apartmentNumber"
                        defaultValue={billingProfile?.apartmentNumber}
                        placeholder="Nr lokalu"
                      />

                      <label className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm text-[#171717]">
                        <input
                          type="checkbox"
                          name="saveBillingProfile"
                          defaultChecked
                        />
                        Zapisz jako profil billingowy partnera
                      </label>
                    </div>
                  </div>
                ) : null}
              </section>

              <ActionMessage status={state.status} message={state.message} />

              <div className="flex justify-end border-t border-black/10 pt-5">
                <Button
                  type="submit"
                  disabled={isPending || quantity < 1}
                  className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
                >
                  <PlusCircle size={16} />
                  {isPending
  ? "Przetwarzanie..."
  : appliedDiscount?.isFullyDiscounted
    ? `Dodaj dostępy (${quantity})`
    : `Kup dostępy (${quantity})`}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}