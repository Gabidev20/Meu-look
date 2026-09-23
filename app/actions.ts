"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { analyzeItemImage, suggestLooks, type ItemAnalysis } from "@/lib/ai";
import { BUCKET, listItems, listOutfits } from "@/lib/data";
import { createClient, requireUser } from "@/lib/supabase/server";
import { CATEGORY_VALUES, type SuggestedLook } from "@/lib/types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(e: unknown): { ok: false; error: string } {
  console.error(e);
  return { ok: false, error: e instanceof Error ? e.message : "Algo deu errado." };
}

// --- Conta --------------------------------------------------------------------

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// --- Peças --------------------------------------------------------------------

/** Lê a foto já enviada ao Storage e pede para a IA catalogar. */
export async function analyzeItem(imagePath: string): Promise<Result<ItemAnalysis>> {
  try {
    const { supabase, user } = await requireUser();
    if (!imagePath.startsWith(`${user.id}/`)) throw new Error("Foto inválida.");

    const { data: blob, error } = await supabase.storage.from(BUCKET).download(imagePath);
    if (error || !blob) throw new Error("Não encontrei a foto enviada.");

    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    return { ok: true, data: await analyzeItemImage(base64, "image/jpeg") };
  } catch (e) {
    return fail(e);
  }
}

const ItemInput = z.object({
  image_path: z.string().min(1),
  name: z.string().trim().min(1, "Dê um nome para a peça."),
  category: z.enum(CATEGORY_VALUES),
  colors: z.array(z.string().trim()).default([]),
  pattern: z.string().trim().nullable().default(null),
  material: z.string().trim().nullable().default(null),
  style_tags: z.array(z.string().trim()).default([]),
  formality: z.number().int().min(1).max(5),
  seasons: z.array(z.string()).default([]),
  description: z.string().trim().nullable().default(null),
  notes: z.string().trim().nullable().default(null),
});

export type ItemInput = z.input<typeof ItemInput>;

export async function saveItem(id: string | null, input: ItemInput): Promise<Result<{ id: string }>> {
  try {
    const { supabase, user } = await requireUser();
    const parsed = ItemInput.parse(input);
    if (!parsed.image_path.startsWith(`${user.id}/`)) throw new Error("Foto inválida.");

    const query = id
      ? supabase.from("items").update(parsed).eq("id", id).select("id").single()
      : supabase.from("items").insert(parsed).select("id").single();
    const { data, error } = await query;
    if (error) throw error;

    revalidatePath("/");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteItem(id: string): Promise<Result<null>> {
  try {
    const { supabase } = await requireUser();
    const { data: item } = await supabase.from("items").select("image_path").eq("id", id).single();
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) throw error;
    if (item) await supabase.storage.from(BUCKET).remove([item.image_path]);
    revalidatePath("/");
    revalidatePath("/looks");
    return { ok: true, data: null };
  } catch (e) {
    return fail(e);
  }
}

// --- Looks --------------------------------------------------------------------

export async function generateLooks(opts: {
  request: string;
  mustInclude: string[];
}): Promise<Result<{ looks: SuggestedLook[]; missing_note: string }>> {
  try {
    const { supabase } = await requireUser();
    const [items, outfits] = await Promise.all([listItems(supabase), listOutfits(supabase)]);
    if (items.length < 2) throw new Error("Cadastre pelo menos algumas peças primeiro.");

    const recentOutfits = [...outfits].sort((a, b) =>
      (b.last_worn_at ?? "").localeCompare(a.last_worn_at ?? ""),
    );

    const data = await suggestLooks({
      items,
      request: opts.request.slice(0, 500),
      mustInclude: opts.mustInclude,
      recentOutfits,
      count: 3,
    });
    return { ok: true, data };
  } catch (e) {
    return fail(e);
  }
}

const OutfitInput = z.object({
  title: z.string().trim().min(1),
  occasion: z.string().trim().nullable(),
  item_ids: z.array(z.uuid()).min(1),
  explanation: z.string().nullable(),
  styling_tip: z.string().nullable(),
});

export async function saveOutfit(input: z.input<typeof OutfitInput>): Promise<Result<{ id: string }>> {
  try {
    const { supabase } = await requireUser();
    const { data, error } = await supabase
      .from("outfits")
      .insert(OutfitInput.parse(input))
      .select("id")
      .single();
    if (error) throw error;
    revalidatePath("/looks");
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleFavorite(id: string, value: boolean) {
  const { supabase } = await requireUser();
  await supabase.from("outfits").update({ is_favorite: value }).eq("id", id);
  revalidatePath("/looks");
}

export async function markWorn(id: string) {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("outfits").select("worn_count").eq("id", id).single();
  await supabase
    .from("outfits")
    .update({ worn_count: (data?.worn_count ?? 0) + 1, last_worn_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/looks");
}

export async function deleteOutfit(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("outfits").delete().eq("id", id);
  revalidatePath("/looks");
}
