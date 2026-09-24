import "server-only";
import { ApiError, GoogleGenAI, ThinkingLevel, type Content, type ThinkingConfig } from "@google/genai";
import { z } from "zod";
import { CATEGORY_VALUES, type Item, type Outfit, type SuggestedLook } from "./types";

let _client: GoogleGenAI | null = null;
const gemini = () => (_client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

// Modelos do plano gratuito, do melhor para o mais simples. Quando um está sobrecarregado
// (503), sem cota (429) ou indisponível, o próximo é tentado automaticamente.
export const MODELS = [
  ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
];

// Para catalogar uma foto, um modelo "lite" basta e responde em menos de 1s.
const FAST_MODELS = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.1-flash-lite"];

// Lembra qual modelo respondeu por último para tentar ele primeiro na próxima vez.
const lastGoodModel = new Map<string, string>(); // lista de modelos → último que respondeu

type Effort = "minimal" | "low";

/** Cada geração de modelo configura o "raciocínio" de um jeito. */
function thinkingFor(model: string, effort: Effort): ThinkingConfig | undefined {
  if (model.startsWith("gemini-2.5")) return { thinkingBudget: model.includes("lite") ? 0 : effort === "minimal" ? 0 : 1024 };
  if (model.startsWith("gemini-3")) return { thinkingLevel: effort === "minimal" ? ThinkingLevel.MINIMAL : ThinkingLevel.LOW };
  return undefined;
}

const RETRYABLE = [400, 404, 408, 429, 500, 502, 503, 504];

function friendly(e: unknown): Error {
  if (e instanceof TimeoutError) return new Error("A IA demorou demais para responder. Tente de novo em instantes.");
  if (e instanceof ApiError) {
    if (e.status === 429) return new Error("A cota gratuita da IA acabou por hoje. Tente de novo amanhã.");
    if (e.status === 503 || e.status >= 500)
      return new Error("A IA do Google está sobrecarregada agora. Tente de novo em alguns minutos.");
    if (e.status === 401 || e.status === 403)
      return new Error("A chave do Gemini foi recusada pelo Google. Confira a GEMINI_API_KEY na Vercel.");
  }
  return e instanceof Error ? e : new Error("Algo deu errado com a IA.");
}

class TimeoutError extends Error {}

/**
 * Chama o Gemini pedindo JSON no formato do schema e valida a resposta, passando pelos
 * modelos gratuitos até um responder. Tudo precisa caber no limite da função na Vercel (60s).
 */
async function generateJson<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  contents: Content[];
  effort: Effort;
  models?: string[];
}): Promise<z.infer<T>> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("A IA ainda não foi configurada (falta a GEMINI_API_KEY na Vercel).");
  }
  // O Gemini aceita JSON Schema, mas não precisa do cabeçalho "$schema".
  const jsonSchema: Record<string, unknown> = { ...z.toJSONSchema(opts.schema) };
  delete jsonSchema.$schema;

  const deadline = Date.now() + 50_000;
  const models = opts.models ?? MODELS;
  const key = models.join(",");
  const preferred = lastGoodModel.get(key);
  const order = preferred ? [preferred, ...models.filter((m) => m !== preferred)] : models;
  let lastError: unknown;

  for (const model of order) {
    const remaining = deadline - Date.now();
    if (remaining < 5_000) break;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(22_000, remaining));
    try {
      const response = await gemini().models.generateContent({
        model,
        contents: opts.contents,
        config: {
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
          thinkingConfig: thinkingFor(model, opts.effort),
          abortSignal: controller.signal,
        },
      });
      if (!response.text) throw new Error("A IA não respondeu. Tente de novo.");
      const result = opts.schema.parse(JSON.parse(response.text));
      lastGoodModel.set(key, model);
      return result;
    } catch (e) {
      lastError = controller.signal.aborted ? new TimeoutError() : e;
      console.error(`Gemini ${model} falhou:`, e instanceof Error ? e.message : e);
      if (controller.signal.aborted) continue;
      if (e instanceof ApiError && RETRYABLE.includes(e.status)) continue;
      if (e instanceof SyntaxError || e instanceof z.ZodError) continue; // JSON malformado: tenta outro modelo
      throw friendly(e);
    } finally {
      clearTimeout(timer);
    }
  }
  throw friendly(lastError);
}

/** Diagnóstico: testa rapidamente cada modelo com a chave configurada. */
export async function pingModels() {
  return Promise.all(
    MODELS.map(async (model) => {
      const started = Date.now();
      try {
        const r = await gemini().models.generateContent({
          model,
          contents: "Responda só: ok",
          config: { thinkingConfig: thinkingFor(model, "minimal"), abortSignal: AbortSignal.timeout(20_000) },
        });
        return { model, ok: true, ms: Date.now() - started, resposta: r.text?.slice(0, 20) };
      } catch (e) {
        return {
          model,
          ok: false,
          ms: Date.now() - started,
          erro: e instanceof ApiError ? `${e.status}: ${e.message.slice(0, 160)}` : String(e).slice(0, 160),
        };
      }
    }),
  );
}

// ---------------------------------------------------------------------------
// 1. Analisar a foto de uma peça
// ---------------------------------------------------------------------------

const ItemAnalysis = z.object({
  name: z.string().describe("Nome curto e descritivo, ex.: 'Camisa de linho branca'"),
  category: z.enum(CATEGORY_VALUES),
  colors: z.array(z.string()).describe("Cores principais em português, da mais presente para a menos"),
  pattern: z.string().describe("Estampa: liso, listrado, xadrez, floral, poá, animal print…"),
  material: z.string().describe("Tecido/material aparente; 'não identificado' se não der para saber"),
  style_tags: z.array(z.string()).describe("3 a 6 estilos, ex.: clássico, minimalista, boho, streetwear, romântico"),
  formality: z.number().int().min(1).max(5).describe("1 = bem casual … 5 = gala"),
  seasons: z.array(z.enum(["verão", "outono", "inverno", "primavera"])),
  description: z.string().describe("1–2 frases sobre modelagem, caimento e detalhes relevantes para combinar"),
});

export type ItemAnalysis = z.infer<typeof ItemAnalysis>;

export async function analyzeItemImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
): Promise<ItemAnalysis> {
  return generateJson({
    schema: ItemAnalysis,
    effort: "minimal",
    models: FAST_MODELS,
    system:
      "Você é um personal stylist catalogando o guarda-roupa de um cliente. " +
      "Descreva a peça principal da foto (ignore fundo, cabide, mãos ou pessoa vestindo). " +
      "Responda sempre em português do Brasil.",
    contents: [
      {
        role: "user",
        parts: [{ inlineData: { mimeType: mediaType, data: imageBase64 } }, { text: "Catalogue esta peça." }],
      },
    ],
  });
}

// ---------------------------------------------------------------------------
// 2. Montar looks só com as peças do guarda-roupa
// ---------------------------------------------------------------------------

const LooksResponse = z.object({
  looks: z.array(
    z.object({
      title: z.string().describe("Nome curto e charmoso para o look"),
      occasion: z.string(),
      item_ids: z.array(z.string()).describe("Códigos das peças usadas (ex.: p3)"),
      explanation: z.string().describe("Por que funciona: cores, proporções, formalidade — 2 a 3 frases"),
      styling_tip: z.string().describe("Uma dica de como vestir: dobrar a manga, meia-prenda, etc."),
    }),
  ),
  missing_note: z
    .string()
    .describe("Se o guarda-roupa não permitir atender bem ao pedido, explique o que falta. Senão, string vazia."),
});

export async function suggestLooks(opts: {
  items: Item[];
  request: string;
  mustInclude: string[];
  recentOutfits: Pick<Outfit, "item_ids" | "last_worn_at">[];
  count: number;
}): Promise<{ looks: SuggestedLook[]; missing_note: string }> {
  // O modelo trabalha com códigos curtos (p1, p2…) — menos chance de errar um UUID.
  const toCode = new Map<string, string>();
  const toId = new Map<string, string>();
  opts.items.forEach((item, i) => {
    const code = `p${i + 1}`;
    toCode.set(item.id, code);
    toId.set(code, item.id);
  });

  const catalog = opts.items
    .map((it) =>
      [
        `${toCode.get(it.id)} | ${it.name} | ${it.category}`,
        `cores: ${it.colors.join(", ") || "-"}`,
        `estampa: ${it.pattern ?? "-"}`,
        `material: ${it.material ?? "-"}`,
        `estilo: ${it.style_tags.join(", ") || "-"}`,
        `formalidade: ${it.formality}/5`,
        `estações: ${it.seasons.join(", ") || "-"}`,
        it.description ? `detalhes: ${it.description}` : null,
        it.notes ? `obs. da dona: ${it.notes}` : null,
      ]
        .filter(Boolean)
        .join(" | "),
    )
    .join("\n");

  const recent = opts.recentOutfits
    .filter((o) => o.last_worn_at)
    .slice(0, 10)
    .map((o) => o.item_ids.map((id) => toCode.get(id)).filter(Boolean).join(" + "))
    .filter(Boolean);

  const mustInclude = opts.mustInclude.map((id) => toCode.get(id)).filter(Boolean);

  const prompt = [
    `<guarda_roupa>\n${catalog}\n</guarda_roupa>`,
    recent.length ? `<usados_recentemente>\n${recent.join("\n")}\n</usados_recentemente>` : null,
    `Pedido: ${opts.request || "Looks elegantes e estilosos para o dia a dia."}`,
    mustInclude.length ? `Todos os looks devem incluir: ${mustInclude.join(", ")}.` : null,
    `Monte ${opts.count} looks diferentes entre si.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const parsed = await generateJson({
    schema: LooksResponse,
    effort: "low",
    system:
      "Você é um personal stylist experiente e com bom gosto. Monte looks usando EXCLUSIVAMENTE peças " +
      "do guarda-roupa informado, referenciadas pelos códigos (p1, p2…). Nunca invente peças.\n" +
      "Cada look precisa ser completo e vestível: parte de cima + parte de baixo (ou um vestido/macacão), " +
      "e sapato se houver algum cadastrado. Casaco, bolsa e acessórios são opcionais, use quando elevarem o look. " +
      "Respeite harmonia de cores, proporções, formalidade coerente entre as peças e a ocasião pedida. " +
      "Evite repetir combinações usadas recentemente. Escreva em português do Brasil, com tom próximo e elegante.",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const looks = parsed.looks
    .map((look) => ({
      ...look,
      item_ids: [...new Set(look.item_ids.map((code) => toId.get(code)).filter((id): id is string => !!id))],
    }))
    .filter((look) => look.item_ids.length >= 2);

  return { looks, missing_note: parsed.missing_note };
}
