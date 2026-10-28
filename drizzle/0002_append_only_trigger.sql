-- Replaces the DO INSTEAD NOTHING rules from 0001.
--
-- A rule silently discarded the write: the caller got "success" and no rows
-- changed, which is exactly the kind of thing you find out about during an
-- incident. A trigger that raises tells the developer immediately.
drop rule if exists trip_events_no_update on trip_events;
drop rule if exists trip_events_no_delete on trip_events;

create or replace function trip_events_append_only() returns trigger
language plpgsql as $fn$
begin
  raise exception
    'trip_events is append-only — correct a mistake by recording a new event'
    using errcode = '23514';
end
$fn$;

create trigger trip_events_append_only
  before update or delete on trip_events
  for each row execute function trip_events_append_only();

grant execute on all functions in schema public to sbt_app;
