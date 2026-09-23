/* eslint-disable @next/next/no-img-element -- URLs assinadas do Supabase, não otimizamos */
import type { ItemWithUrl } from "@/lib/types";

const ORDER = ["outerwear", "top", "dress", "bottom", "shoes", "bag", "accessory"];

/** Monta as peças do look lado a lado, como num moodboard. */
export function LookCollage({ items }: { items: ItemWithUrl[] }) {
  const sorted = [...items].sort((a, b) => ORDER.indexOf(a.category) - ORDER.indexOf(b.category));
  const cols = sorted.length <= 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className={`grid ${cols} gap-1.5 rounded-2xl bg-white p-1.5`}>
      {sorted.map((item) => (
        <div key={item.id} className="aspect-[3/4] overflow-hidden rounded-xl bg-[#f3f0ea]">
          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
        </div>
      ))}
    </div>
  );
}
