-- Tenant isolation, enforced by the database rather than by remembering to add
-- `where school_id = ...` in every query.

-- `true` makes a missing setting return NULL instead of raising, so an unscoped
-- connection sees zero rows rather than erroring — fail closed, quietly.
create or replace function app_school_id() returns uuid
language sql stable as $fn$
  select nullif(current_setting('app.school_id', true), '')::uuid
$fn$;

-- FORCE applies the policy to the table owner too. Without it, Neon's
-- neondb_owner (which the app connects as) would sail straight past RLS.
do $do$
declare t text;
begin
  foreach t in array array[
    'users','students','guardians','buses','routes','stops',
    'route_students','trips','trip_events','bus_locations','outbox'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('alter table %I force row level security', t);
    execute format(
      'create policy tenant_isolation on %I using (school_id = app_school_id()) with check (school_id = app_school_id())',
      t);
  end loop;
end $do$;

-- ponytail: `schools` is deliberately left unprotected — it is the tenant
-- registry, and provisioning a school has to happen before any school context
-- exists. It holds a name and a timezone, nothing sensitive. Scope reads of it
-- in app code. Give it a SECURITY DEFINER provisioning function if signup ever
-- becomes self-serve.

-- Append-only: a boarding record is evidence. Correct a mistake with a new
-- event, never by rewriting history.
create rule trip_events_no_update as on update to trip_events do instead nothing;
create rule trip_events_no_delete as on delete to trip_events do instead nothing;
