# 05 — Drizzle i standardy schemy

## Założenie

Drizzle ORM jest główną warstwą mapowania schemy i zapytań SQL. PostgreSQL jest główną bazą danych.

System używa dwóch rodzin schematów:

```txt
control schema — dla bazy kontrolnej
tenant schema — dla baz tenantów
```

## Struktura schematów

```txt
drizzle/schema/
  control/
    users.ts
    tenants.ts
    tenant-memberships.ts
    tenant-database-connections.ts
    login-events.ts
    system-audit-log.ts
    feature-flags.ts
  tenant/
    client-organizations.ts
    client-units.ts
    respondents.ts
    respondent-identities.ts
    consents.ts
    assessment-projects.ts
    assessment-sessions.ts
    assessment-answers.ts
    assessment-scores.ts
    generated-reports.ts
    report-access-grants.ts
    tenant-audit-log.ts
  shared/
    common-columns.ts
    enums.ts
    timestamps.ts
```

## Standardowe kolumny

Większość tabel powinna mieć:

```txt
id
created_at
updated_at
created_by
updated_by
deleted_at
```

W bazach tenantowych nie każda tabela musi mieć `tenant_id`, ponieważ sama baza jest tenantowa. Można jednak rozważyć dodanie `tenant_id` dla ułatwienia eksportów, audytu lub migracji hybrydowych.

## Soft delete

Dla danych domenowych stosować `deleted_at`, nie fizyczne usuwanie, chyba że:

- wymagana jest realizacja usunięcia danych,
- dane są techniczne,
- istnieje osobna procedura retencji.

## Nazewnictwo

Tabele: snake_case.

```txt
assessment_projects
assessment_sessions
assessment_answers
generated_reports
```

Kolumny: snake_case.

```txt
created_at
updated_at
respondent_id
questionnaire_version_id
```

Typy TypeScript: PascalCase.

```ts
type AssessmentProject = ...
type AssessmentSession = ...
```

## Migracje

Zasady:

1. Nie używać automatycznego `push` na produkcji.
2. Migracje generować, przeglądać i commitować.
3. Migracje tenantowe uruchamiać kontrolowanym mechanizmem.
4. Każda migracja powinna być możliwa do powiązania z releasem.
5. Przed migracją produkcyjną wykonać backup.
6. Migracje wielu tenantów muszą mieć status per tenant.

## Wersjonowanie psychometryczne

Nie wolno edytować historycznych definicji testu w sposób niszczący odtwarzalność wyników.

Wymagane byty:

```txt
questionnaires
questionnaire_versions
questionnaire_scales
questionnaire_items
questionnaire_item_versions
scoring_models
scoring_model_versions
report_templates
report_template_versions
```

Każda sesja badania musi zapisać:

```txt
questionnaire_version_id
scoring_model_version_id
report_template_version_id
```

oraz najlepiej snapshot:

```txt
items_snapshot
scoring_snapshot
report_rules_snapshot
```

## Rozdzielenie danych osobowych od wyników

Rekomendowane tabele:

```txt
respondents
  id
  external_code
  client_organization_id
  client_unit_id
  metadata
  created_at

respondent_identities
  id
  respondent_id
  email
  first_name
  last_name
  phone
  created_at
```

Odpowiedzi i scoring powinny odnosić się do `respondent_id`, ale nie muszą zawierać danych identyfikujących.

## Repozytoria i query services

Nie umieszczać zapytań Drizzle bezpośrednio w komponentach UI.

Dopuszczalne miejsca:

```txt
features/<feature>/api/*.queries.ts
features/<feature>/api/*.mutations.ts
server/*
```

Preferowany wzorzec:

```ts
export async function listAssessmentProjects(ctx: TenantContext, input: ListAssessmentProjectsInput) {
  requirePermission(ctx, 'assessment_project:read');

  return ctx.db.query.assessmentProjects.findMany({
    where: ...
  });
}
```

## Raw SQL

Raw SQL jest dozwolony tylko gdy:

- Drizzle nie obsługuje danego przypadku ergonomicznie,
- zapytanie jest jawnie typowane,
- nie zawiera interpolacji niezwalidowanego inputu,
- zostało oznaczone komentarzem z uzasadnieniem.

## Indeksy

Projektować indeksy od początku dla:

```txt
foreign keys
created_at
updated_at
deleted_at
status
assessment_project_id
respondent_id
client_organization_id
questionnaire_version_id
```

Dla wyszukiwania tekstowego rozważyć osobną strategię, np. trigramy lub full-text search, dopiero gdy będzie realna potrzeba.
