# 12 — Reguły pracy agenta kodującego

## Główna instrukcja

Agent ma kodować system HUMANET VALUES v2 jako aplikację klasy enterprise. Nie wolno iść na skróty, które naruszają bezpieczeństwo, izolację tenantów, wersjonowanie psychometryczne lub modularność architektury.

## Przed rozpoczęciem każdej funkcji

Agent powinien ustalić:

```txt
1. Jaki feature jest modyfikowany?
2. Czy funkcja dotyczy control DB czy tenant DB?
3. Jakie role mają dostęp?
4. Jakie dane są wrażliwe?
5. Czy potrzebny jest audit log?
6. Czy potrzebne jest wersjonowanie?
7. Czy istnieje ryzyko cross-tenant access?
8. Jakie są stany UI?
```

## Zasada minimalnej zmiany

Nie przebudowywać dużych części systemu bez potrzeby. Wprowadzać zmiany spójne z architekturą i najmniejsze wystarczające dla danego celu.

## Zasada braku zgadywania

Jeśli model danych lub wymaganie domenowe jest niejasne, agent powinien:

1. oprzeć się na tych instrukcjach,
2. użyć najbezpieczniejszego wariantu,
3. oznaczyć założenie komentarzem lub w notatce implementacyjnej,
4. nie tworzyć niejawnych zachowań biznesowych.

## Zakazane praktyki

```txt
[ ] Bezpośredni dostęp do DB w komponencie UI
[ ] Pomijanie TenantContext
[ ] Przechowywanie connection stringów w feature’ach
[ ] Logowanie danych psychometrycznych
[ ] Brak walidacji inputu na serwerze
[ ] Brak permission check w mutacji
[ ] Brak audytu dla dostępu do wyników/raportów
[ ] Edycja opublikowanej wersji kwestionariusza bez nowej wersji
[ ] Globalny shared/utils.ts jako worek na wszystko
[ ] Używanie any dla wygody
[ ] Publiczne URL-e do poufnych raportów
```

## Wzorzec implementacji nowego feature’a

1. Utwórz katalog w `features/<feature-name>`.
2. Dodaj typy domenowe.
3. Dodaj Zod schemas dla inputów.
4. Dodaj query/mutation w `api/`.
5. Dodaj permission checks.
6. Dodaj audit log dla mutacji i dostępu do danych wrażliwych.
7. Dodaj komponenty UI.
8. Dodaj loading/empty/error states.
9. Podepnij stronę w `app/`.
10. Dodaj testy krytyczne.

## Wzorzec mutacji

```ts
export async function mutation(input: unknown) {
  const ctx = await requireTenantContext();
  requirePermission(ctx, 'resource:action');

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error);
  }

  const result = await doBusinessOperation(ctx, parsed.data);

  await writeTenantAuditLog(ctx, {
    action: 'resource_action_done',
    entityType: 'resource',
    entityId: result.id,
  });

  return toSafeDto(result);
}
```

## Wzorzec odczytu danych

```ts
export async function query(input: unknown) {
  const ctx = await requireTenantContext();
  requirePermission(ctx, 'resource:read');

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error);
  }

  const rows = await repository.list(ctx, parsed.data);
  return rows.map(toSafeDto);
}
```

## Wzorzec komponentu strony

```tsx
export function FeaturePage() {
  return (
    <PageShell>
      <PageHeader title="..." description="..." />
      <FeatureToolbar />
      <FeatureContent />
    </PageShell>
  );
}
```

## Zasada raportów

Raporty muszą być generowane z wersjonowanych danych i mieć snapshot. Nie generować raportu wyłącznie dynamicznie z aktualnej definicji kwestionariusza, bo może się zmienić w przyszłości.

## Zasada scoringu

Scoring jest logiką domenową wysokiego ryzyka. Musi być:

```txt
testowany
wersjonowany
odtwarzalny
audytowany
oddzielony od UI
```

## Zasada respondentów

Flow respondenta musi być najprostszy możliwy, ale backend musi być rygorystyczny.

Nie wolno ufać tokenowi bez sprawdzenia:

```txt
hash tokenu
status sesji
termin ważności
status projektu
kompletność odpowiedzi
```

## Zasada komentarzy

Komentarze w kodzie powinny wyjaśniać decyzje architektoniczne, bezpieczeństwo i nietypowe ograniczenia. Nie komentować oczywistości.

## Finalna zasada

Jeśli istnieją dwie możliwe implementacje, agent ma wybrać tę, która jest:

```txt
bezpieczniejsza
bardziej jawna
łatwiejsza do audytu
bardziej zgodna z tenant isolation
bardziej odporna na przyszłą rozbudowę
```
