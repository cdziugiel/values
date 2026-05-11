# 03 — Architektura multi-tenant i bazy danych

## Decyzja architektoniczna

System HUMANET VALUES v2 powinien być projektowany pod model:

```txt
control database + separate tenant databases
```

Czyli:

```txt
humanet_control
  ├── users
  ├── tenants
  ├── tenant_memberships
  ├── tenant_database_connections
  ├── global_roles
  ├── plans / billing
  ├── system_audit_log
  └── feature_flags

humanet_tenant_acme
  ├── client_organizations
  ├── respondents
  ├── assessment_projects
  ├── assessment_sessions
  ├── assessment_answers
  ├── assessment_scores
  ├── generated_reports
  └── tenant_audit_log

humanet_tenant_beta
  └── ...
```

## Cel osobnych baz tenantów

Osobne bazy per tenant zapewniają:

- silniejszą izolację danych,
- mniejsze ryzyko przypadkowego wycieku między tenantami,
- łatwiejszy backup/restore per tenant,
- łatwiejsze usunięcie lub eksport danych jednego tenanta,
- mocniejszy argument sprzedażowy dla klientów enterprise,
- większą odporność systemu przy przetwarzaniu danych psychometrycznych.

## Baza kontrolna `humanet_control`

Baza kontrolna odpowiada za tożsamość, dostęp i lokalizację danych.

Przykładowe tabele:

```txt
users
tenants
tenant_memberships
tenant_database_connections
global_audit_log
login_events
plans
subscriptions
feature_flags
system_settings
```

Baza kontrolna odpowiada na pytania:

- kim jest użytkownik,
- do jakich tenantów ma dostęp,
- jaką ma rolę,
- gdzie znajduje się baza danego tenanta,
- czy tenant jest aktywny,
- jakie funkcje ma włączone,
- jaki ma plan lub licencję.

## Baza tenanta

Baza tenanta przechowuje dane domenowe danego partnera/tenanta.

Przykładowe tabele:

```txt
client_organizations
client_units
client_teams
respondents
respondent_identities
consents
questionnaire_usages
assessment_projects
assessment_sessions
assessment_answers
assessment_scores
generated_reports
report_access_grants
tenant_audit_log
files
notifications
```

## Tenant context

Każda operacja w kontekście tenanta musi przejść przez `TenantContext`.

Przykład docelowego użycia:

```ts
const ctx = await requireTenantContext(params.tenantSlug);
const projects = await AssessmentProjectRepository.list(ctx, filters);
```

`TenantContext` powinien zawierać co najmniej:

```ts
type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  role: TenantRole;
  permissions: Permission[];
  db: TenantDb;
  isSuperAdminAccess?: boolean;
};
```

## Niedozwolone praktyki

Nie wolno pobierać connection stringów w feature’ach, komponentach ani route handlerach bezpośrednio.

Niedozwolone:

```ts
const db = await connect(process.env[`TENANT_${slug}_DATABASE_URL`]);
```

Dozwolone:

```ts
const ctx = await requireTenantContext(slug);
const db = ctx.db;
```

## Connection registry

Tabela `tenant_database_connections` w bazie kontrolnej powinna zawierać:

```txt
id
tenant_id
database_name
database_url_encrypted
schema_version
migration_status
last_migrated_at
created_at
updated_at
```

Connection stringi muszą być szyfrowane lub przechowywane w bezpiecznym managerze sekretów.

## Connection cache

Warstwa `server/db/connection-cache.ts` powinna zarządzać pulami połączeń.

Wymagania:

- nie tworzyć nowego połączenia przy każdym requestcie,
- limitować liczbę połączeń,
- obsłużyć zamykanie nieużywanych pul,
- logować błędy połączeń,
- nie ujawniać connection stringów w logach.

## Migracje tenantów

System musi mieć mechanizm migracji dla wielu baz tenantów.

Potrzebne funkcje:

```txt
createTenantDatabase(tenant)
runTenantMigrations(tenant)
verifyTenantSchemaVersion(tenant)
markTenantMigrationFailed(tenant, error)
```

W bazie kontrolnej warto trzymać historię:

```txt
tenant_migration_history
  id
  tenant_id
  migration_name
  status
  started_at
  finished_at
  error_message
```

## Super admin i dostęp do danych tenanta

Administrator globalny nie powinien mieć „cichego” dostępu do danych tenanta.

Wymagany jest tryb audytowany:

```txt
SUPER_ADMIN selects tenant
→ system creates audited tenant context
→ all actions are logged as super_admin_access
```

Audit log powinien zapisać:

- kto uzyskał dostęp,
- kiedy,
- do którego tenanta,
- do jakiego typu danych,
- jaki był cel lub kontekst operacji, jeśli dostęp wymaga uzasadnienia.

## Globalne dane psychometryczne

Globalna biblioteka kwestionariuszy, scoringów i szablonów raportów może znajdować się w bazie kontrolnej.

Rekomendowany model:

```txt
global questionnaire library in control DB
+
usage/snapshot in tenant DB
```

Każda sesja badawcza w bazie tenanta powinna zapisywać:

```txt
questionnaire_version_id
scoring_model_version_id
report_template_version_id
items_snapshot
scoring_snapshot
```

Dzięki temu zachowujemy odtwarzalność historycznych badań.
