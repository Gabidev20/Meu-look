"use client";
/* eslint-disable @next/next/no-img-element -- preview local / URL assinada */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteItem, saveItem, type ItemInput } from "@/app/actions";
import { CATEGORIES, FORMALITY_LABELS, SEASONS } from "@/lib/types";

const splitList = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export function ItemForm({
  id,
  imageUrl,
  initial,
  onSaved,
}: {
  id: string | null;
  imageUrl: string;
  initial: ItemInput;
  onSaved?: (id: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    ...initial,
    colorsText: (initial.colors ?? []).join(", "),
    stylesText: (initial.style_tags ?? []).join(", "),
  });
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function toggleSeason(s: string) {
    const seasons = form.seasons ?? [];
    set("seasons", seasons.includes(s) ? seasons.filter((x) => x !== s) : [...seasons, s]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { colorsText, stylesText, ...rest } = form;
    startTransition(async () => {
      const res = await saveItem(id, {
        ...rest,
        colors: splitList(colorsText),
        style_tags: splitList(stylesText),
        pattern: rest.pattern || null,
        material: rest.material || null,
        description: rest.description || null,
        notes: rest.notes || null,
      });
      if (!res.ok) return setError(res.error);
      if (onSaved) onSaved(res.data.id);
      else router.push("/");
    });
  }

  function remove() {
    if (!id) return;
    startTransition(async () => {
      const res = await deleteItem(id);
      if (!res.ok) return setError(res.error);
      router.push("/");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="mx-auto aspect-[3/4] w-2/3 max-w-xs overflow-hidden rounded-3xl bg-surface">
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      </div>

      <div>
        <label className="label">Nome</label>
        <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>

      <div>
        <label className="label">Categoria</label>
        <select
          className="input"
          value={form.category}
          onChange={(e) => set("category", e.target.value as ItemInput["category"])}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Cores</label>
          <input className="input" value={form.colorsText} onChange={(e) => set("colorsText", e.target.value)} />
        </div>
        <div>
          <label className="label">Estampa</label>
          <input className="input" value={form.pattern ?? ""} onChange={(e) => set("pattern", e.target.value)} />
        </div>
        <div>
          <label className="label">Material</label>
          <input className="input" value={form.material ?? ""} onChange={(e) => set("material", e.target.value)} />
        </div>
        <div>
          <label className="label">Estilo</label>
          <input className="input" value={form.stylesText} onChange={(e) => set("stylesText", e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label">Formalidade — {FORMALITY_LABELS[form.formality]}</label>
        <input
          type="range"
          min={1}
          max={5}
          value={form.formality}
          onChange={(e) => set("formality", Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
      </div>

      <div>
        <label className="label">Estações</label>
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => toggleSeason(s)}
              className={(form.seasons ?? []).includes(s) ? "chip-active" : "chip"}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Detalhes</label>
        <textarea
          className="input min-h-20"
          value={form.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>

      <div>
        <label className="label">Suas observações (opcional)</label>
        <textarea
          className="input min-h-16"
          placeholder="Ex.: fica um pouco justa, uso mais para trabalhar…"
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {/* Confirmação na própria página: alguns navegadores bloqueiam o confirm() nativo. */}
      {confirmingDelete && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          <span className="flex-1">Remover esta peça do guarda-roupa?</span>
          <button type="button" className="text-muted" onClick={() => setConfirmingDelete(false)}>
            Cancelar
          </button>
          <button type="button" onClick={remove} disabled={pending} className="font-medium text-red-700">
            {pending ? "Removendo…" : "Sim, remover"}
          </button>
        </div>
      )}

      <div className="flex gap-3">
        {id && (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            disabled={pending}
            className="btn-ghost text-red-700"
          >
            Remover
          </button>
        )}
        <button disabled={pending} className="btn-primary flex-1">
          {pending ? "Salvando…" : "Salvar peça"}
        </button>
      </div>
    </form>
  );
}
