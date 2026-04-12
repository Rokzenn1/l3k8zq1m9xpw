"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Connexion réussie");
    router.push(next);
    router.refresh();
  }

  return (
    <div className="app-shell flex min-h-full flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-[#1e1e1e] p-8 shadow-2xl shadow-black/40">
        <div className="flex justify-center">
          <GearIcon className="h-10 w-10 text-orange-400" />
        </div>
        <h1 className="mt-4 text-center text-xl font-black text-white">
          Connexion admin
        </h1>
        <p className="mt-2 text-center text-sm text-zinc-500">
          Compte autorisé (email configuré côté serveur)
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="text-zinc-400">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#141414] px-3 py-2.5 text-white placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-400">Mot de passe</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#141414] px-3 py-2.5 text-white placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/30 transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm">
          <Link
            href="/"
            className="font-medium text-orange-400 hover:text-orange-300"
          >
            ← Retour au site
          </Link>
        </p>
      </div>
    </div>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell min-h-full p-8 text-center text-zinc-500">
          Chargement…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
