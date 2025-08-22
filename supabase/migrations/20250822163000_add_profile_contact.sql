-- Add rally number and phone columns to profiles table
alter table public.profiles
  add column if not exists rally_number text,
  add column if not exists phone text;
