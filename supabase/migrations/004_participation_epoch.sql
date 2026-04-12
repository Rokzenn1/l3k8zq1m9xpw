-- Permet de distinguer les « vagues » après reset compteur (nouvelle participation par appareil)
alter table public.site_settings
  add column if not exists participation_epoch integer not null default 0;
