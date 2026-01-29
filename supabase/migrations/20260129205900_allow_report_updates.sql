-- Allow frontend clients to update report statuses via the anon key
drop policy if exists "Anyone can update reports" on public.reports;
drop policy if exists "Frontend can update reports" on public.reports;

create policy "Frontend can update reports"
  on public.reports
  for update
  using (auth.role() in ('anon', 'authenticated'))
  with check (auth.role() in ('anon', 'authenticated'));
