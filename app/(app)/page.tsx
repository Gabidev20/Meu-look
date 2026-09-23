/* eslint-disable @next/next/no-img-element -- URLs assinadas do Supabase */
import Link from "next/link";
import { signOut } from "@/app/actions";
import { PageHeader } from "@/components/PageHeader";
import { listItems, withUrls } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";

export default async function WardrobePage({ searchParams }: PageProps<"/">) {
  const { categoria } = await searchParams;
  const supabase = await createClient();
  const items = await withUrls(supabase, await listItems(supabase));
  const shown = categoria ? items.filter((i) => i.category === categoria) : items;
  const counts = new Map<string, number>();
  items.forEach((i) => counts.set(i.category, (counts.get(i.category) ?? 0) + 1));

  return (
    <>
      <PageHeader
        title="Guarda-roupa"
        subtitle={`${items.length} ${items.length === 1 ? "peça" : "peças"}`}
        action={
          <form action={signOut}>
            <button className="text-sm text-muted">Sair</button>
          </form>
        }
      />

      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Link href="/" className={!categoria ? "chip-active" : "chip"}>
          Tudo
        </Link>
        {CATEGORIES.filter((c) => counts.has(c.value)).map((c) => (
          <Link
            key={c.value}
            href={`/?categoria=${c.value}`}
            className={categoria === c.value ? "chip-active" : "chip"}
          >
            {c.label} · {counts.get(c.value)}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface p-8 text-center">
          <p className="font-serif text-xl">Seu guarda-roupa está vazio</p>
          <p className="mt-2 text-sm text-muted">
            Fotografe suas peças (de preferência esticadas numa superfície lisa ou no cabide) e a IA
            cataloga tudo para você.
          </p>
          <Link href="/pecas/nova" className="btn-primary mt-6">
            Adicionar primeira peça
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {shown.map((item) => (
            <Link key={item.id} href={`/pecas/${item.id}`} className="group">
              <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-surface">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-full w-full object-cover transition group-active:scale-[0.98]"
                  loading="lazy"
                />
              </div>
              <p className="mt-1.5 truncate text-sm">{item.name}</p>
            </Link>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <Link
          href="/pecas/nova"
          aria-label="Adicionar peça"
          className="fixed right-5 bottom-24 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-3xl text-background shadow-lg"
        >
          +
        </Link>
      )}
    </>
  );
}
