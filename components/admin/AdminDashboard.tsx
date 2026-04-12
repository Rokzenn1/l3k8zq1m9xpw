"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { buildEventHeadline } from "@/lib/branding";
import type { CounterRow, ObjectiveRow } from "@/types";

export function AdminDashboard() {
  const router = useRouter();
  const [counter, setCounter] = useState<CounterRow | null>(null);
  const [objectives, setObjectives] = useState<ObjectiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState("");
  const [description, setDescription] = useState("");
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [proofRemovingId, setProofRemovingId] = useState<string | null>(null);
  const [fileById, setFileById] = useState<Record<string, File | undefined>>(
    {},
  );
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [evgFirstName, setEvgFirstName] = useState("");
  const [savingFirstName, setSavingFirstName] = useState(false);
  const [incrementLoading, setIncrementLoading] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [c, o, s] = await Promise.all([
      supabase.from("counter").select("*").limit(1).maybeSingle(),
      supabase.from("objectives").select("*").order("threshold", { ascending: true }),
      supabase.from("site_settings").select("evg_first_name").eq("id", 1).maybeSingle(),
    ]);
    if (c.data) setCounter(c.data as CounterRow);
    setObjectives((o.data as ObjectiveRow[]) ?? []);
    setEvgFirstName(
      typeof s.data?.evg_first_name === "string" ? s.data.evg_first_name : "",
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "counter" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "objectives" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  async function saveFirstName(e: React.FormEvent) {
    e.preventDefault();
    setSavingFirstName(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evg_first_name: evgFirstName }),
    });
    const json = await res.json();
    setSavingFirstName(false);
    if (!res.ok) {
      toast.error(json.error ?? "Erreur");
      return;
    }
    toast.success("Prénom enregistré");
    load();
  }

  async function addObjective(e: React.FormEvent) {
    e.preventDefault();
    const t = Number(threshold);
    const d = description.trim();
    if (!Number.isFinite(t) || t < 0 || !d) {
      toast.error("Renseigne un seuil valide et une description.");
      return;
    }
    const res = await fetch("/api/admin/objectives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threshold: t, description: d }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Erreur");
      return;
    }
    toast.success("Objectif ajouté");
    setThreshold("");
    setDescription("");
    load();
  }

  async function updateObjective(id: string, o: ObjectiveRow) {
    if (o.status !== "locked") return;
    const t = Number(prompt("Nouveau seuil ?", String(o.threshold)));
    const desc = prompt("Nouvelle description ?", o.description);
    if (!Number.isFinite(t) || t < 0 || !desc?.trim()) return;
    const res = await fetch(`/api/admin/objectives/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threshold: t, description: desc.trim() }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Erreur");
      return;
    }
    toast.success("Objectif mis à jour");
    load();
  }

  async function deleteObjective(id: string, o: ObjectiveRow) {
    if (o.status !== "locked") return;
    if (!confirm("Supprimer cet objectif ?")) return;
    const res = await fetch(`/api/admin/objectives/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Erreur");
      return;
    }
    toast.success("Supprimé");
    load();
  }

  async function validateObjective(id: string) {
    const file = fileById[id];
    setValidatingId(id);
    const fd = new FormData();
    fd.set("objectiveId", id);
    if (file) fd.set("file", file);
    const res = await fetch("/api/admin/validate", { method: "POST", body: fd });
    const json = await res.json();
    setValidatingId(null);
    if (!res.ok) {
      toast.error(json.error ?? "Erreur");
      return;
    }
    toast.success("Objectif validé !");
    setFileById((prev) => ({ ...prev, [id]: undefined }));
    load();
  }

  async function removeProof(id: string, o: ObjectiveRow) {
    if (o.status !== "validated" || !o.proof_url) return;
    if (
      !confirm(
        "Supprimer cette preuve ? L’objectif restera validé (sans fichier).",
      )
    ) {
      return;
    }
    setProofRemovingId(id);
    const res = await fetch(`/api/admin/objectives/${id}/proof`, {
      method: "DELETE",
    });
    const json = await res.json();
    setProofRemovingId(null);
    if (!res.ok) {
      toast.error(json.error ?? "Erreur");
      return;
    }
    toast.success("Preuve supprimée");
    load();
  }

  async function resetCounter() {
    const phrase = resetPhrase.trim();
    if (phrase !== "REINITIALISER") {
      toast.error("Tape exactement REINITIALISER pour confirmer.");
      return;
    }
    setResetLoading(true);
    const res = await fetch("/api/admin/counter/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmation: phrase }),
    });
    const json = await res.json();
    setResetLoading(false);
    if (!res.ok) {
      toast.error(json.error ?? "Erreur");
      return;
    }
    toast.success("Compteur et objectifs réinitialisés.");
    setResetModalOpen(false);
    setResetPhrase("");
    load();
  }

  async function incrementCounterManual() {
    setIncrementLoading(true);
    const res = await fetch("/api/admin/counter/increment", { method: "POST" });
    const json = await res.json();
    setIncrementLoading(false);
    if (!res.ok) {
      toast.error(json.error ?? "Erreur");
      return;
    }
    toast.success(`Compteur : ${json.value ?? "—"}`);
    load();
  }

  const unlocked = objectives.filter((o) => o.status === "unlocked");
  const reached = objectives.filter(
    (o) => o.status === "unlocked" || o.status === "validated",
  );

  return (
    <div className="app-shell min-h-full">
      <header className="border-b border-zinc-800 bg-[#141414]/95 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <GearIcon className="h-6 w-6 text-orange-400" />
            <div>
              <h1 className="text-lg font-black text-white">Admin Panel</h1>
              <p className="text-[11px] text-zinc-500">Compteur & objectifs</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-orange-500/35 hover:bg-zinc-800 hover:text-white"
              prefetch={false}
            >
              <HomeIcon className="h-3.5 w-3.5 text-orange-400/90" />
              Voir le site
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <section className="rounded-2xl border border-zinc-800 bg-[#1e1e1e] p-6 shadow-xl shadow-black/30">
          <h2 className="text-base font-bold text-white">Prénom (EVG)</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Affiché sur la page publique comme{" "}
            <span className="font-semibold text-zinc-400">
              {buildEventHeadline(evgFirstName || null)}
            </span>
            {process.env.NEXT_PUBLIC_EVENT_TITLE?.trim() ? (
              <span className="block mt-2 text-amber-600/90">
                Variable NEXT_PUBLIC_EVENT_TITLE active : elle remplace ce titre.
              </span>
            ) : null}
          </p>
          <form onSubmit={saveFirstName} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-sm">
              <span className="text-zinc-400">Prénom</span>
              <input
                type="text"
                value={evgFirstName}
                onChange={(e) => setEvgFirstName(e.target.value)}
                maxLength={80}
                className="rounded-xl border border-zinc-700 bg-[#141414] px-3 py-2.5 text-white placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                placeholder="Thomas"
                autoComplete="off"
              />
            </label>
            <button
              type="submit"
              disabled={savingFirstName}
              className="rounded-xl bg-zinc-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-600 disabled:opacity-50"
            >
              {savingFirstName ? "…" : "Enregistrer"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-[#1e1e1e] p-6 shadow-xl shadow-black/30">
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-500">
            Compteur live
          </h2>
          <p className="mt-3 bg-gradient-to-r from-orange-400 to-amber-200 bg-clip-text text-5xl font-black tabular-nums text-transparent">
            {loading ? "…" : (counter?.value ?? 0)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">Temps réel</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
          >
            <RefreshIcon className="h-4 w-4" />
            Refresh
          </button>

          <div className="mt-4 rounded-xl border border-orange-500/25 bg-orange-950/20 p-4">
            <p className="text-xs leading-relaxed text-zinc-400">
              Ajoute <span className="text-zinc-300">+1</span> comme une visite (même logique que le site : objectifs
              débloqués si seuil atteint).
            </p>
            <button
              type="button"
              disabled={incrementLoading}
              onClick={() => void incrementCounterManual()}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-600/20 py-2.5 text-sm font-semibold text-orange-200 transition hover:bg-orange-600/30 disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
              {incrementLoading ? "…" : "Incrémenter +1 (manuel)"}
            </button>
          </div>

          <div className="mt-6 border-t border-zinc-800 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-rose-400/90">
              Zone sensible
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Remet le compteur à 0, verrouille tous les objectifs et supprime les
              fichiers de preuve sur le stockage. Action irréversible.
            </p>
            <button
              type="button"
              onClick={() => {
                setResetPhrase("");
                setResetModalOpen(true);
              }}
              className="mt-3 w-full rounded-xl border border-rose-500/40 bg-rose-950/30 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-950/50"
            >
              Réinitialiser le compteur…
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-[#1e1e1e] p-6 shadow-xl shadow-black/30">
          <h2 className="text-base font-bold text-white">Ajouter un objectif</h2>
          <form onSubmit={addObjective} className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">Seuil</span>
              <input
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-[#141414] px-3 py-2.5 text-white placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                placeholder="10"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-400">Description</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl border border-zinc-700 bg-[#141414] px-3 py-2.5 text-white placeholder:text-zinc-600 focus:border-orange-500/50 focus:outline-none focus:ring-1 focus:ring-orange-500/40"
                placeholder="Boire une bière cul sec"
              />
            </label>
            <button
              type="submit"
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/30 transition hover:brightness-110"
            >
              <span className="text-lg leading-none">+</span>
              Ajouter
            </button>
          </form>
        </section>

        <section>
          <h2 className="text-base font-bold text-white">Objectifs</h2>
          <ul className="mt-4 space-y-3">
            {objectives.map((o) => (
              <li
                key={o.id}
                className="rounded-2xl border border-zinc-800 bg-[#1e1e1e] p-4 shadow-lg shadow-black/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">
                      {o.threshold} scans — {o.description}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={o.status} />
                    </div>
                    {o.proof_url && (
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <a
                          href={o.proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 hover:text-orange-300"
                        >
                          <EyeIcon className="h-4 w-4" />
                          Voir preuve
                        </a>
                        {o.status === "validated" && (
                          <button
                            type="button"
                            disabled={proofRemovingId === o.id}
                            onClick={() => void removeProof(o.id, o)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/35 bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-950/60 disabled:opacity-50"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                            {proofRemovingId === o.id ? "…" : "Supprimer la preuve"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {o.status === "locked" && (
                      <>
                        <button
                          type="button"
                          onClick={() => void updateObjective(o.id, o)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteObjective(o.id, o)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/70"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {o.status === "unlocked" && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-zinc-800 pt-4">
                    <p className="text-xs text-zinc-500">
                      Valider avec ou sans preuve — photo / vidéo optionnelles.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) =>
                        setFileById((prev) => ({
                          ...prev,
                          [o.id]: e.target.files?.[0],
                        }))
                      }
                      className="text-xs text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-200"
                    />
                    <button
                      type="button"
                      disabled={validatingId === o.id}
                      onClick={() => void validateObjective(o.id)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 disabled:opacity-50"
                    >
                      {validatingId === o.id ? "…" : "Valider"}
                    </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-[#1e1e1e] p-4">
          <h3 className="text-sm font-bold text-amber-200">
            Atteints — en attente de validation
          </h3>
          <p className="mt-2 text-sm text-amber-100/80">
            {unlocked.length === 0
              ? "Aucun pour l’instant."
              : unlocked.map((x) => x.description).join(" · ")}
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-[#141414]/80 p-4">
          <h3 className="text-sm font-bold text-zinc-300">
            Historique (atteints / validés)
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-zinc-500">
            {reached.length === 0 ? (
              <li>Aucun</li>
            ) : (
              reached.map((o) => (
                <li key={o.id}>
                  {o.description}{" "}
                  <span className="text-zinc-600">
                    ({o.status === "validated" ? "validé" : "atteint"})
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>

      {resetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-counter-title"
          onClick={() => {
            setResetModalOpen(false);
            setResetPhrase("");
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#1e1e1e] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="reset-counter-title"
              className="text-lg font-bold text-white"
            >
              Réinitialiser le compteur ?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Le compteur passera à <strong className="text-zinc-200">0</strong>.
              Tous les objectifs seront remis en <strong className="text-zinc-200">non atteint</strong>{" "}
              et les <strong className="text-zinc-200">preuves seront supprimées</strong> du
              stockage. Tu ne pourras pas annuler.
            </p>
            <label className="mt-5 block text-sm">
              <span className="text-zinc-500">
                Tape <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-orange-300">REINITIALISER</code> pour confirmer
              </span>
              <input
                type="text"
                autoComplete="off"
                value={resetPhrase}
                onChange={(e) => setResetPhrase(e.target.value)}
                placeholder="REINITIALISER"
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-[#141414] px-3 py-2.5 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-rose-500/40 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
              />
            </label>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setResetModalOpen(false);
                  setResetPhrase("");
                }}
                className="rounded-xl border border-zinc-600 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={
                  resetLoading || resetPhrase.trim() !== "REINITIALISER"
                }
                onClick={() => void resetCounter()}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-40"
              >
                {resetLoading ? "Réinitialisation…" : "Confirmer la réinitialisation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ObjectiveRow["status"] }) {
  if (status === "locked") {
    return (
      <span className="rounded-full border border-zinc-600 bg-zinc-900 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-400">
        Statut : Verrouillé
      </span>
    );
  }
  if (status === "unlocked") {
    return (
      <span className="rounded-full border border-amber-500/40 bg-amber-950/50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-200">
        Statut : Atteint
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200">
      <CheckIcon className="h-3 w-3" />
      Statut : Validé
    </span>
  );
}

function HomeIcon({ className }: { className?: string }) {
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
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
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
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
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

function RefreshIcon({ className }: { className?: string }) {
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
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
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
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
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
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
