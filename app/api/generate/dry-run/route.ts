// app/api/generate/dry-run/route.ts
// Basitleştirilmiş endpoint – şimdilik Gemini yok.
// Her zaman local bir “haber taslağı” üretir.
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type CategoryKey =
  | "airlines"
  | "airports"
  | "ground-handling"
  | "accidents"
  | "military-aviation"
  | "other";

type GenRequestBody = {
  input: string;
  maxChars?: number;
  fast?: boolean;
};

type GenImage = {
  url: string;
  alt?: string;
  credit?: string;
  link?: string;
  width?: number;
  height?: number;
  license?: string;
};

type GenResult = {
  seoTitle: string;
  metaDesc: string;
  slug: string;
  tags: string[];
  keywords: string[];
  category: CategoryKey;
  editorName: string;
  imageQuery: string;
  images: GenImage[];
  html: string;
};

const CATEGORY_EDITOR_MAP: Record<CategoryKey, string> = {
  airlines: "Metehan Özülkü",
  airports: "Kemal Kahraman",
  "ground-handling": "Hafife Kandemir",
  "military-aviation": "Musa Demirbilek",
  accidents: "Editör Ekibi",
  other: "Editör Ekibi",
};

function normaliseSlug(input: string): string {
  const map: Record<string, string> = {
    "ğ": "g",
    "Ğ": "g",
    "ü": "u",
    "Ü": "u",
    "ş": "s",
    "Ş": "s",
    "ı": "i",
    "İ": "i",
    "ö": "o",
    "Ö": "o",
    "ç": "c",
    "Ç": "c",
  };
  return input
    .trim()
    .toLowerCase()
    .replace(/[ğĞüÜşŞıİöÖçÇ]/g, (ch) => map[ch] ?? ch)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function detectCategory(text: string): CategoryKey {
  const t = text.toLowerCase();
  if (/\bkaza\b|\baccident\b|\bincident\b|\bcrash\b/.test(t)) return "accidents";
  if (/\bairline\b|\bcarrier\b|\bflight\b|\bsefer\b|\bfilo\b|\border\b|\bairbus\b|\bboeing\b/.test(t))
    return "airlines";
  if (/\bairport\b|\bterminal\b|\bpier\b|\bstand\b|\bgate\b|\bhavalimanı\b|\biga\b|\bsaw\b|\bist\b/.test(t))
    return "airports";
  if (/\bground handling\b|\byer hizmet\b|\bmarshalling\b|\bpbb\b|\bgpu\b|\bpca\b|\bpushback\b|\bbagaj\b/.test(t))
    return "ground-handling";
  if (/\bair force\b|\baskeri\b|\bmilitary\b|\bfighter\b|\bjet\b|\bdefence\b|\bdefense\b/.test(t))
    return "military-aviation";
  return "other";
}

function fallbackFromInput(input: string, maxChars?: number): GenResult {
  const safeInput = input.trim() || "Havacılık haberi için içerik girilmedi.";
  const firstLine =
    safeInput.split("\n").map((s) => s.trim())[0] ?? "Havacılık Haberi";

  let seoTitle =
    firstLine.length > 70 ? firstLine.slice(0, 67).trimEnd() + "..." : firstLine;
  if (!seoTitle) seoTitle = "Havacılık Haberi";

  const metaSource = safeInput.replace(/\s+/g, " ");
  let metaDesc =
    metaSource.length > 160
      ? metaSource.slice(0, 157).trimEnd() + "..."
      : metaSource;
  if (!metaDesc) metaDesc = "Güncel bir havacılık haberi.";

  const slug = normaliseSlug(seoTitle || "havacilik-haberi");

  const limit = typeof maxChars === "number" && maxChars > 0 ? maxChars : 4000;
  const trimmed = safeInput.slice(0, limit);
  const paragraphs = trimmed
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const ensuredParas =
    paragraphs.length >= 5
      ? paragraphs
      : [
          ...paragraphs,
          ...Array.from(
            { length: 5 - paragraphs.length },
            () =>
              "Bu bölüm, editör tarafından daha sonra detaylandırılacaktır."
          ),
        ];

  const html = ensuredParas.map((p) => `<p>${p}</p>`).join("\n");

  const category = detectCategory(safeInput);
  const editorName = CATEGORY_EDITOR_MAP[category];

  const imageQuery = "airport apron at night";

  return {
    seoTitle,
    metaDesc,
    slug,
    tags: [],
    keywords: [],
    category,
    editorName,
    imageQuery,
    images: [],
    html,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenRequestBody;

    if (!body || typeof body.input !== "string" || !body.input.trim()) {
      return NextResponse.json(
        { ok: false, error: "input alanı zorunludur." },
        { status: 200 }
      );
    }

    const result = fallbackFromInput(body.input, body.maxChars);

    // Studio bunu { ok: true, result: {...} } formatında bekliyor
    return NextResponse.json(
      {
        ok: true,
        result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const msg =
      typeof error === "object" && error && "message" in error
        ? String((error as any).message)
        : String(error ?? "Bilinmeyen hata");
    console.error("[generate/dry-run] Hata:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  }
}
