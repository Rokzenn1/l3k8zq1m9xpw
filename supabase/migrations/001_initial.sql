-- EVG QR Counter — schéma initial Supabase
-- Exécuter dans SQL Editor (Dashboard Supabase) ou via CLI

create extension if not exists "pgcrypto";

do $$ begin
  create type objective_status as enum ('locked', 'unlocked', 'validated');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.counter (
  id uuid primary key default gen_random_uuid(),
  value integer not null default 0
);

create table if not exists public.objectives (
  id uuid primary key default gen_random_uuid(),
  threshold integer not null check (threshold >= 0),
  description text not null,
  status objective_status not null default 'locked',
  proof_url text,
  created_at timestamptz not null default now()
);

insert into public.counter (value)
select 0 where not exists (select 1 from public.counter limit 1);

create or replace function public.record_visit()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_val integer;
begin
  update public.counter
  set value = value + 1
  where id = (select id from public.counter order by id limit 1)
  returning value into new_val;

  if new_val is null then
    insert into public.counter (value) values (1) returning value into new_val;
  end if;

  update public.objectives
  set status = 'unlocked'
  where status = 'locked'
    and threshold <= new_val;

  return new_val;
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.counter to anon, authenticated;
grant select on public.objectives to anon, authenticated;
grant execute on function public.record_visit() to anon, authenticated;

alter table public.counter enable row level security;
alter table public.objectives enable row level security;

create policy "counter_public_read"
  on public.counter for select
  using (true);

create policy "objectives_public_read"
  on public.objectives for select
  using (true);

-- Bucket preuves (créer aussi via Dashboard → Storage si besoin)
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', true)
on conflict (id) do nothing;

create policy "proofs_public_read"
  on storage.objects for select
  using (bucket_id = 'proofs');
