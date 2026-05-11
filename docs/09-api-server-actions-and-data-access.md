# 09 — API, Server Actions i dostęp do danych

## Zasada główna

Każda operacja dostępu do danych musi być kontrolowana po stronie serwera.

Komponenty UI nie mogą samodzielnie decydować o zakresie danych, uprawnieniach ani tenant isolation.

## Route Handlers vs Server Actions

### Route Handlers stosować dla:

```txt
API systemowego
integracji
webhooków
płatności
eksportów
operacji administracyjnych
operacji wymagających jawnego kontraktu API
publicznych endpointów respondentów
```

### Server Actions stosować dla:

```txt
prostych formularzy w panelu
akcji UI w obrębie jednego feature’a
mutacji bez potrzeby publicznego API
```

Każda Server Action musi mieć własne:

```txt
auth check
tenant check
permission check
input validation
audit log
```

Nie wolno zakładać, że Server Action jest bezpieczna tylko dlatego, że jest wywoływana z formularza.

## Standard protected operation

Wzorzec:

```ts
export async function createAssessmentProjectAction(input: unknown) {
  const ctx = await requireTenantContext();
  requirePermission(ctx, 'assessment_project:create');

  const parsed = createAssessmentProjectSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error);
  }

  const result = await createAssessmentProject(ctx, parsed.data);

  await writeTenantAuditLog(ctx, {
    action: 'assessment_project_created',
    entityType: 'assessment_project',
    entityId: result.id,
  });

  return result;
}
```

## API naming

Unikać stylu:

```txt
/api/get/...
/api/set/...
```

Preferować zasobowy styl:

```txt
/api/secure/tenants
/api/secure/tenants/:tenantId
/api/secure/client-organizations
/api/secure/assessment-projects
/api/secure/assessment-sessions
/api/secure/reports
```

Dla respondentów:

```txt
/api/respondent/session/:token
/api/respondent/session/:token/answers
/api/respondent/session/:token/complete
```

## Data access layer

Dostęp do bazy powinien być przez funkcje domenowe lub repozytoria.

Przykład:

```txt
features/assessment-projects/api/assessment-project.queries.ts
features/assessment-projects/api/assessment-project.mutations.ts
```

Nie robić bezpośrednich zapytań DB w komponentach.

## Safe response

Nie zwracać danych, których UI nie potrzebuje.

Przykład: lista respondentów nie powinna domyślnie zwracać pełnych odpowiedzi i scoringów.

## DTO

Warto rozdzielać:

```txt
Database row
Domain entity
DTO returned to UI
Form input
Mutation input
```

Nie każda kolumna bazy powinna trafiać do klienta.

## Error handling

Błędy techniczne mapować na bezpieczne odpowiedzi.

Wewnętrznie logować:

```txt
error code
operation
entity type
entity id
actor user id
tenant id
```

Nie logować danych wrażliwych.

## Permission naming

Stosować spójny format:

```txt
resource:action
```

Przykłady:

```txt
tenant:manage
user:invite
client_organization:read
client_organization:create
assessment_project:read
assessment_project:create
assessment_project:update
respondent:invite
assessment_result:read
report:generate
report:read
report:download
questionnaire:manage
scoring_model:manage
```

## Public respondent API

Endpointy respondenta muszą:

- weryfikować token,
- sprawdzać status sesji,
- sprawdzać termin ważności,
- nie ujawniać danych tenanta,
- zapisywać odpowiedzi inkrementalnie,
- zabezpieczać przed masowym spamem,
- nie umożliwiać pobrania cudzej sesji.

## Export API

Eksporty danych są wysokiego ryzyka.

Każdy eksport musi mieć:

```txt
permission check
tenant context
audit log
zakres danych
cel eksportu / opcjonalnie
rate limiting albo job queue
```
