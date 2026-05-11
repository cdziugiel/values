# 01 — Zasady architektury HUMANET VALUES v2

## Cel systemu

HUMANET VALUES v2 jest platformą SaaS/enterprise do obsługi psychometrii, diagnozy wartości, projektów badawczych, raportów i pracy partnerów/tenantów.

System musi wspierać:

- administratora globalnego HUMANET,
- wielu tenantów/partnerów,
- klientów firmowych tenantów,
- respondentów wypełniających kwestionariusze,
- raporty indywidualne i grupowe,
- wersjonowanie narzędzi psychometrycznych,
- audytowalność dostępu i zmian,
- separację danych tenantów.

## Pryncypia architektoniczne

### 1. Security-first

Bezpieczeństwo nie jest dodatkiem. Każda funkcja musi być projektowana z założeniem, że system przetwarza dane poufne.

Każdy endpoint, Server Action, query i operacja mutująca dane muszą przejść przez:

```txt
authentication
→ tenant resolution
→ authorization
→ validation
→ business rules
→ audit log
→ safe response
```

### 2. Tenant isolation by design

Kod nie może zakładać, że wszystkie dane są w jednej bazie. Warstwa domenowa ma otrzymywać gotowy `TenantContext`, bez wiedzy o tym, jak fizycznie rozwiązano przechowywanie danych.

Niedozwolone:

```ts
connectToTenantDatabase(tenantSlug)
```

w komponencie, feature lub akcji UI.

Dozwolone:

```ts
const ctx = await requireTenantContext(params.tenantSlug);
const db = ctx.db;
```

### 3. Feature-oriented architecture

Każdy feature powinien zawierać własne komponenty, formularze, typy, walidacje, zapytania, mutacje i logikę domenową.

Nie tworzyć globalnego katalogu `components/` dla wszystkiego.

### 4. Server-controlled data access

Frontend nigdy nie powinien bezpośrednio decydować o zakresie danych. Wszystkie zapytania domenowe powinny przechodzić przez warstwę serwerową, repozytoria lub query services.

### 5. Version everything that matters psychometrically

Wersjonowane muszą być:

- kwestionariusze,
- itemy,
- skale,
- algorytmy scoringowe,
- szablony raportów,
- reguły interpretacji,
- normy i progi.

Każda sesja badawcza musi zapisać, jakiej wersji narzędzia użyto.

### 6. Minimize shared code

`shared/` jest tylko dla elementów rzeczywiście współdzielonych. Jeśli coś jest używane tylko w jednym module, zostaje w `features/<feature>/`.

### 7. No hidden business logic in UI

Komponenty UI mogą prezentować dane i obsługiwać interakcję, ale nie powinny zawierać krytycznej logiki bezpieczeństwa, scoringu, uprawnień ani izolacji tenantów.

### 8. Auditable by default

Każde istotne zdarzenie musi być audytowalne, szczególnie:

- logowanie,
- błędne logowanie,
- dostęp do wyników,
- eksport danych,
- generowanie raportu,
- zmiana kwestionariusza,
- zmiana scoringu,
- zmiana roli użytkownika,
- wejście administratora globalnego w dane tenanta.

### 9. Strict TypeScript

Kod ma być pisany w trybie ścisłym. Niedozwolone jest używanie `any`, chyba że zostanie wyraźnie uzasadnione i odizolowane.

### 10. Enterprise maintainability

Każdy moduł ma być możliwy do rozwoju bez przebudowy całej aplikacji. Unikać silnego sprzężenia, ukrytych zależności i importów krzyżowych między feature’ami.
