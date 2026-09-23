import Link from "next/link";
import { LookCollage } from "@/components/LookCollage";
import { PageHeader } from "@/components/PageHeader";
import { listItems, listOutfits, withUrls } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { OutfitActions } from "./OutfitActions";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export default async function LooksPage({ searchParams }: PageProps<"/looks">) {
  const { filtro } = await searchParams;
  const supabase = await createClient();
  const [items, outfits] = await Promise.all([
    listItems(supabase).then((i) => withUrls(supabase, i)),
    listOutfits(supabase),
  ]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const shown = filtro === "favoritos" ? outfits.filter((o) => o.is_favorite) : outfits;

  return (
    <>
      <PageHeader title="Meus looks" subtitle={`${outfits.length} salvos`} />

      <div className="mb-5 flex gap-2">
        <Link href="/looks" className={filtro !== "favoritos" ? "chip-active" : "chip"}>
          Todos
        </Link>
        <Link href="/looks?filtro=favoritos" className={filtro === "favoritos" ? "chip-active" : "chip"}>
          Favoritos
        </Link>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface p-8 text-center">
          <p className="font-serif text-xl">Nenhum look por aqui</p>
          <Link href="/looks/criar" className="btn-primary mt-6">
            Criar um look
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {shown.map((outfit) => {
            const lookItems = outfit.item_ids.map((id) => byId.get(id)).filter((x) => !!x);
            return (
              <article key={outfit.id} className="space-y-3 rounded-3xl bg-surface p-4">
                <LookCollage items={lookItems} />
                <div>
                  <h2 className="font-serif text-xl">{outfit.title}</h2>
                  <p className="text-xs tracking-wider text-muted uppercase">
                    {outfit.occasion}
                    {outfit.worn_count > 0 &&
                      ` · usado ${outfit.worn_count}x` +
                        (outfit.last_worn_at ? `, último em ${dateFmt.format(new Date(outfit.last_worn_at))}` : "")}
                  </p>
                </div>
                {outfit.explanation && <p className="text-sm leading-relaxed">{outfit.explanation}</p>}
                {outfit.styling_tip && (
                  <p className="text-sm text-muted">
                    <span className="font-medium text-foreground">Dica: </span>
                    {outfit.styling_tip}
                  </p>
                )}
                {lookItems.length < outfit.item_ids.length && (
                  <p className="text-xs text-muted">Alguma peça deste look foi removida do guarda-roupa.</p>
                )}
                <OutfitActions id={outfit.id} isFavorite={outfit.is_favorite} />
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
