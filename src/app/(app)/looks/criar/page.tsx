import { PageHeader } from "@/components/PageHeader";
import { listItems, withUrls } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { LookCreator } from "./LookCreator";

// A IA pode levar alguns segundos para montar os looks.
export const maxDuration = 60;

export default async function CreateLookPage() {
  const supabase = await createClient();
  const items = await withUrls(supabase, await listItems(supabase));

  return (
    <>
      <PageHeader title="Criar look" subtitle="Só com as peças que você tem" />
      <LookCreator items={items} />
    </>
  );
}
