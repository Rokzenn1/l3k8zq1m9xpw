-- Prénom EVG (une ligne, id = 1)
create table if not exists public.site_settings (
  id smallint primary key check (id = 1),
  evg_first_name text not null default ''
);

insert into public.site_settings (id, evg_first_name)
values (1, '')
on conflict (id) do nothing;

grant select on public.site_settings to anon, authenticated;

alter table public.site_settings enable row level security;

create policy "site_settings_public_read"
  on public.site_settings for select
  using (true);

-- Temps réel (ignorer si déjà ajouté)
alter publication supabase_realtime add table public.site_settings;
