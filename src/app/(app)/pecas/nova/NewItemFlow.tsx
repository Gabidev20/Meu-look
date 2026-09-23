"use client";

import Link from "next/link";
import { useState } from "react";
import { analyzeItem, type ItemInput } from "@/app/actions";
import { ItemForm } from "@/components/ItemForm";
import { resizeImage } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";

type Step =
  | { kind: "pick" }
  | { kind: "working"; preview: string; message: string }
  | { kind: "review"; preview: string; initial: ItemInput; formKey: number }
  | { kind: "saved" };

export function NewItemFlow({ userId }: { userId: string }) {
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const preview = URL.createObjectURL(file);
    try {
      setStep({ kind: "working", preview, message: "Preparando a foto…" });
      const blob = await resizeImage(file);

      setStep({ kind: "working", preview, message: "Enviando…" });
      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("wardrobe")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw new Error("Falha no envio da foto: " + upErr.message);

      setStep({ kind: "working", preview, message: "A IA está analisando a peça…" });
      const res = await analyzeItem(path);
      const base: ItemInput = {
        image_path: path,
        name: "",
        category: "top",
        formality: 3,
        colors: [],
        style_tags: [],
        seasons: [],
      };
      const initial = res.ok ? { ...base, ...res.data } : base;
      if (!res.ok) setError(`Não deu para analisar automaticamente (${res.error}). Preencha à mão.`);
      setStep({ kind: "review", preview, initial, formKey: Date.now() });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo deu errado.");
      setStep({ kind: "pick" });
    }
  }

  if (step.kind === "saved") {
    return (
      <div className="rounded-3xl bg-surface p-8 text-center">
        <p className="font-serif text-2xl">Peça salva ✓</p>
        <div className="mt-6 flex flex-col gap-3">
          <button className="btn-primary" onClick={() => setStep({ kind: "pick" })}>
            Adicionar outra peça
          </button>
          <Link href="/" className="btn-ghost">
            Ver guarda-roupa
          </Link>
        </div>
      </div>
    );
  }

  if (step.kind === "review") {
    return (
      <>
        {error && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p>}
        <ItemForm
          key={step.formKey}
          id={null}
          imageUrl={step.preview}
          initial={step.initial}
          onSaved={() => setStep({ kind: "saved" })}
        />
      </>
    );
  }

  if (step.kind === "working") {
    return (
      <div className="flex flex-col items-center gap-5 pt-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={step.preview} alt="" className="aspect-[3/4] w-2/3 max-w-xs animate-pulse rounded-3xl object-cover" />
        <p className="text-muted">{step.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-line bg-surface text-center">
        <span className="text-4xl">📷</span>
        <span className="font-medium">Tirar foto ou escolher da galeria</span>
        <span className="px-8 text-sm text-muted">
          Dica: peça esticada numa superfície lisa ou no cabide, com boa luz.
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) handleFile(file);
          }}
        />
      </label>
    </div>
  );
}
