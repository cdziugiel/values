// features/report-access/components/report-access-admin-page.tsx

"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Archive,
  CheckCircle2,
  Copy,
  FileText,
  KeyRound,
  PackagePlus,
  PlusCircle,
  ReceiptText,
  Save,
  ShieldCheck,
  Ticket,
  TriangleAlert,
} from "lucide-react";

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

type ReportAccessTenantOption = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

type ReportAccessAdminPageProps = {
  data: {
    templates: any[];
    products: any[];
    availableTenants: ReportAccessTenantOption[];
    recentCodes: any[];
  };
};

type TenantAutocompleteProps = {
  tenants: ReportAccessTenantOption[];
  disabled?: boolean;
};

type TenantAutocompleteOption = {
  id: string;
  slug: string;
  name: string;
  isGlobal?: boolean;
};

function TenantAutocomplete({
  tenants,
  disabled = false,
}: TenantAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedValue, setSelectedValue] = useState("");

  const options = useMemo<TenantAutocompleteOption[]>(
    () => [
      ...tenants.map((tenant) => ({
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      })),
      {
        id: "__GLOBAL__",
        slug: "__GLOBAL__",
        name: "Wszystkie tenanty — kod globalny",
        isGlobal: true,
      },
    ],
    [tenants],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pl-PL");

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      const searchableValue = [
        option.name,
        option.slug,
        option.isGlobal ? "globalny wszystkie tenanty" : "",
      ]
        .join(" ")
        .toLocaleLowerCase("pl-PL");

      return searchableValue.includes(normalizedQuery);
    });
  }, [options, query]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function selectOption(option: TenantAutocompleteOption) {
    setSelectedValue(option.slug);

    setQuery(
      option.isGlobal
        ? option.name
        : `${option.name} (${option.slug})`,
    );

    setIsOpen(false);
  }

  function clearSelection() {
    setSelectedValue("");
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="hidden"
        name="tenantSlug"
        value={selectedValue}
      />

      <div className="relative">
        <input
          type="text"
          value={query}
          disabled={disabled}
          placeholder="Wyszukaj tenanta..."
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="tenant-autocomplete-options"
          aria-autocomplete="list"
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedValue("");
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setIsOpen(false);
            }

            if (
              event.key === "Enter" &&
              isOpen &&
              filteredOptions.length === 1
            ) {
              event.preventDefault();
              selectOption(filteredOptions[0]);
            }
          }}
          className={[
            "h-11 w-full rounded-2xl border bg-white px-3 pr-10 text-sm outline-none",
            "focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40",
            selectedValue
              ? "border-black/10"
              : "border-black/10",
            disabled
              ? "cursor-not-allowed opacity-50"
              : "",
          ].join(" ")}
        />

        {query ? (
          <button
            type="button"
            onClick={clearSelection}
            disabled={disabled}
            aria-label="Wyczyść wybór tenanta"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-sm text-[#6b7280] transition hover:bg-black/5 hover:text-[#171717]"
          >
            ×
          </button>
        ) : null}
      </div>

      {isOpen && !disabled ? (
        <div
          id="tenant-autocomplete-options"
          role="listbox"
          className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-black/10 bg-white p-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.16)]"
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-4 text-sm text-[#6b7280]">
              Nie znaleziono tenanta.
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selectedValue === option.slug;

              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => selectOption(option)}
                  className={[
                    "flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition",
                    isSelected
                      ? "bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
                      : "text-[#171717] hover:bg-black/[0.04]",
                    option.isGlobal
                      ? "mt-1 border-t border-black/10"
                      : "",
                  ].join(" ")}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {option.name}
                    </span>

                    {!option.isGlobal ? (
                      <span className="mt-0.5 block truncate font-mono text-xs text-[#6b7280]">
                        {option.slug}
                      </span>
                    ) : (
                      <span className="mt-0.5 block text-xs text-amber-700">
                        Kod będzie działał niezależnie od tenanta.
                      </span>
                    )}
                  </span>

                  {isSelected ? (
                    <span
                      aria-hidden="true"
                      className="shrink-0 text-sm font-semibold"
                    >
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}

      {!selectedValue && query ? (
        <p className="mt-1.5 text-xs text-amber-700">
          Wybierz pozycję z listy. Samo wpisanie nazwy nie
          przypisuje tenanta.
        </p>
      ) : null}
    </div>
  );
}

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

  if (!Number.isFinite(numberValue)) return "—";

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
  }).format(numberValue);
}

function statusLabel(status: string | null | undefined) {
  switch (status) {
    case "active":
      return "Aktywny";
    case "draft":
      return "Roboczy";
    case "archived":
      return "Archiwalny";
    case "available":
      return "Dostępny";
    case "assigned":
      return "Przypisany";
    case "redeemed":
      return "Użyty";
    case "revoked":
      return "Unieważniony";
    default:
      return status ?? "—";
  }
}

function statusBadgeClassName(status: string | null | undefined) {
  if (status === "active" || status === "available") {
    return "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]";
  }

  if (status === "draft" || status === "assigned") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "archived" || status === "revoked") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-black/10 bg-white/70 text-[#6b7280]";
}

function ActionMessage({ state }: { state: ReportAccessAdminActionState }) {
  if (state.status === "idle") return null;

  return (
    <div
      className={[
        "rounded-[1.25rem] border px-4 py-3 text-sm leading-6",
        state.status === "success"
          ? "border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] text-[#0f766e]"
          : "border-red-200 bg-red-50 text-red-700",
      ].join(" ")}
    >
      <div className="flex gap-2">
        {state.status === "success" ? (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
        ) : (
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
        )}
        <span>{state.message}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClassName(
        status,
      )}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium text-[#171717]">{children}</label>;
}

function SelectField(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={[
        "h-11 rounded-2xl border border-black/10 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#2dd4bf]/40",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function CreateProductForm({ templates }: { templates: any[] }) {
  const [state, formAction, isPending] = useActionState(
    createReportAccessProductAction,
    initialState,
  );

  return (
    <section className="rounded-[2rem] hv-brand-card">
      <form action={formAction} className="grid gap-6 p-5 md:p-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <PackagePlus size={20} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
              Produkt raportowy
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Utwórz produkt dostępu do raportu.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280]">
              Produkt określa typ raportu, cenę, liczbę dostępów i template,
              który może zostać odblokowany przez zakup albo kod dostępu.
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5 md:col-span-3">
              <FieldLabel>Template raportu</FieldLabel>
              <SelectField name="reportTemplateId" required>
                <option value="">Wybierz template raportu</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.code})
                  </option>
                ))}
              </SelectField>
            </div>

<div className="space-y-1.5">
  <FieldLabel>Kod</FieldLabel>

  <Input
    name="code"
    placeholder="INDIVIDUAL_REPORT_ACCESS"
    required
    className="h-11 rounded-2xl border-black/10 bg-white font-mono text-sm"
  />
</div>

            <div className="space-y-1.5 md:col-span-2">
              <FieldLabel>Nazwa</FieldLabel>
              <Input
                name="name"
                placeholder="Dostęp do raportu indywidualnego"
                required
                className="h-11 rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-1.5 md:col-span-3">
              <FieldLabel>Opis</FieldLabel>
              <Input
                name="description"
                placeholder="Opis produktu widoczny technicznie w panelu admina"
                className="h-11 rounded-2xl border-black/10 bg-white"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-6">
            <div className="space-y-1.5">
              <FieldLabel>Status</FieldLabel>
              <SelectField name="status" defaultValue="draft">
                <option value="draft">Roboczy</option>
                <option value="active">Aktywny</option>
                <option value="archived">Archiwalny</option>
              </SelectField>
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Dostępy</FieldLabel>
              <Input
                name="accessCount"
                type="number"
                min={1}
                defaultValue="1"
                className="h-11 rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Waluta</FieldLabel>
              <Input
                name="currency"
                defaultValue="PLN"
                className="h-11 rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Netto</FieldLabel>
              <Input
                name="priceNet"
                type="number"
                step="0.01"
                placeholder="netto"
                className="h-11 rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>VAT</FieldLabel>
              <Input
                name="vatRate"
                type="number"
                step="0.01"
                defaultValue="23"
                className="h-11 rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>Brutto</FieldLabel>
              <Input
                name="priceGross"
                type="number"
                step="0.01"
                placeholder="99.00"
                required
                className="h-11 rounded-2xl border-black/10 bg-white"
              />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <ActionMessage state={state} />

            <Button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
            >
              <PlusCircle size={16} />
              {isPending ? "Tworzenie..." : "Utwórz produkt"}
            </Button>
          </div>
        </div>
      </form>
    </section>
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
    <article className="group relative overflow-hidden rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-black/20 hover:shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#171717] to-[#2dd4bf] opacity-0 transition group-hover:opacity-100" />

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="productId" value={product.id} />

        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm text-[#6b7280]">
              {product.reportTemplateName} ({product.reportTemplateCode})
            </div>

            <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#171717]">
              {product.name}
            </h3>

            <p className="mt-1 text-xs text-[#8b9099]">
              Ostatnia aktualizacja: {formatDate(product.updatedAt)}
            </p>
          </div>

          <StatusBadge status={product.status} />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Input
            name="code"
            defaultValue={product.code}
            required
            className="h-11 rounded-2xl border-black/10 bg-white font-mono text-sm"
          />
          <Input
            name="name"
            defaultValue={product.name}
            required
            className="h-11 rounded-2xl border-black/10 bg-white"
          />

          <SelectField name="status" defaultValue={product.status}>
            <option value="draft">Roboczy</option>
            <option value="active">Aktywny</option>
            <option value="archived">Archiwalny</option>
          </SelectField>
        </div>

        <Input
          name="description"
          defaultValue={product.description ?? ""}
          placeholder="Opis produktu"
          className="h-11 rounded-2xl border-black/10 bg-white"
        />

        <div className="grid gap-3 md:grid-cols-5">
          <Input
            name="accessCount"
            type="number"
            min={1}
            defaultValue={String(product.accessCount ?? 1)}
            className="h-11 rounded-2xl border-black/10 bg-white"
          />

          <Input
            name="currency"
            defaultValue={product.currency ?? "PLN"}
            className="h-11 rounded-2xl border-black/10 bg-white"
          />

          <Input
            name="priceNet"
            type="number"
            step="0.01"
            defaultValue={String(product.priceNet ?? "")}
            className="h-11 rounded-2xl border-black/10 bg-white"
          />

          <Input
            name="vatRate"
            type="number"
            step="0.01"
            defaultValue={String(product.vatRate ?? "23")}
            className="h-11 rounded-2xl border-black/10 bg-white"
          />

          <Input
            name="priceGross"
            type="number"
            step="0.01"
            defaultValue={String(product.priceGross ?? "")}
            required
            className="h-11 rounded-2xl border-black/10 bg-white"
          />
        </div>

        <div className="rounded-[1.25rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4 text-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f766e]">
            Cena brutto
          </div>
          <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[#171717]">
            {formatMoney(product.priceGross, product.currency)}
          </div>
        </div>

        <ActionMessage state={state} />

        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-[#171717] text-white hover:bg-[#2a2a2a]"
          >
            <Save size={14} />
            {isPending ? "Zapisywanie..." : "Zapisz produkt"}
          </Button>
        </div>
      </form>

      <form
        action={archiveAction}
        className="mt-4 border-t border-black/10 pt-4"
        onSubmit={(event) => {
          if (!window.confirm(`Zarchiwizować produkt "${product.name}"?`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="productId" value={product.id} />

        <Button
          type="submit"
          variant="outline"
          disabled={isArchivePending}
          className="rounded-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
        >
          <Archive size={14} />
          {isArchivePending ? "Archiwizowanie..." : "Archiwizuj produkt"}
        </Button>

        <div className="mt-3">
          <ActionMessage state={archiveState} />
        </div>
      </form>
    </article>
  );
}

function GenerateCodesForm({
  products,
  availableTenants,
}: {
  products: any[];
  availableTenants: ReportAccessTenantOption[];
}) {
  const [state, formAction, isPending] = useActionState(
    generateReportAccessCodesAction,
    initialState,
  );

  const activeProducts = products.filter(
    (product) => product.status === "active",
  );

  return (
    <section className="rounded-[2rem] hv-brand-card">
      <form
        action={formAction}
        className="grid gap-6 p-5 md:p-6 lg:grid-cols-[0.8fr_1.2fr]"
      >
        <div className="space-y-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <KeyRound size={20} />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
              Kody dostępu
            </p>

            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#171717]">
              Wygeneruj kody do raportów.
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#6b7280]">
              Pełne kody pojawią się tylko po wygenerowaniu.
              Skopiuj je od razu i przekaż respondentowi albo
              wykorzystaj w procesie zaproszenia.
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5">
              <FieldLabel>Produkt</FieldLabel>

              <SelectField
                name="productId"
                required
                defaultValue=""
                className="w-full"
              >
                <option value="" disabled>
                  Wybierz produkt
                </option>

                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.code})
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="space-y-1.5">
  <FieldLabel>Zakres tenanta</FieldLabel>

  <TenantAutocomplete tenants={availableTenants} />
</div>

            <div className="space-y-1.5">
              <FieldLabel>Liczba kodów</FieldLabel>

              <Input
                name="quantity"
                type="number"
                min={1}
                max={100}
                defaultValue="1"
                required
                className="h-11 rounded-2xl border-black/10 bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>E-mail respondenta</FieldLabel>

              <Input
                name="assignedToEmail"
                type="email"
                placeholder="opcjonalnie"
                className="h-11 rounded-2xl border-black/10 bg-white"
              />
            </div>
          </div>

          <div className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            Wybranie opcji „Wszystkie tenanty — kod globalny”
            oznacza, że kod będzie mógł zostać wykorzystany
            w dowolnym tenancie. Po wykorzystaniu grant zostanie
            przypisany do konkretnego tenanta i sesji.
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <FieldLabel>ID projektu</FieldLabel>

              <Input
                name="assessmentProjectId"
                placeholder="opcjonalnie"
                className="h-11 rounded-2xl border-black/10 bg-white font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>ID linku zaproszenia</FieldLabel>

              <Input
                name="assessmentAccessLinkId"
                placeholder="opcjonalnie"
                className="h-11 rounded-2xl border-black/10 bg-white font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>ID sesji</FieldLabel>

              <Input
                name="assessmentSessionId"
                placeholder="opcjonalnie"
                className="h-11 rounded-2xl border-black/10 bg-white font-mono text-xs"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.2fr]">
            <div className="space-y-1.5">
              <FieldLabel>ID użytkownika</FieldLabel>

              <Input
                name="assignedToUserId"
                placeholder="opcjonalnie"
                className="h-11 rounded-2xl border-black/10 bg-white font-mono text-xs"
              />
            </div>

            <div className="rounded-[1.25rem] border border-black/10 bg-white/60 px-4 py-3 text-xs leading-5 text-[#6b7280]">
              Kod może być przypisany do projektu, linku
              zaproszenia, konkretnej sesji, adresu e-mail albo
              użytkownika. Przy zakończeniu badania system spróbuje
              automatycznie utworzyć grant.
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <ActionMessage state={state} />

            {state.generatedCodes &&
            state.generatedCodes.length > 0 ? (
              <div className="rounded-[1.5rem] border border-[rgba(45,212,191,0.32)] bg-[rgba(45,212,191,0.14)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#171717]">
                  <Copy size={15} />
                  Wygenerowane kody — skopiuj teraz
                </div>

                <div className="mt-3 grid gap-2">
                  {state.generatedCodes.map((code) => (
                    <div
                      key={code}
                      className="rounded-xl border border-black/10 bg-white px-3 py-2 font-mono text-sm text-[#171717]"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <Button
              type="submit"
        disabled={
          isPending ||
          activeProducts.length === 0
        }
              className="rounded-full bg-[#171717] text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#2a2a2a]"
            >
              <KeyRound size={16} />

              {isPending
                ? "Generowanie..."
                : "Wygeneruj kody"}
            </Button>

            {activeProducts.length === 0 ? (
              <p className="text-sm text-[#6b7280]">
                Nie masz jeszcze aktywnego produktu. Utwórz
                produkt i ustaw jego status jako aktywny.
              </p>
            ) : null}

            {availableTenants.length === 0 ? (
              <p className="text-sm text-red-700">
                Nie znaleziono żadnych aktywnych tenantów.
              </p>
            ) : null}
          </div>
        </div>
      </form>
    </section>
  );
}

function RecentCodesTable({ codes }: { codes: any[] }) {
  const [state, formAction, isPending] = useActionState(
    revokeReportAccessCodeAction,
    initialState,
  );

  return (
    <section className="rounded-[2rem] hv-brand-card">
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
            <Ticket size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
              Ostatnie kody dostępu
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
              Pełne kody nie są przechowywane jawnie — widzisz tylko podgląd.
            </p>
          </div>
        </div>
      </div>

      {codes.length === 0 ? (
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm text-[#6b7280]">
            Brak wygenerowanych kodów.
          </div>
        </div>
      ) : (
        <div className="px-5 pb-5 md:px-6 md:pb-6">
          <div className="overflow-hidden rounded-[1.5rem] border border-black/10 bg-white/70">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1020px] text-left text-sm">
                <thead className="border-b border-black/10 bg-[#f7f7f8] text-xs uppercase tracking-[0.12em] text-[#6b7280]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Kod</th>
                    <th className="px-4 py-3 font-semibold">Produkt</th>
                    <th className="px-4 py-3 font-semibold">Tenant</th>
                    <th className="px-4 py-3 font-semibold">Przypisanie</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Utworzono</th>
                    <th className="px-4 py-3 text-right font-semibold">Akcja</th>
                  </tr>
                </thead>

                <tbody>
                  {codes.map((code) => (
                    <tr key={code.id} className="border-b border-black/10 last:border-0">
                      <td className="px-4 py-4 font-mono text-xs text-[#171717]">
                        {code.codePreview}
                      </td>

                      <td className="px-4 py-4">
                        <div className="font-semibold text-[#171717]">{code.productName}</div>
                        <div className="font-mono text-xs text-[#6b7280]">{code.productCode}</div>
                      </td>

                      <td className="px-4 py-4 text-[#171717]">
                        {code.tenantSlug ? (
                          <span className="font-mono text-xs">
                            {code.tenantSlug}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            Globalny
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1 text-xs text-[#6b7280]">
                          {code.assignedToEmail ? <div>e-mail: <span className="font-mono text-[#171717]">{code.assignedToEmail}</span></div> : null}
                          {code.assignedToUserId ? <div>user: <span className="font-mono text-[#171717]">{code.assignedToUserId}</span></div> : null}
                          {code.assessmentProjectId ? <div>project: <span className="font-mono text-[#171717]">{code.assessmentProjectId}</span></div> : null}
                          {code.assessmentAccessLinkId ? <div>link: <span className="font-mono text-[#171717]">{code.assessmentAccessLinkId}</span></div> : null}
                          {code.assessmentSessionId ? <div>session: <span className="font-mono text-[#171717]">{code.assessmentSessionId}</span></div> : null}
                          {!code.assignedToEmail && !code.assignedToUserId && !code.assessmentProjectId && !code.assessmentAccessLinkId && !code.assessmentSessionId ? <span>wolny kod</span> : null}
                        </div>
                      </td>

                      <td className="px-4 py-4"><StatusBadge status={code.status} /></td>
                      <td className="px-4 py-4 text-[#6b7280]">{formatDate(code.createdAt)}</td>

                      <td className="px-4 py-4 text-right">
                        {code.status === "available" || code.status === "assigned" ? (
                          <form action={formAction}>
                            <input type="hidden" name="codeId" value={code.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              className="rounded-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                            >
                              Unieważnij
                            </Button>
                          </form>
                        ) : (
                          <span className="text-xs text-[#6b7280]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4">
            <ActionMessage state={state} />
          </div>
        </div>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-[2rem] border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
            {label}
          </p>
          <div className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-[#171717]">
            {value}
          </div>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#171717]">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#6b7280]">{helper}</p>
    </article>
  );
}

export function ReportAccessAdminPage({ data }: ReportAccessAdminPageProps) {
  const activeProductsCount = data.products.filter(
    (product) => product.status === "active",
  ).length;
  const availableCodesCount = data.recentCodes.filter(
    (code) => code.status === "available",
  ).length;
  const assignedCodesCount = data.recentCodes.filter(
    (code) => code.status === "assigned",
  ).length;

  return (

    <div className="-mx-4 -my-6 min-h-[calc(100vh-4rem)] hv-brand-surface px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] hv-brand-card">
          <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto] md:items-end md:p-8 lg:p-10">
            <div className="max-w-4xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 hv-brand-pill">
                <ShieldCheck size={14} />
                <span className="hv-brand-eyebrow text-[0.68rem]">
                  Dostępy raportowe
                </span>
              </div>

              <h1 className="max-w-3xl text-3xl font-semibold leading-[1.05] tracking-[-0.045em] text-[#171717] md:text-5xl">
                Produkty, ceny i kody dostępu do raportów.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-[#6b7280]">
                Zarządzaj produktami raportowymi, konfiguruj ceny i generuj
                kody, które mogą odblokowywać raporty poza standardową
                płatnością.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-black/10 bg-white/70 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                  <ReceiptText size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#171717]">Aktywne produkty</p>
                  <p className="mt-0.5 text-sm text-[#6b7280]">{activeProductsCount} / {data.products.length}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard
            label="Template'y"
            value={data.templates.length}
            helper="Dostępne szablony raportów."
            icon={<FileText size={20} />}
          />
          <MetricCard
            label="Produkty"
            value={data.products.length}
            helper={`Aktywne: ${activeProductsCount}`}
            icon={<ReceiptText size={20} />}
          />
          <MetricCard
            label="Kody dostępne"
            value={availableCodesCount}
            helper="Wolne kody z ostatniej listy."
            icon={<KeyRound size={20} />}
          />
          <MetricCard
            label="Kody przypisane"
            value={assignedCodesCount}
            helper="Kody przypisane do użytkownika lub kontekstu."
            icon={<Ticket size={20} />}
          />
        </section>

        <CreateProductForm templates={data.templates} />
        <GenerateCodesForm
          products={data.products}
          availableTenants={data.availableTenants}
        />

        <section className="rounded-[2rem] hv-brand-card">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between md:p-6">
            <div className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[rgba(45,212,191,0.14)] text-[#0f766e]">
                <ReceiptText size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#171717]">
                  Produkty raportowe
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#6b7280]">
                  Aktywne produkty będą widoczne w placeholderze zakupu raportu.
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 pb-5 md:px-6 md:pb-6">
            {data.products.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white/60 p-6 text-sm text-[#6b7280]">
                Brak produktów raportowych.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {data.products.map((product) => (
                  <ProductEditCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </section>

        <RecentCodesTable codes={data.recentCodes} />
      </div>
    </div>
  );
}
