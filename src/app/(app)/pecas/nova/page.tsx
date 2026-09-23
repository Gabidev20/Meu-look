import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { NewItemFlow } from "./NewItemFlow";

// A análise da foto pela IA pode levar alguns segundos.
export const maxDuration = 60;

export default async function NewItemPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <PageHeader title="Nova peça" back="/" />
      <NewItemFlow userId={user!.id} />
    </>
  );
}
