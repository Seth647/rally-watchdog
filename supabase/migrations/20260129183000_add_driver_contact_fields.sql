-- Add contact fields to drivers table for admin CRUD tooling
alter table public.drivers
  add column if not exists email text,
  add column if not exists license_plate_number text;

-- Backfill any missing license plate numbers with the existing vehicle number
update public.drivers
set license_plate_number = coalesce(license_plate_number, vehicle_number)
where license_plate_number is null;
