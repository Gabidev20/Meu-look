import { pingModels } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

// Diagnóstico da configuração: diz apenas se cada chave existe e seu tamanho, nunca o valor.
// Com ?modelos=1 (só para quem está logado), testa cada modelo gratuito do Gemini.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function describe(name: string) {
  const raw = process.env[name];
  if (raw === undefined) return { existe: false };
  return {
    existe: true,
    tamanho: raw.length,
    espacos_nas_pontas: raw !== raw.trim(),
    aspas: /^["']|["']$/.test(raw.trim()),
  };
}

export async function GET(request: Request) {
  const body: Record<string, unknown> = {
    GEMINI_API_KEY: describe("GEMINI_API_KEY"),
    NEXT_PUBLIC_SUPABASE_URL: describe("NEXT_PUBLIC_SUPABASE_URL"),
    deploy: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    ambiente: process.env.VERCEL_ENV ?? "local",
  };

  if (new URL(request.url).searchParams.has("modelos")) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    body.modelos = user ? await pingModels() : "entre no site para testar os modelos";
  }

  return Response.json(body);
}
