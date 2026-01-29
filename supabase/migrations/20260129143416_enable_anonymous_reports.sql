-- Allow anonymous incident submissions with fingerprint-based limits

alter table public.reports
  add column if not exists client_fingerprint text;

update public.reports
set client_fingerprint = coalesce(client_fingerprint, report_number, gen_random_uuid()::text)
where client_fingerprint is null;

alter table public.reports
  alter column client_fingerprint set not null;

create index if not exists reports_client_fingerprint_idx
  on public.reports (client_fingerprint);

drop trigger if exists enforce_report_rate_limits on public.reports;

create or replace function public.enforce_report_rate_limits()
returns trigger as $$
declare
  identifier text;
  report_count_3h integer;
  report_count_24h integer;
begin
  identifier := coalesce(new.user_id::text, new.client_fingerprint);

  if identifier is null or length(identifier) = 0 then
    raise exception 'Rate limit identifier missing. Please refresh and try again.';
  end if;

  select count(*) into report_count_3h
  from public.reports
  where coalesce(user_id::text, client_fingerprint) = identifier
    and created_at >= (now() - interval '3 hours');

  if report_count_3h >= 3 then
    raise exception 'Rate limit exceeded: maximum 3 incident reports within 3 hours.';
  end if;

  select count(*) into report_count_24h
  from public.reports
  where coalesce(user_id::text, client_fingerprint) = identifier
    and created_at >= (now() - interval '24 hours');

  if report_count_24h >= 6 then
    raise exception 'Rate limit exceeded: maximum 6 incident reports within 24 hours.';
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger enforce_report_rate_limits
  before insert on public.reports
  for each row
  execute function public.enforce_report_rate_limits();

drop policy if exists "Authenticated users can submit reports" on public.reports;
drop policy if exists "Authenticated users can view reports" on public.reports;

create policy "Anyone can submit reports"
  on public.reports for insert
  with check (char_length(client_fingerprint) > 0);

create policy "Anyone can view reports"
  on public.reports for select
  using (true);
