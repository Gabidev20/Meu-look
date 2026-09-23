export const CATEGORIES = [
  { value: "top", label: "Partes de cima" },
  { value: "bottom", label: "Partes de baixo" },
  { value: "dress", label: "Vestidos e macacões" },
  { value: "outerwear", label: "Casacos e blazers" },
  { value: "shoes", label: "Sapatos" },
  { value: "bag", label: "Bolsas" },
  { value: "accessory", label: "Acessórios" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value) as [Category, ...Category[]];

export const categoryLabel = (value: string) =>
  CATEGORIES.find((c) => c.value === value)?.label ?? value;

export const SEASONS = ["verão", "outono", "inverno", "primavera"] as const;

export const FORMALITY_LABELS: Record<number, string> = {
  1: "Bem casual",
  2: "Casual",
  3: "Casual chique",
  4: "Social",
  5: "Gala / black tie",
};

export type Item = {
  id: string;
  user_id: string;
  image_path: string;
  name: string;
  category: Category;
  colors: string[];
  pattern: string | null;
  material: string | null;
  style_tags: string[];
  formality: number;
  seasons: string[];
  description: string | null;
  notes: string | null;
  created_at: string;
};

export type ItemWithUrl = Item & { image_url: string };

export type Outfit = {
  id: string;
  user_id: string;
  title: string;
  occasion: string | null;
  item_ids: string[];
  explanation: string | null;
  styling_tip: string | null;
  is_favorite: boolean;
  worn_count: number;
  last_worn_at: string | null;
  created_at: string;
};

/** Look sugerido pela IA, ainda não salvo. */
export type SuggestedLook = {
  title: string;
  occasion: string;
  item_ids: string[];
  explanation: string;
  styling_tip: string;
};
