"use client";

import { useState, useTransition } from "react";
import { deleteOutfit, markWorn, toggleFavorite } from "@/app/actions";

export function OutfitActions({ id, isFavorite }: { id: string; isFavorite: boolean }) {
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Confirmação na própria página: alguns navegadores bloqueiam o confirm() nativo.
  if (confirmingDelete) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
        <span className="flex-1">Excluir este look?</span>
        <button className="text-muted" onClick={() => setConfirmingDelete(false)}>
          Cancelar
        </button>
        <button
          className="font-medium text-red-700"
          disabled={pending}
          onClick={() => startTransition(() => deleteOutfit(id))}
        >
          {pending ? "Excluindo…" : "Sim, excluir"}
        </button>
      </div>
    );
  }

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
        onClick={() => setConfirmingDelete(true)}
      >
        ✕
      </button>
    </div>
  );
}
