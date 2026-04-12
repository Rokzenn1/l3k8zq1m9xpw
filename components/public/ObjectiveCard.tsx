"use client";

import type { ObjectiveRow, ObjectiveStatus } from "@/types";

type Props = {
  objective: ObjectiveRow;
  onViewProof?: (o: ObjectiveRow) => void;
};

function statusLine(s: ObjectiveStatus): string {
  switch (s) {
    case "locked":
      return "Pas encore atteint";
    case "unlocked":
      return "⌛ En attente…";
    case "validated":
      return "✓ Validé";
    default:
      return s;
  }
}

function cardSurface(s: ObjectiveStatus): string {
  switch (s) {
    case "locked":
      return [
        "border-rose-500/25",
        "bg-gradient-to-br from-rose-600/25 via-[#1e1e1e] to-[#141414]",
        "shadow-[0_0_24px_-8px_rgba(244,63,94,0.35)]",
      ].join(" ");
    case "unlocked":
      return [
        "border-amber-400/30",
        "bg-gradient-to-br from-amber-500/20 via-[#1e1e1e] to-[#141414]",
        "shadow-[0_0_24px_-8px_rgba(245,158,11,0.35)]",
      ].join(" ");
    case "validated":
      return [
        "border-emerald-500/30",
        "bg-gradient-to-br from-emerald-600/22 via-[#1e1e1e] to-[#141414]",
        "shadow-[0_0_24px_-8px_rgba(16,185,129,0.3)]",
      ].join(" ");
    default:
      return "";
  }
}

function dotEmoji(s: ObjectiveStatus): string {
  switch (s) {
    case "locked":
      return "🔴";
    case "unlocked":
      return "🟡";
    case "validated":
      return "🟢";
    default:
      return "⚪";
  }
}

export function ObjectiveCard({ objective, onViewProof }: Props) {
  const validated = objective.status === "validated";

  return (
    <article
      className={`rounded-2xl border p-4 transition-transform duration-200 hover:scale-[1.01] ${cardSurface(objective.status)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-tight text-zinc-100">
            <span aria-hidden className="mr-1.5">
              {dotEmoji(objective.status)}
            </span>
            {objective.threshold} scans
          </p>
          <p className="mt-2 text-[15px] font-semibold leading-snug text-white">
            {objective.description}
          </p>
          <p className="mt-3 text-sm text-zinc-400">{statusLine(objective.status)}</p>
        </div>
        {validated && objective.proof_url && (
          <button
            type="button"
            onClick={() => onViewProof?.(objective)}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2.5 text-zinc-200 transition hover:border-white/20 hover:bg-white/10"
            aria-label="Voir la preuve"
            title="Voir la preuve"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </article>
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
