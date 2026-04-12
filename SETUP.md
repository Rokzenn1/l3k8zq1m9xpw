# Configuration EVG QR

## Prérequis

- Node.js 20+
- Compte [Supabase](https://supabase.com) et [Vercel](https://vercel.com)
- Dépot GitHub (optionnel mais recommandé)

## 1. Supabase

1. Crée un projet Supabase.
2. **SQL** : dans l’éditeur SQL, exécute dans l’ordre :
   - `supabase/migrations/001_initial.sql`
   - `supabase/migrations/002_realtime.sql` (si erreur « already member », c’est normal)
   - `supabase/migrations/003_site_settings.sql` (prénom EVG éditable dans l’admin)
3. **Auth** : Authentication → Providers → Email activé.
4. **Utilisateur admin** : Authentication → Users → Add user (email + mot de passe).  
   Utilise le **même email** que dans `ADMIN_EMAILS`.
5. **Storage** : vérifie que le bucket `proofs` existe (créé par le script ; sinon Storage → New bucket → `proofs`, public).

## 2. Variables d’environnement

Copie `.env.example` vers `.env.local` et renseigne :

- `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API).
- `SUPABASE_SERVICE_ROLE_KEY` (Settings → API, **secret** — uniquement serveur / Vercel).
- `ADMIN_EMAILS` : liste d’emails autorisés pour `/admin`, séparés par des virgules.
- Optionnel : `NEXT_PUBLIC_EVENT_TITLE` remplace **tout** le titre (sinon : prénom saisi dans **Admin** → « EVG Prénom 🎉 »).

## 3. Local

```bash
npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000) — la première ouverture dans un **onglet** enregistre une visite via `POST /api/visit`. Un **rafraîchissement** (F5) dans le même onglet **ne compte pas** à nouveau (`sessionStorage`). Nouvel onglet ou autre appareil = nouvelle visite (comportement voulu pour plusieurs scans).

## 4. Déploiement Vercel

1. Importe le repo GitHub dans Vercel.
2. Ajoute les **mêmes** variables d’environnement (Production + Preview si besoin).
3. Déploie. Le domaine Vercel servira de cible pour le **QR code** (URL publique).

## Admin — réinitialisation

Dans le dashboard, **Réinitialiser le compteur** exige de taper exactement `REINITIALISER` : remise du compteur à 0, objectifs verrouillés, preuves supprimées du stockage.

**Supprimer la preuve** sur un objectif validé retire le fichier et repasse l’objectif en « atteint » (tu peux renvoyer une autre preuve).

## 5. QR code

Génère un QR pointant vers l’URL de production (ex. `https://ton-app.vercel.app`).  
Chaque scan ouvre la page : **une visite par session d’onglet** (pas de double comptage au refresh). Pour « rejouer » un scan de test, ferme l’onglet ou ouvre le lien dans un nouvel onglet.

## Sécurité (rappel)

- Les écritures sur `counter` et `objectives` passent par la fonction `record_visit()` (public) ou par les **API routes** avec la clé service + session admin.
- Ne commite jamais `.env.local` ni la clé service.
