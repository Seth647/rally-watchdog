-- Allow anonymous/frontend clients to manage drivers (temporary until admin auth is integrated)
drop policy if exists "Authenticated users can manage drivers" on public.drivers;

create policy "Frontend clients can manage drivers"
  on public.drivers
  for all
  using (auth.role() in ('anon', 'authenticated'))
  with check (auth.role() in ('anon', 'authenticated'));
