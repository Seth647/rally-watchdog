-- Seed admin account for Grant
insert into public.admins (username, password)
values ('Grant', 'Convoytrackeristhebest')
on conflict (username) do update
set password = excluded.password;