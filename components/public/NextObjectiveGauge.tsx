"use client";

import { useMemo } from "react";
import { getNextObjectiveProgress } from "@/lib/next-objective-progress";
import type { ObjectiveRow } from "@/types";

type Props = {
  counter: number;
  objectives: ObjectiveRow[];
  loading?: boolean;
};

export function NextObjectiveGauge({ counter, objectives, loading }: Props) {
  const state = useMemo(
    () => getNextObjectiveProgress(counter, objectives),
    [counter, objectives],
  );

  if (loading && objectives.length === 0) {
    return (
      <div className="mt-6 w-full rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-4">
        <div className="h-3 animate-pulse rounded-full bg-zinc-800" />
      </div>
    );
  }

  if (state.kind === "empty") {
    return null;
  }

  if (state.kind === "all_done") {
    return (
      <div className="mt-6 w-full rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-4 py-4 text-center">
        <p className="text-sm font-bold text-emerald-200">
          Tous les paliers sont débloqués 🎉
        </p>
        <p className="mt-1 text-xs text-emerald-200/70">
          Objectif max : {state.maxThreshold} scans
        </p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="gauge-fill-done h-full w-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
            style={{ width: "100%" }}
          />
        </div>
      </div>
    );
  }

  const pct = Math.round(state.progress * 100);
  const { next, prevThreshold, scansInSegment, scansToNext } = state;

  return (
    <div className="mt-6 w-full rounded-xl border border-orange-500/25 bg-zinc-900/50 px-4 py-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-orange-400/90">
            Prochain palier
          </p>
          <p className="mt-1 text-sm font-semibold text-white">
            {next.threshold} scans — {next.description}
          </p>
        </div>
        <p className="text-2xl font-black tabular-nums text-orange-300">
          {pct}%
        </p>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        {scansInSegment} / {scansToNext} scans depuis{" "}
        {prevThreshold === 0 ? "le départ" : `le palier ${prevThreshold}`}
      </p>
      <div
        className="mt-3 h-4 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-white/5"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progression vers le prochain objectif"
      >
        <div
          className="gauge-fill h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 shadow-[0_0_20px_rgba(251,146,60,0.35)] transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
