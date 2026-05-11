# 10 — Roadmap implementacji

## Zasada

Nie zaczynać od raportów i kwestionariuszy bez fundamentu bezpieczeństwa, tenantów i architektury. Najpierw powstaje rdzeń platformy, potem funkcje psychometryczne.

## Etap 1 — Fundament aplikacji

Zakres:

```txt
Next.js App Router setup
TypeScript strict
Tailwind CSS
shadcn/ui
podstawowy AppShell
ESLint/Prettier
podstawowa struktura folderów
.env validation
health endpoint
```

Kryteria ukończenia:

- aplikacja uruchamia się lokalnie,
- istnieje struktura `app/features/shared/server/drizzle`,
- istnieje layout public/protected,
- istnieje standardowy PageHeader i AppShell,
- działa podstawowy health check.

## Etap 2 — Control DB i Drizzle

Zakres:

```txt
PostgreSQL
Drizzle config
control schema
migrations control DB
users
tenants
tenant_memberships
tenant_database_connections
system_audit_log
```

Kryteria ukończenia:

- migracje control DB działają,
- można utworzyć użytkownika,
- można utworzyć tenanta,
- można powiązać użytkownika z tenantem.

## Etap 3 — Auth i protected routes

Zakres:

```txt
authentication
session handling
requireSession
protected layout
login/logout
basic role resolution
```

Kryteria ukończenia:

- użytkownik może się zalogować,
- chronione strony wymagają sesji,
- dostęp bez sesji jest blokowany,
- login events są logowane.

## Etap 4 — Tenant context i tenant DB

Zakres:

```txt
createTenantDatabase
runTenantMigrations
resolveTenantContext
getTenantDb
connection cache
basic tenant dashboard
```

Kryteria ukończenia:

- można utworzyć tenant DB,
- można uruchomić migracje tenant DB,
- zalogowany użytkownik widzi tylko tenanty, do których ma dostęp,
- endpoint/strona tenanta działa na bazie danego tenanta.

## Etap 5 — Role i uprawnienia

Zakres:

```txt
permissions
requirePermission
role definitions
PermissionGate UI
admin tenant users
inviting users
```

Kryteria ukończenia:

- role są egzekwowane na backendzie,
- UI ukrywa niedostępne akcje,
- backend nadal blokuje akcje nawet, jeśli ktoś wywoła endpoint ręcznie.

## Etap 6 — Client organizations

Zakres:

```txt
client_organizations
client_units
client teams/departments
CRUD
list/detail views
audit log
```

Kryteria ukończenia:

- tenant admin może utworzyć klienta,
- dane klienta trafiają do bazy tenanta,
- inny tenant nie ma dostępu,
- działania są audytowane.

## Etap 7 — Respondenci i zgody

Zakres:

```txt
respondents
respondent_identities
consents
imports
basic respondent list
```

Kryteria ukończenia:

- dane identyfikujące są oddzielone od danych wynikowych,
- można dodać respondenta,
- można przypisać go do organizacji/jednostki,
- zgody mają wersję treści.

## Etap 8 — Kwestionariusze i wersjonowanie

Zakres:

```txt
questionnaires
questionnaire_versions
scales
items
scoring models
report templates
version publishing
```

Kryteria ukończenia:

- można stworzyć wersję kwestionariusza,
- opublikowana wersja jest niemutowalna lub zmieniana tylko przez nową wersję,
- itemy i scoring są wersjonowane.

## Etap 9 — Projekty badawcze

Zakres:

```txt
assessment_projects
assign questionnaire version
add respondents
send invitations / generate tokens
monitoring progress
```

Kryteria ukończenia:

- tenant może utworzyć projekt,
- przypisać wersję kwestionariusza,
- dodać respondentów,
- wygenerować sesje.

## Etap 10 — Wypełnianie kwestionariusza

Zakres:

```txt
respondent token flow
consent screen
questionnaire UI
answer autosave
completion validation
finish screen
```

Kryteria ukończenia:

- respondent może wypełnić kwestionariusz,
- odpowiedzi są zapisywane bezpiecznie,
- sesja nie ujawnia danych innych osób,
- tokeny są walidowane.

## Etap 11 — Scoring

Zakres:

```txt
raw score
scale score
reverse items
profile generation
score snapshots
audit scoring runs
```

Kryteria ukończenia:

- po zakończeniu sesji można policzyć wynik,
- wynik zapisuje wersję scoringu,
- scoring jest odtwarzalny.

## Etap 12 — Raporty

Zakres:

```txt
individual reports
group reports
HTML snapshot
PDF generation
report access grants
download audit
minimum group size rule
```

Kryteria ukończenia:

- można wygenerować raport indywidualny,
- można wygenerować raport grupowy z regułą minimalnego N,
- pobranie raportu jest audytowane,
- raport ma snapshot treści.

## Etap 13 — Billing i odblokowanie raportów

Zakres:

```txt
plans
subscriptions
usage limits
payments
report unlock
invoice metadata
```

Kryteria ukończenia:

- tenant ma plan,
- użycie jest liczone,
- dostęp do raportów może zależeć od płatności/licencji.

## Etap 14 — Psychometria zaawansowana

Zakres:

```txt
item analysis
scale reliability
Cronbach alpha
cohort comparison
norm tables
research exports
```

Kryteria ukończenia:

- analizy są wersjonowane,
- eksporty są audytowane,
- dane są anonimizowane lub pseudonimizowane zgodnie z polityką.
