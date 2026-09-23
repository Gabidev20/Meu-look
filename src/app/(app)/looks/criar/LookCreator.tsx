"use client";
/* eslint-disable @next/next/no-img-element -- URLs assinadas do Supabase */

import Link from "next/link";
import { useState, useTransition } from "react";
import { generateLooks, saveOutfit } from "@/app/actions";
import { LookCollage } from "@/components/LookCollage";
import type { ItemWithUrl, SuggestedLook } from "@/lib/types";

const OCCASIONS = [
  "Trabalho",
  "Jantar romântico",
  "Casual de fim de semana",
  "Festa à noite",
  "Casamento de dia",
  "Viagem confortável",
  "Dia quente",
  "Dia frio",
];

export function LookCreator({ items }: { items: ItemWithUrl[] }) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const [request, setRequest] = useState("");
  const [mustInclude, setMustInclude] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [looks, setLooks] = useState<SuggestedLook[]>([]);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await generateLooks({ request, mustInclude });
      if (!res.ok) return setError(res.error);
      setLooks(res.data.looks);
      setNote(res.data.missing_note);
      setSaved(new Set());
    });
  }

  function save(index: number) {
    const look = looks[index];
    startTransition(async () => {
      const res = await saveOutfit({
        title: look.title,
        occasion: look.occasion,
        item_ids: look.item_ids,
        explanation: look.explanation,
        styling_tip: look.styling_tip,
      });
      if (!res.ok) return setError(res.error);
      setSaved((s) => new Set(s).add(index));
    });
  }

  if (items.length < 2) {
    return (
      <div className="rounded-3xl border border-dashed border-line bg-surface p-8 text-center">
        <p className="font-serif text-xl">Faltam peças</p>
        <p className="mt-2 text-sm text-muted">Cadastre algumas peças para a IA ter com o que trabalhar.</p>
        <Link href="/pecas/nova" className="btn-primary mt-6">
          Adicionar peça
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <textarea
          className="input min-h-24"
          placeholder="Para onde você vai? Ex.: almoço de negócios, quero algo elegante mas não muito formal"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
        />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {OCCASIONS.map((o) => (
            <button key={o} type="button" className="chip" onClick={() => setRequest(o)}>
              {o}
            </button>
          ))}
        </div>

        <button type="button" className="text-sm text-accent" onClick={() => setShowPicker((v) => !v)}>
          {mustInclude.length
            ? `Usando ${mustInclude.length} peça(s) obrigatória(s) — alterar`
            : "+ Quero usar uma peça específica"}
        </button>

        {showPicker && (
          <div className="grid grid-cols-4 gap-2 rounded-2xl bg-surface p-2">
            {items.map((item) => {
              const on = mustInclude.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setMustInclude((m) => (on ? m.filter((x) => x !== item.id) : [...m, item.id]))
                  }
                  className={`aspect-square overflow-hidden rounded-xl ring-2 ${on ? "ring-accent" : "ring-transparent"}`}
                >
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        )}

        <button onClick={run} disabled={pending} className="btn-primary w-full">
          {pending && looks.length === 0 ? "Montando looks…" : looks.length ? "Gerar outras opções" : "Montar looks ✨"}
        </button>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>

      {pending && (
        <p className="text-center text-sm text-muted">O stylist está combinando suas peças… (leva uns segundos)</p>
      )}

      {note && <p className="rounded-xl bg-accent-soft p-3 text-sm">{note}</p>}

      {looks.map((look, i) => (
        <article key={i} className="space-y-3 rounded-3xl bg-surface p-4">
          <LookCollage items={look.item_ids.map((id) => byId.get(id)).filter((x): x is ItemWithUrl => !!x)} />
          <div>
            <h2 className="font-serif text-xl">{look.title}</h2>
            <p className="text-xs tracking-wider text-muted uppercase">{look.occasion}</p>
          </div>
          <p className="text-sm leading-relaxed">{look.explanation}</p>
          <p className="text-sm text-muted">
            <span className="font-medium text-foreground">Dica: </span>
            {look.styling_tip}
          </p>
          <button
            onClick={() => save(i)}
            disabled={pending || saved.has(i)}
            className={saved.has(i) ? "btn-ghost w-full" : "btn-primary w-full"}
          >
            {saved.has(i) ? "Salvo em Meus looks ✓" : "Salvar look"}
          </button>
        </article>
      ))}
    </div>
  );
}
