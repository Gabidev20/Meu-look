"use client";

import { useTransition } from "react";
import { deleteOutfit, markWorn, toggleFavorite } from "@/app/actions";

export function OutfitActions({ id, isFavorite }: { id: string; isFavorite: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <button
        className="btn-ghost flex-1"
        disabled={pending}
        onClick={() => startTransition(() => markWorn(id))}
      >
        Usei hoje
      </button>
      <button
        className="btn-ghost"
        aria-label={isFavorite ? "Desfavoritar" : "Favoritar"}
        disabled={pending}
        onClick={() => startTransition(() => toggleFavorite(id, !isFavorite))}
      >
        {isFavorite ? "♥" : "♡"}
      </button>
      <button
        className="btn-ghost text-muted"
        aria-label="Excluir look"
        disabled={pending}
        onClick={() => {
          if (confirm("Excluir este look?")) startTransition(() => deleteOutfit(id));
        }}
      >
        ✕
      </button>
    </div>
  );
}
