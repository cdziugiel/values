// features/partner-assessment/components/generate-report-access-pool-dialog.tsx

"use client";

import { useActionState, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  FileText,
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
        <Button
          type="button"
          variant="outline"
          className="gap-2 rounded-full border-black/10 bg-white/70 text-[#171717] shadow-sm hover:bg-white"
        >
          <PlusCircle size={16} />
          Uzupełnij pulę dostępów
        </Button>
      </DialogTrigger>

      <DialogContent className="md:min-w-[700px] max-h-[88vh] w-[min(1100px,calc(100vw-2rem))] max-w-none overflow-y-auto rounded-[2rem] border-black/10 bg-white/95 p-0 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur">
        <div className="border-b border-black/10 bg-white/70 px-6 py-5 md:px-8">
          <DialogHeader>
            <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] px-3 py-1 text-xs font-medium text-[#0f766e]">
              <KeyRound size={13} />
              Pula dostępów raportowych
            </div>

            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Uzupełnij pulę dostępów raportowych
            </DialogTitle>

            <DialogDescription className="max-w-3xl text-sm leading-6 text-[#6b7280]">
              Ten placeholder tworzy zamówienie testowe ze statusem opłaconym i
              generuje wolne dostępy dla partnera oraz projektu. W kolejnym
              etapie status płatności będzie nadawany przez bramkę płatniczą.
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
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="productId" value={selectedProductId} />

              <section className="rounded-[1.75rem] border border-black/10 bg-white/70 p-5 shadow-sm">
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                    <FileText size={18} />
                  </div>

                  <div>
                    <h3 className="font-semibold tracking-[-0.02em] text-[#171717]">
                      Produkt i liczba dostępów
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[#6b7280]">
                      Wybierz typ raportu i liczbę dostępów, które mają trafić
                      do puli projektu.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#171717]">
                      Produkt / typ raportu
                    </label>

                    <select
                      value={selectedProductId}
                      onChange={(event) => setSelectedProductId(event.target.value)}
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40"
                    >
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.code})
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
                      onChange={(event) =>
                        setQuantity(Number(event.target.value ?? 1))
                      }
                      className="rounded-2xl border-black/10 bg-white"
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
                      label="Wartość "
                      value={formatMoney(
                        totalGross,
                        selectedProduct.currency ?? "PLN",
                      )}
                      icon={<ReceiptText size={16} />}
                    />
                  </div>
                ) : null}

                <div className="mt-5 rounded-[1.25rem] border border-black/10 bg-white/60 p-4 text-xs leading-5 text-[#6b7280]">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-[#171717]">
                    <ShieldCheck size={14} />
                    Płatności
                  </div>
                  Na tym etapie tworzymy techniczne zamówienie testowe. Nie ma
                  jeszcze realnej płatności ani faktury, ale model danych jest
                  zgodny z przyszłym checkoutem.
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-black/10 bg-white/70 p-5 shadow-sm">
                <label className="flex items-start gap-3 text-sm font-medium text-[#171717]">
                  <input
                    type="checkbox"
                    name="invoiceRequested"
                    checked={invoiceRequested}
                    onChange={(event) => setInvoiceRequested(event.target.checked)}
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
                        className={
                          billingType === "company"
                            ? "rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
                            : "rounded-full border-black/10 bg-white/70 text-[#171717] hover:bg-white"
                        }
                        variant={billingType === "company" ? "default" : "outline"}
                        onClick={() => setBillingType("company")}
                      >
                        Firma
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        className={
                          billingType === "individual"
                            ? "rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
                            : "rounded-full border-black/10 bg-white/70 text-[#171717] hover:bg-white"
                        }
                        variant={
                          billingType === "individual" ? "default" : "outline"
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
                    ? "Generowanie..."
                    : `Utwórz zamówienie (${quantity})`}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
