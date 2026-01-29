-- Enforce per-user incident report rate limits
create or replace function public.enforce_report_rate_limits()
returns trigger as $$
declare
  report_count_3h integer;
  report_count_24h integer;
begin
  if new.user_id is null then
    return new;
  end if;

  select count(*) into report_count_3h
  from public.reports
  where user_id = new.user_id
    and created_at >= (now() - interval '3 hours');

  if report_count_3h >= 3 then
    raise exception 'Rate limit exceeded: maximum 3 incident reports within 3 hours.';
  end if;

  select count(*) into report_count_24h
  from public.reports
  where user_id = new.user_id
    and created_at >= (now() - interval '24 hours');

  if report_count_24h >= 6 then
    raise exception 'Rate limit exceeded: maximum 6 incident reports within 24 hours.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists enforce_report_rate_limits on public.reports;

create trigger enforce_report_rate_limits
  before insert on public.reports
  for each row
  execute function public.enforce_report_rate_limits();
