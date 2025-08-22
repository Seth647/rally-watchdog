-- Create profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid references auth.users(id) primary key,
  username text,
  created_at timestamp with time zone not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can manage own profile"
  on public.profiles for all
  using (auth.uid() = id);

-- Add user_id to reports table to track report author
alter table public.reports add column if not exists user_id uuid references auth.users(id);

-- Require authentication for submitting and viewing reports
drop policy if exists "Anyone can submit reports" on public.reports;
drop policy if exists "Anyone can view reports" on public.reports;

create policy "Authenticated users can submit reports"
  on public.reports for insert
  with check (auth.uid() = user_id);

create policy "Authenticated users can view reports"
  on public.reports for select
  using (auth.role() = 'authenticated');
