import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Item, ItemWithUrl, Outfit } from "./types";

export const BUCKET = "wardrobe";

/** Anexa URLs assinadas (válidas por 1h) às peças — o bucket é privado. */
export async function withUrls(supabase: SupabaseClient, items: Item[]): Promise<ItemWithUrl[]> {
  if (items.length === 0) return [];
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(items.map((i) => i.image_path), 60 * 60);
  const urls = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return items.map((i) => ({ ...i, image_url: urls.get(i.image_path) ?? "" }));
}

export async function listItems(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Item[];
}

export async function listOutfits(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("outfits")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Outfit[];
}
