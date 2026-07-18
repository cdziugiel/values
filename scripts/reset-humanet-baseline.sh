#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:---preview}"
DROP_OTHER_DATABASES="${DROP_OTHER_DATABASES:-false}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-humanet-values-postgres}"
POSTGRES_USER="${POSTGRES_USER:-humanet_values}"
CONTROL_DATABASE="${CONTROL_DATABASE:-humanet_control}"
DEFAULT_USER_EMAIL="cezary@humanet.me"
DEFAULT_TENANT_SLUG="humanet"
CONFIRMATION_ENV="RESET_HUMANET_TO_BASELINE"
CONFIRMATION_VALUE="YES_I_UNDERSTAND"
# RESET_HUMANET_TO_BASELINE=YES_I_UNDERSTAND

log(){ printf '\n%s\n' "$1"; }
die(){ printf '\nBŁĄD: %s\n' "$1" >&2; exit 1; }
psql_control(){ docker exec -i "$POSTGRES_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$CONTROL_DATABASE" "$@"; }
psql_db(){ local db="$1"; shift; docker exec -i "$POSTGRES_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$db" "$@"; }
scalar_control(){ psql_control -Atqc "$1"; }

assert_environment(){
  command -v docker >/dev/null 2>&1 || die "Brakuje polecenia docker"
  docker inspect "$POSTGRES_CONTAINER" >/dev/null 2>&1 || die "Nie znaleziono kontenera $POSTGRES_CONTAINER"
  psql_control -Atqc "select 1" >/dev/null || die "Brak połączenia z $CONTROL_DATABASE"
}

validate_before_reset(){
  [[ "$(scalar_control "select count(*) from users where lower(email)=lower('$DEFAULT_USER_EMAIL')")" == "1" ]] || die "Użytkownik $DEFAULT_USER_EMAIL nie istnieje dokładnie raz"
  [[ "$(scalar_control "select count(*) from tenants where slug='$DEFAULT_TENANT_SLUG'")" == "1" ]] || die "Tenant $DEFAULT_TENANT_SLUG nie istnieje dokładnie raz"
  [[ "$(scalar_control "select count(*) from tenant_database_connections c join tenants t on t.id=c.tenant_id where t.slug='$DEFAULT_TENANT_SLUG' and t.deleted_at is null
      and exists (
        select 1
        from pg_database d
        where d.datname = c.database_name
      ) and c.deleted_at is null")" == "1" ]] || die "Tenant humanet nie ma dokładnie jednego aktywnego połączenia"
  [[ "$(scalar_control "select count(*) from questionnaire_versions qv where qv.status='active' and qv.deleted_at is null and not exists (select 1 from questionnaire_pages qp where qp.questionnaire_version_id=qv.id and qp.deleted_at is null)")" == "0" ]] || die "Aktywna wersja kwestionariusza bez stron"
  [[ "$(scalar_control "select count(*) from questionnaire_versions qv where qv.status='active' and qv.deleted_at is null and not exists (select 1 from questionnaire_items qi where qi.questionnaire_version_id=qv.id and qi.deleted_at is null)")" == "0" ]] || die "Aktywna wersja kwestionariusza bez itemów"
  [[ "$(scalar_control "select count(*) from report_template_versions rtv where rtv.status='active' and rtv.deleted_at is null and not exists (select 1 from report_template_pages rtp where rtp.report_template_version_id=rtv.id and rtp.deleted_at is null)")" == "0" ]] || die "Aktywna wersja raportu bez stron"
  printf 'Walidacja: OK\n'
}

preview_control(){
  log "CONTROL DB — podgląd"
  psql_control -P pager=off <<SQL
select 'Użytkownicy pozostający' zakres,count(*) liczba from users where lower(email)=lower('$DEFAULT_USER_EMAIL')
union all select 'Użytkownicy usuwani',count(*) from users where lower(email)<>lower('$DEFAULT_USER_EMAIL')
union all select 'Tenanty pozostające',count(*) from tenants where slug='$DEFAULT_TENANT_SLUG'
union all select 'Tenanty usuwane',count(*) from tenants where slug<>'$DEFAULT_TENANT_SLUG'
union all select 'Aktywne wersje kwestionariuszy',count(*) from questionnaire_versions where status='active' and deleted_at is null
union all select 'Aktywne wersje raportów',count(*) from report_template_versions where status='active' and deleted_at is null
union all select 'Produkty report_access_products',count(*) from report_access_products rap where rap.deleted_at is null and exists (select 1 from report_template_versions rtv where rtv.report_template_id=rap.report_template_id and rtv.status='active' and rtv.deleted_at is null)
order by zakres;
SQL
}

get_tenant_databases(){ scalar_control "select c.database_name from tenant_database_connections c join tenants t on t.id=c.tenant_id where c.deleted_at is null and t.deleted_at is null
      and exists (
        select 1
        from pg_database d
        where d.datname = c.database_name
      ) order by t.slug"; }
get_humanet_database(){ scalar_control "select c.database_name from tenant_database_connections c join tenants t on t.id=c.tenant_id where c.deleted_at is null and t.deleted_at is null
      and exists (
        select 1
        from pg_database d
        where d.datname = c.database_name
      ) and t.slug='$DEFAULT_TENANT_SLUG' limit 1"; }
get_other_tenant_databases(){ scalar_control "select c.database_name from tenant_database_connections c join tenants t on t.id=c.tenant_id where c.deleted_at is null and t.deleted_at is null
      and exists (
        select 1
        from pg_database d
        where d.datname = c.database_name
      ) and t.slug<>'$DEFAULT_TENANT_SLUG' order by t.slug"; }

preview_tenant_database(){
  local db="$1"; log "TENANT DB: $db — rekordy do usunięcia"
  psql_db "$db" -P pager=off <<'SQL'
select t.table_name,(xpath('/row/c/text()',query_to_xml(format('select count(*) as c from %I.%I',t.table_schema,t.table_name),false,true,'')))[1]::text::bigint liczba
from information_schema.tables t
where t.table_schema='public' and t.table_type='BASE TABLE' and t.table_name not in ('__drizzle_migrations','drizzle_migrations')
order by t.table_name;
SQL
}

reset_tenant_database(){
  local db="$1"; log "Czyszczenie tenant DB: $db"
  psql_db "$db" <<'SQL'
begin;
do $$ declare table_list text; begin
  select string_agg(format('%I.%I',table_schema,table_name),', ') into table_list
  from information_schema.tables
  where table_schema='public' and table_type='BASE TABLE' and table_name not in ('__drizzle_migrations','drizzle_migrations');
  if table_list is not null then execute 'truncate table '||table_list||' restart identity cascade'; end if;
end $$;
commit;
SQL
}

reset_control_database(){
  log "Reset CONTROL DB"
  psql_control <<SQL
begin;
create temp table keep_users on commit drop as select * from users where lower(email)=lower('$DEFAULT_USER_EMAIL');
create temp table keep_tenants on commit drop as select * from tenants where slug='$DEFAULT_TENANT_SLUG';
create temp table keep_tenant_connections on commit drop as select c.* from tenant_database_connections c join keep_tenants t on t.id=c.tenant_id where c.deleted_at is null;
create temp table keep_tenant_memberships on commit drop as select m.* from tenant_memberships m join keep_users u on u.id=m.user_id join keep_tenants t on t.id=m.tenant_id order by m.created_at asc limit 1;
create temp table keep_questionnaire_versions on commit drop as select * from questionnaire_versions where status='active' and deleted_at is null;
create temp table keep_questionnaires on commit drop as select q.* from questionnaires q where exists(select 1 from keep_questionnaire_versions qv where qv.questionnaire_id=q.id);
create temp table keep_questionnaire_pages on commit drop as select qp.* from questionnaire_pages qp join keep_questionnaire_versions qv on qv.id=qp.questionnaire_version_id where qp.deleted_at is null;
create temp table keep_questionnaire_dimensions on commit drop as select qd.* from questionnaire_dimensions qd join keep_questionnaire_versions qv on qv.id=qd.questionnaire_version_id where qd.deleted_at is null;
create temp table keep_questionnaire_items on commit drop as select qi.* from questionnaire_items qi join keep_questionnaire_versions qv on qv.id=qi.questionnaire_version_id where qi.deleted_at is null;
create temp table keep_questionnaire_item_dimension_scores on commit drop as select s.* from questionnaire_item_dimension_scores s join keep_questionnaire_items qi on qi.id=s.questionnaire_item_id join keep_questionnaire_dimensions qd on qd.id=s.questionnaire_dimension_id where s.deleted_at is null;
create temp table keep_questionnaire_page_dimension_scores on commit drop as select s.* from questionnaire_page_dimension_scores s join keep_questionnaire_pages qp on qp.id=s.questionnaire_page_id join keep_questionnaire_dimensions qd on qd.id=s.questionnaire_dimension_id where s.deleted_at is null;
create temp table keep_report_template_versions on commit drop as select * from report_template_versions where status='active' and deleted_at is null;
create temp table keep_report_templates on commit drop as select rt.* from report_templates rt where exists(select 1 from keep_report_template_versions rtv where rtv.report_template_id=rt.id);
create temp table keep_report_template_pages on commit drop as select rtp.* from report_template_pages rtp join keep_report_template_versions rtv on rtv.id=rtp.report_template_version_id where rtp.deleted_at is null;
create temp table keep_questionnaire_report_template_bindings on commit drop as select b.* from questionnaire_report_template_bindings b join keep_questionnaire_versions qv on qv.id=b.questionnaire_version_id join keep_report_template_versions rtv on rtv.id=b.report_template_version_id where b.status='active' and b.deleted_at is null;
create temp table keep_report_access_products on commit drop as select rap.* from report_access_products rap join keep_report_templates rt on rt.id=rap.report_template_id where rap.deleted_at is null;

do \$\$ declare table_list text; begin
  select string_agg(format('%I.%I',table_schema,table_name),', ') into table_list
  from information_schema.tables
  where table_schema='public' and table_type='BASE TABLE' and table_name not in ('__drizzle_migrations','drizzle_migrations');
  if table_list is not null then execute 'truncate table '||table_list||' restart identity cascade'; end if;
end \$\$;

insert into users select * from keep_users;
update users set global_role='SUPER_ADMIN',status='active',deleted_at=null,updated_at=now() where lower(email)=lower('$DEFAULT_USER_EMAIL');
insert into tenants select * from keep_tenants;
update tenants set status='active',deleted_at=null,updated_at=now() where slug='$DEFAULT_TENANT_SLUG';
insert into tenant_database_connections select * from keep_tenant_connections;
do \$\$ begin
  if exists(select 1 from keep_tenant_memberships) then
    insert into tenant_memberships select * from keep_tenant_memberships;
    update tenant_memberships set role='TENANT_OWNER',status='active',deleted_at=null,updated_at=now();
  else
    insert into tenant_memberships(id,user_id,tenant_id,role,status,created_at,updated_at,created_by,updated_by,deleted_at)
    select gen_random_uuid(),u.id,t.id,'TENANT_OWNER','active',now(),now(),u.id,u.id,null from users u cross join tenants t where lower(u.email)=lower('$DEFAULT_USER_EMAIL') and t.slug='$DEFAULT_TENANT_SLUG';
  end if;
end \$\$;
insert into questionnaires select * from keep_questionnaires;
insert into questionnaire_versions select * from keep_questionnaire_versions;
insert into questionnaire_pages select * from keep_questionnaire_pages;
insert into questionnaire_dimensions select * from keep_questionnaire_dimensions;
insert into questionnaire_items select * from keep_questionnaire_items;
insert into questionnaire_item_dimension_scores select * from keep_questionnaire_item_dimension_scores;
insert into questionnaire_page_dimension_scores select * from keep_questionnaire_page_dimension_scores;
insert into report_templates select * from keep_report_templates;
insert into report_template_versions select * from keep_report_template_versions;
insert into report_template_pages select * from keep_report_template_pages;
insert into questionnaire_report_template_bindings select * from keep_questionnaire_report_template_bindings;
insert into report_access_products select * from keep_report_access_products;
commit;
SQL
}

drop_database(){
  local db="$1"; [[ "$db" =~ ^[a-zA-Z0-9_]+$ ]] || die "Niebezpieczna nazwa bazy: $db"
  log "Usuwanie bazy: $db"
  docker exec -i "$POSTGRES_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres <<SQL
select pg_terminate_backend(pid) from pg_stat_activity where datname='$db' and pid<>pg_backend_pid();
drop database if exists "$db";
SQL
}

verify_final_state(){
  [[ "$(scalar_control "select count(*) from users")" == "1" ]] || die "Po resecie liczba users != 1"
  [[ "$(scalar_control "select count(*) from tenants")" == "1" ]] || die "Po resecie liczba tenants != 1"
  [[ "$(scalar_control "select count(*) from tenant_memberships")" == "1" ]] || die "Po resecie liczba memberships != 1"
  [[ "$(scalar_control "select count(*) from report_access_orders")" == "0" ]] || die "Pozostały zamówienia"
  [[ "$(scalar_control "select count(*) from report_access_grants")" == "0" ]] || die "Pozostały granty"
  validate_before_reset
}

main(){
  [[ "$MODE" == "--preview" || "$MODE" == "--execute" ]] || die "Użycie: $0 --preview albo --execute"
  assert_environment
  printf 'HUMANET VALUES — reset do stanu bazowego\nTryb: %s\nKontener PostgreSQL: %s\nControl DB: %s\n' "$MODE" "$POSTGRES_CONTAINER" "$CONTROL_DATABASE"
  validate_before_reset
  preview_control
  while IFS= read -r db; do [[ -n "$db" ]] && preview_tenant_database "$db"; done < <(get_tenant_databases)
  if [[ "$MODE" == "--preview" ]]; then log "Podgląd zakończony. Nie zmieniono danych."; return; fi
  [[ "${!CONFIRMATION_ENV:-}" == "$CONFIRMATION_VALUE" ]] || die "Ustaw $CONFIRMATION_ENV=$CONFIRMATION_VALUE"
  local humanet_db; humanet_db="$(get_humanet_database)"; [[ -n "$humanet_db" ]] || die "Brak bazy humanet"
  if [[ "$DROP_OTHER_DATABASES" == "true" ]]; then
    reset_tenant_database "$humanet_db"
    while IFS= read -r db; do [[ -n "$db" ]] && drop_database "$db"; done < <(get_other_tenant_databases)
  else
    while IFS= read -r db; do [[ -n "$db" ]] && reset_tenant_database "$db"; done < <(get_tenant_databases)
  fi
  reset_control_database
  verify_final_state
  log "RESET ZAKOŃCZONY POMYŚLNIE"
}
main "$@"