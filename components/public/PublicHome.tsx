"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { AnimatedCounter } from "@/components/public/AnimatedCounter";
import { ObjectiveCard } from "@/components/public/ObjectiveCard";
import { ProofModal } from "@/components/public/ProofModal";
import { useEventData } from "@/hooks/useEventData";
import { useMilestoneCelebration } from "@/hooks/useMilestoneCelebration";
import { useRecordVisit } from "@/hooks/useRecordVisit";
import { MilestoneCelebration } from "@/components/public/MilestoneCelebration";
import { NextObjectiveGauge } from "@/components/public/NextObjectiveGauge";
import { buildEventHeadline } from "@/lib/branding";
import type { ObjectiveRow } from "@/types";

function heroSubcopy(value: number): { line1: string; line2: string } {
    return {
      line1: "Objectifs & compteur",
      line2: "Une participation par appareil — le rafraîchissement ne compte pas en plus.",
    };
}

export function PublicHome() {
  const {
    counter,
    objectives,
    evgFirstName,
    participationEpoch,
    loading,
    error,
    refresh,
  } = useEventData();
  const [proof, setProof] = useState<ObjectiveRow | null>(null);

  const onVisitDone = useCallback(() => {
    toast.success("Participation enregistrée !", { duration: 2200 });
    refresh();
  }, [refresh]);

  useRecordVisit(onVisitDone, {
    participationEpoch: participationEpoch ?? 0,
    ready: !loading && participationEpoch !== null,
  });

  const value = counter?.value ?? 0;
  const { celebration, clearCelebration } = useMilestoneCelebration(
    value,
    objectives,
  );
  const sub = useMemo(() => heroSubcopy(value), [value]);
  const headline = useMemo(
    () => buildEventHeadline(evgFirstName),
    [evgFirstName],
  );

  return (
    <div className="app-shell relative flex min-h-full flex-col">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-28 pt-8 sm:px-6 sm:pt-10">
        <header className="text-center">
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-[1.65rem]">
            {headline}
          </h1>
        </header>

        <section
          className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-zinc-800/90 bg-[#1e1e1e]/90 px-5 py-8 shadow-xl shadow-black/40"
          aria-live="polite"
        >
          {loading && !counter ? (
            <p className="text-zinc-500">Chargement…</p>
          ) : (
            <>
              <p className="text-center text-3xl font-black leading-none sm:text-4xl">
                <span className="text-orange-400">🔥</span>
                <span className="mx-1 sm:mx-1.5">
                  <AnimatedCounter
                    value={value}
                    className="bg-gradient-to-r from-orange-400 via-amber-100 to-orange-300 bg-clip-text text-transparent"
                  />
                </span>
                <span className="text-white"> scans </span>
                <span className="text-orange-400">🔥</span>
              </p>
              <p className="mt-4 max-w-[20rem] text-center text-sm font-medium text-zinc-400">
                {sub.line1}
              </p>
              <p className="mt-1 max-w-[20rem] text-center text-xs text-zinc-500">
                {sub.line2}
              </p>
              <NextObjectiveGauge
                counter={value}
                objectives={objectives}
                loading={loading}
              />
            </>
          )}
        </section>

        {error && (
          <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-2 text-center text-sm text-rose-200">
            {error}
          </p>
        )}

        <section className="mt-10">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">
            Objectifs
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {objectives.length === 0 && !loading && (
              <li className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-10 text-center text-sm text-zinc-500">
                Aucun objectif pour le moment.
              </li>
            )}
            {objectives.map((o) => (
              <li key={o.id}>
                <ObjectiveCard
                  objective={o}
                  onViewProof={(obj) => setProof(obj)}
                />
              </li>
            ))}
          </ul>
        </section>
      </main>

      <ProofModal objective={proof} onClose={() => setProof(null)} />

      <MilestoneCelebration
        objectives={celebration}
        onClose={clearCelebration}
      />

      <footer className="fixed bottom-0 left-0 right-0 border-t border-zinc-800/80 bg-[#141414]/95 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg justify-center px-4">
          <Link
            href="/admin/dashboard"
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-5 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
          >
            <GearIcon className="h-3.5 w-3.5 text-zinc-500" />
            Admin
          </Link>
        </div>
      </footer>
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
