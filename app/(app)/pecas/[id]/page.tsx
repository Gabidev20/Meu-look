import { notFound } from "next/navigation";
import { ItemForm } from "@/components/ItemForm";
import { PageHeader } from "@/components/PageHeader";
import { withUrls } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

export default async function ItemPage({ params }: PageProps<"/pecas/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const [item] = await withUrls(supabase, [data as Item]);

  return (
    <>
      <PageHeader title={item.name} back="/" />
      <ItemForm
        id={item.id}
        imageUrl={item.image_url}
        initial={{
          image_path: item.image_path,
          name: item.name,
          category: item.category,
          colors: item.colors,
          pattern: item.pattern,
          material: item.material,
          style_tags: item.style_tags,
          formality: item.formality,
          seasons: item.seasons,
          description: item.description,
          notes: item.notes,
        }}
      />
    </>
  );
}
