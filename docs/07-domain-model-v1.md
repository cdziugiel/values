# 07 — Model domenowy v1

## Cel

Ten plik opisuje początkowy model domenowy HUMANET VALUES v2. Model może być rozwijany, ale agent powinien traktować go jako punkt odniesienia przy projektowaniu schemy, API i UI.

## Główne obszary domeny

```txt
Identity & Access
Tenancy
Client Organizations
Respondents
Questionnaires
Assessment Projects
Assessment Sessions
Scoring
Reports
Consents
Audit
Billing
Files
```

## Identity & Access

### User

Globalny użytkownik systemu.

Pola koncepcyjne:

```txt
id
email
name
password_hash / external_auth_id
status
created_at
updated_at
```

### TenantMembership

Powiązanie użytkownika z tenantem.

```txt
id
user_id
tenant_id
role
status
created_at
updated_at
```

## Tenancy

### Tenant

Partner lub jednostka korzystająca z platformy.

```txt
id
slug
name
status
plan_id
created_at
updated_at
```

### TenantDatabaseConnection

Informacja o bazie tenanta.

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

## Client Organizations

### ClientOrganization

Firma lub organizacja badana przez tenanta.

```txt
id
name
industry
size
status
created_at
updated_at
```

### ClientUnit / Department / Team

Jednostki organizacyjne klienta.

```txt
id
client_organization_id
parent_id
name
type
created_at
updated_at
```

## Respondents

### Respondent

Osoba uczestnicząca w badaniu.

```txt
id
external_code
client_organization_id
client_unit_id
metadata
created_at
updated_at
```

### RespondentIdentity

Dane identyfikujące respondenta, odseparowane od wyników.

```txt
id
respondent_id
email
first_name
last_name
phone
created_at
updated_at
```

## Questionnaires

### Questionnaire

Narzędzie psychometryczne.

```txt
id
code
name
description
status
created_at
updated_at
```

### QuestionnaireVersion

Konkretna wersja kwestionariusza.

```txt
id
questionnaire_id
version
status
published_at
created_at
updated_at
```

### QuestionnaireScale

Skala/czynnik w ramach kwestionariusza.

```txt
id
questionnaire_version_id
code
name
description
order
```

### QuestionnaireItem

Item diagnostyczny.

```txt
id
questionnaire_version_id
scale_id
code
content
response_type
order
is_reversed
metadata
```

## Assessment Projects

### AssessmentProject

Konkretne badanie realizowane dla klienta.

```txt
id
client_organization_id
name
description
status
starts_at
ends_at
created_by
created_at
updated_at
```

Statusy przykładowe:

```txt
draft
active
closed
archived
```

## Assessment Sessions

### AssessmentSession

Indywidualna sesja respondenta w ramach projektu.

```txt
id
assessment_project_id
respondent_id
questionnaire_version_id
scoring_model_version_id
report_template_version_id
status
started_at
completed_at
access_token_hash
expires_at
items_snapshot
scoring_snapshot
created_at
updated_at
```

Statusy:

```txt
invited
opened
in_progress
completed
expired
cancelled
```

### AssessmentAnswer

Odpowiedź na item.

```txt
id
assessment_session_id
questionnaire_item_id
value
answered_at
created_at
updated_at
```

## Scoring

### ScoringModel

Model liczenia wyników.

```txt
id
questionnaire_id
code
name
created_at
updated_at
```

### ScoringModelVersion

Wersja modelu scoringowego.

```txt
id
scoring_model_id
version
rules
status
published_at
created_at
updated_at
```

### AssessmentScore

Wynik obliczony dla sesji.

```txt
id
assessment_session_id
scale_code
raw_score
standardized_score
percentile
interpretation_code
metadata
created_at
updated_at
```

## Reports

### ReportTemplate

Szablon raportu.

```txt
id
code
name
type
created_at
updated_at
```

### ReportTemplateVersion

Wersja szablonu raportu.

```txt
id
report_template_id
version
template_data
status
published_at
created_at
updated_at
```

### GeneratedReport

Wygenerowany raport.

```txt
id
assessment_project_id
assessment_session_id nullable
report_template_version_id
type
status
storage_key
html_snapshot
pdf_storage_key
created_by
created_at
updated_at
```

Typy raportów:

```txt
individual
group
organization
comparison
```

### ReportAccessGrant

Dostęp do raportu.

```txt
id
report_id
granted_to_user_id
granted_to_email
role
expires_at
created_at
```

## Consents

### Consent

Zgoda respondenta.

```txt
id
respondent_id
assessment_session_id
consent_type
content_version
accepted_at
ip_address
user_agent
```

## Audit

### TenantAuditLog

```txt
id
actor_user_id
actor_role
action
entity_type
entity_id
before
after
ip_address
user_agent
created_at
```

## Billing

Na start może być proste, ale model powinien przewidywać:

```txt
plans
subscriptions
payments
invoices
usage_records
```

## Files

Pliki powinny być prywatne.

```txt
id
owner_type
owner_id
storage_key
mime_type
size
checksum
created_by
created_at
```
