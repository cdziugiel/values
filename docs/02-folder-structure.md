# 02 — Struktura folderów

## Główne katalogi

```txt
app/
features/
shared/
server/
drizzle/
```

## `app/`

`app/` zawiera wyłącznie routing Next.js, layouty, strony, route handlery, providery i entrypointy frameworka.

Nie umieszczać w `app/` ciężkiej logiki domenowej.

Przykład:

```txt
app/
  [locale]/
    (public)/
      page.tsx
      login/
        page.tsx
    (protected)/
      layout.tsx
      dashboard/
        page.tsx
      t/
        [tenantSlug]/
          layout.tsx
          dashboard/
            page.tsx
          assessment-projects/
            page.tsx
          respondents/
            page.tsx
          reports/
            page.tsx
  api/
    health/
      route.ts
    webhooks/
      route.ts
    secure/
      tenants/
        route.ts
```

Strona w `app/` powinna zwykle delegować renderowanie do feature’a:

```tsx
import { AssessmentProjectsPage } from '@/features/assessment-projects';

export default function Page() {
  return <AssessmentProjectsPage />;
}
```

## `features/`

`features/` zawiera logikę domenową i UI domenowe.

Przykładowe feature’y:

```txt
features/
  auth/
  tenant/
  admin/
  users/
  client-organizations/
  respondents/
  questionnaires/
  questionnaire-builder/
  assessment-projects/
  assessment-session/
  scoring/
  reports/
  report-builder/
  psychometrics/
  billing/
  audit-log/
  dashboard/
  notifications/
  files/
  consent/
  settings/
```

Zalecana struktura feature’a:

```txt
features/questionnaires/
  api/
    questionnaire.queries.ts
    questionnaire.mutations.ts
  components/
    QuestionnaireList.tsx
    QuestionnaireCard.tsx
    QuestionnaireEditor.tsx
  forms/
    questionnaire.schema.ts
    QuestionnaireForm.tsx
  lib/
    questionnaire-normalize.ts
    questionnaire-permissions.ts
  types/
    questionnaire.types.ts
  index.ts
```

## `shared/`

`shared/` zawiera tylko elementy faktycznie współdzielone między wieloma feature’ami.

```txt
shared/
  ui/
    shadcn/
    layout/
    data-table/
    forms/
    charts/
    modals/
    feedback/
  lib/
    utils/
    dates/
    validation/
    formatting/
    errors/
  hooks/
  types/
  constants/
  config/
```

Nie wrzucać do `shared/` kodu domenowego specyficznego dla jednego feature’a.

## `server/`

`server/` zawiera infrastrukturę backendową.

```txt
server/
  auth/
    require-session.ts
    require-user.ts
  db/
    control-db.ts
    tenant-db.ts
    connection-cache.ts
    create-tenant-db.ts
    migrate-tenant-db.ts
  tenant/
    resolve-tenant-context.ts
    require-tenant-access.ts
    tenant-permissions.ts
  permissions/
    require-permission.ts
    roles.ts
  security/
    encryption.ts
    rate-limit.ts
    ip-policy.ts
  audit/
    audit-log.ts
  logger/
    logger.ts
  errors/
    app-error.ts
    validation-error.ts
  cache/
  jobs/
  mail/
  storage/
  analytics/
```

## `drizzle/`

`drizzle/` zawiera schematy, migracje i seedy.

```txt
drizzle/
  schema/
    control/
      users.ts
      tenants.ts
      tenant-memberships.ts
      tenant-database-connections.ts
      system-audit-log.ts
    tenant/
      client-organizations.ts
      respondents.ts
      questionnaires.ts
      assessment-projects.ts
      assessment-sessions.ts
      assessment-answers.ts
      assessment-scores.ts
      reports.ts
      tenant-audit-log.ts
    shared/
      common-columns.ts
      enums.ts
  migrations/
    control/
    tenant/
  seed/
```

## Reguły importów

Dozwolone kierunki:

```txt
app → features, shared, server
features → shared, server
server → drizzle, shared
shared → brak zależności od features/app/server domenowego
drizzle → brak zależności od app/features
```

Niedozwolone:

```txt
shared → features
shared → app
server → components UI
features/a → features/b bez wyraźnego public API
```

Jeśli feature musi udostępnić coś innym, eksportuje to przez własny `index.ts` jako public API.
