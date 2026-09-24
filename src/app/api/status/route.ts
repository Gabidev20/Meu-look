// Diagnóstico da configuração: diz apenas se cada chave existe e seu tamanho, nunca o valor.
export const dynamic = "force-dynamic";

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

export function GET() {
  return Response.json({
    GEMINI_API_KEY: describe("GEMINI_API_KEY"),
    NEXT_PUBLIC_SUPABASE_URL: describe("NEXT_PUBLIC_SUPABASE_URL"),
    deploy: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    ambiente: process.env.VERCEL_ENV ?? "local",
  });
}
