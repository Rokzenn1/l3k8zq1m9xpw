"use client";

import { useEffect } from "react";
import type { ObjectiveRow } from "@/types";

type Props = {
  objective: ObjectiveRow | null;
  onClose: () => void;
};

export function ProofModal({ objective, onClose }: Props) {
  useEffect(() => {
    if (!objective) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [objective, onClose]);

  if (!objective?.proof_url) return null;

  const url = objective.proof_url;
  const isVideo =
    /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url) ||
    url.includes("video/");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-2xl border border-zinc-800 bg-[#1e1e1e] shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <p className="truncate pr-2 text-sm font-semibold text-white">
            {objective.description}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            Fermer
          </button>
        </div>
        <div className="flex max-h-[min(70vh,600px)] items-center justify-center bg-black">
          {isVideo ? (
            <video
              src={url}
              controls
              playsInline
              className="max-h-[min(70vh,600px)] w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Preuve"
              className="max-h-[min(70vh,600px)] w-full object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}
