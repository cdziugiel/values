# 11 — Checklisty jakości

## Checklist architektury feature’a

Przed uznaniem feature’a za gotowy sprawdź:

```txt
[ ] Feature ma własny katalog w features/
[ ] Ma publiczne API przez index.ts
[ ] Nie importuje prywatnych plików innych feature’ów
[ ] Ma osobne query i mutation
[ ] Ma walidację inputu
[ ] Ma obsługę loading/empty/error states
[ ] Ma testy przynajmniej dla krytycznej logiki
[ ] Nie zawiera logiki bezpieczeństwa wyłącznie w UI
[ ] Nie używa any bez uzasadnienia
```

## Checklist bezpieczeństwa mutacji

Każda mutacja musi mieć:

```txt
[ ] requireSession()
[ ] requireTenantContext(), jeśli dotyczy tenanta
[ ] requirePermission()
[ ] server-side validation
[ ] business validation
[ ] safe error handling
[ ] audit log
[ ] brak logowania danych wrażliwych
[ ] test odmowy dostępu
```

## Checklist endpointu API

```txt
[ ] Endpoint ma jasny kontrakt
[ ] Waliduje input
[ ] Waliduje metodę HTTP
[ ] Sprawdza auth
[ ] Sprawdza tenant access
[ ] Sprawdza permission
[ ] Zwraca DTO, nie surowy rekord DB
[ ] Nie ujawnia stack trace
[ ] Ma rate limit, jeśli publiczny lub wysokiego ryzyka
[ ] Loguje zdarzenia krytyczne
```

## Checklist tenant isolation

```txt
[ ] Dane są pobierane przez TenantContext
[ ] Feature nie zna connection stringa
[ ] Inny tenant nie może pobrać danych
[ ] Testy obejmują próbę dostępu cross-tenant
[ ] Super admin access jest audytowany
[ ] Brak globalnych zapytań do danych tenantowych bez uzasadnienia
```

## Checklist danych psychometrycznych

```txt
[ ] Kwestionariusz ma wersję
[ ] Scoring ma wersję
[ ] Raport ma wersję szablonu
[ ] Sesja zapisuje użyte wersje
[ ] Dane identyfikujące są oddzielone od odpowiedzi, jeśli możliwe
[ ] Dostęp do wyników jest ograniczony
[ ] Dostęp do raportu jest audytowany
[ ] Raport grupowy respektuje minimalne N
[ ] Eksport danych jest audytowany
```

## Checklist UI

```txt
[ ] Ekran ma PageHeader
[ ] Ekran ma loading state
[ ] Ekran ma empty state
[ ] Ekran ma error state
[ ] Akcje są czytelne
[ ] Formularze mają walidację inline
[ ] Komunikaty są zrozumiałe
[ ] Brak technicznych błędów dla użytkownika
[ ] UI działa responsywnie w wymaganym zakresie
[ ] Flow respondenta działa dobrze na mobile
```

## Checklist Drizzle/schema

```txt
[ ] Tabela ma poprawne nazewnictwo snake_case
[ ] Ma timestamps
[ ] Ma soft delete, jeśli dotyczy
[ ] Ma indeksy dla FK i filtrów
[ ] Migracja została wygenerowana i sprawdzona
[ ] Migracja nie niszczy danych bez procedury
[ ] Schemat control i tenant są rozdzielone
[ ] Typy są eksportowane tam, gdzie potrzebne
```

## Checklist przed commitem

```txt
[ ] TypeScript przechodzi bez błędów
[ ] Lint przechodzi
[ ] Formatowanie przechodzi
[ ] Testy krytyczne przechodzą
[ ] Brak console.log z danymi wrażliwymi
[ ] Brak zakomentowanego martwego kodu
[ ] Brak sekretów w kodzie
[ ] Brak any bez uzasadnienia
[ ] Brak bezpośrednich importów z prywatnych części innych feature’ów
```

## Checklist gotowości produkcyjnej modułu

```txt
[ ] Moduł ma obsługę uprawnień
[ ] Moduł ma audyt istotnych akcji
[ ] Moduł ma testy dostępu
[ ] Moduł ma obsługę błędów
[ ] Moduł ma monitoring/logowanie operacji krytycznych
[ ] Moduł nie ujawnia danych innych tenantów
[ ] Moduł ma sensowny UX dla pustych i błędnych stanów
[ ] Moduł nie łamie architektury folderów
```
