-- Activer Realtime pour le compteur et les objectifs (Dashboard + page publique)
-- Si une table est déjà dans la publication, ignorer l'erreur éventuelle.

alter publication supabase_realtime add table public.counter;
alter publication supabase_realtime add table public.objectives;
