import "server-only";
import { ApiError, GoogleGenAI, type Content } from "@google/genai";
import { z } from "zod";
import { CATEGORY_VALUES, type Item, type Outfit, type SuggestedLook } from "./types";

let _client: GoogleGenAI | null = null;
const gemini = () => (_client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }));

// Modelos do plano gratuito. Se a cota do principal acabar no dia, tenta o reserva.
const MODELS = [process.env.GEMINI_MODEL || "gemini-3.5-flash", "gemini-3.1-flash-lite"];

/** Chama o Gemini pedindo JSON no formato do schema e valida a resposta. */
async function generateJson<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  contents: Content[];
}): Promise<z.infer<T>> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("A IA ainda não foi configurada (falta a GEMINI_API_KEY na Vercel).");
  }
  // O Gemini aceita JSON Schema, mas não precisa do cabeçalho "$schema".
  const jsonSchema: Record<string, unknown> = { ...z.toJSONSchema(opts.schema) };
  delete jsonSchema.$schema;
  let lastError: unknown;
  for (const model of MODELS) {
    try {
      const response = await gemini().models.generateContent({
        model,
        contents: opts.contents,
        config: {
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchema,
        },
      });
      if (!response.text) throw new Error("A IA não respondeu. Tente de novo.");
      return opts.schema.parse(JSON.parse(response.text));
    } catch (e) {
      lastError = e;
      // 429 = cota gratuita esgotada; 404 = modelo indisponível. Nos dois casos, tenta o próximo.
      if (e instanceof ApiError && (e.status === 429 || e.status === 404)) continue;
      throw e;
    }
  }
  if (lastError instanceof ApiError && lastError.status === 429) {
    throw new Error("A cota gratuita da IA acabou por hoje. Tente de novo amanhã.");
  }
  throw lastError;
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
