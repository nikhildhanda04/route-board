-- Idempotent. Run once per database (local, then again on Neon).
--
-- sbt_app is the restricted role the app connects as. The owner role (whoever
-- runs migrations) must never be the app's connection — a superuser/owner
-- bypasses RLS entirely, which would make every isolation test in
-- scripts/verify.ts pass for the wrong reason.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'sbt_app') then
    create role sbt_app with login password 'change_me_in_env';
  end if;
end
$$;

grant usage on schema public to sbt_app;
grant select, insert, update, delete on all tables in schema public to sbt_app;
grant usage, select on all sequences in schema public to sbt_app;
grant execute on all functions in schema public to sbt_app;

-- Covers every table created by migrations from here on — no more
-- hand-running GRANT after `drizzle-kit generate`.
alter default privileges in schema public
  grant select, insert, update, delete on tables to sbt_app;
alter default privileges in schema public
  grant usage, select on sequences to sbt_app;
alter default privileges in schema public
  grant execute on functions to sbt_app;
