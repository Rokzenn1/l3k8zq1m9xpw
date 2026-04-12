"use client";

import { useEffect } from "react";
import type { ObjectiveRow } from "@/types";

type Props = {
  objectives: ObjectiveRow[] | null;
  onClose: () => void;
};

export function MilestoneCelebration({ objectives, onClose }: Props) {
  const open = Boolean(objectives?.length);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      onClose();
    }, 5200);
    return () => clearTimeout(t);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !objectives?.length) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="milestone-title"
      onClick={onClose}
    >
      <div
        className="celebration-pop max-w-md rounded-3xl border border-orange-500/35 bg-gradient-to-b from-zinc-900 to-[#141414] px-6 py-8 text-center shadow-2xl shadow-orange-900/40"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-5xl" aria-hidden>
          🎊
        </p>
        <h2
          id="milestone-title"
          className="mt-4 bg-gradient-to-r from-orange-300 via-amber-200 to-orange-300 bg-clip-text text-2xl font-black text-transparent sm:text-3xl"
        >
          Palier débloqué !
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {objectives.length === 1
            ? "Nouvel objectif atteint"
            : `${objectives.length} objectifs atteints d’un coup`}
        </p>
        <ul className="mt-6 space-y-3 text-left">
          {objectives.map((o) => (
            <li
              key={o.id}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
            >
              <span className="text-orange-400">{o.threshold} scans</span>
              <span className="mx-2 text-zinc-600">·</span>
              {o.description}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-8 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 py-3 text-sm font-bold text-white shadow-lg shadow-orange-900/30 transition hover:brightness-110"
        >
          C’est parti 🔥
        </button>
      </div>
    </div>
  );
}
