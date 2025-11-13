// app/api/generate/dry-run/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const CATEGORY_EDITOR_MAP = {
  airlines: "Metehan Özülkü",
  airports: "Kemal Kahraman",
  "ground-handling": "Hafife Kandemir",
  "military-aviation": "Musa Demirbilek",
  accidents: "Editör Ekibi",
  other: "Editör Ekibi",
} as const;

type CategoryKey = keyof typeof CATEGORY_EDITOR_MAP;

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
  images?: GenImage[];
  html: string;
};

function normaliseSlug(input: string): string {
  const map: Record<string, string> = {
    ğ: "g",
    Ğ: "g",
    ü: "u",
    Ü: "u",
    ş: "s",
    Ş: "s",
    ı: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ç: "c",
    Ç: "c",
  };
  return input
    .trim()
    .toLowerCase()
    .replace(/[ğĞüÜşŞıİöÖçÇ]/g, (ch) => map[ch] || ch)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function pickCategoryFromKeywords(keywords: string[]): CategoryKey {
  const joined = keywords.join(" ").toLowerCase();

  const scores: Record<CategoryKey, number> = {
    airlines: 0,
    airports: 0,
    "ground-handling": 0,
    accidents: 0,
    "military-aviation": 0,
    other: 0,
  };

  const bump = (cat: CategoryKey, amount = 1) => {
    scores[cat] += amount;
  };

  if (joined.match(/\bkaza\b|\baccident\b|\bincident\b|\bcrash\b/)) {
    bump("accidents", 3);
  }

  if (
    joined.match(
      /\bairline\b|\bcarrier\b|\bsefer\b|\bflight\b|\bfilo\b|\border\b|\bairbus\b|\bboeing\b|\bmax\b|\bneo\b/
    )
  ) {
    bump("airlines", 2);
  }

  if (
    joined.match(
      /\bairport\b|\bterminal\b|\bpier\b|\bstand\b|\bgate\b|\bhavalimanı\b|\biga\b|\bsaw\b|\bist\b/
    )
  ) {
    bump("airports", 2);
  }

  if (
    joined.match(
      /\bground handling\b|\byer hizmet\b|\bmarshalling\b|\bpbb\b|\bköprü\b|\bgpu\b|\bpca\b|\bpushback\b/
    )
  ) {
    bump("ground-handling", 2);
  }

  if (
    joined.match(
      /\bair force\b|\bairforce\b|\baskeri\b|\bmilitary\b|\bfighter\b|\bjet\b|\bdefence\b|\bdefense\b/
    )
  ) {
    bump("military-aviation", 2);
  }

  let best: CategoryKey = "other";
  let bestScore = 0;
  (Object.entries(scores) as [CategoryKey, number][]).forEach(
    ([cat, score]) => {
      if (score > bestScore) {
        bestScore = score;
        best = cat;
      }
    }
  );

  return best;
}

function buildSystemPrompt(): string {
  return `
Sen, Türkçe yazan profesyonel bir havacılık haber editörüsün.
Görevin: Sana verilen ham konu metninden (başlık + link + kısa özet) yola çıkarak;
SEO uyumlu, teknik olarak temiz, tarafsız ve profesyonel bir haberi JSON formatında üretmek.

GENEL İLKELER:
- Haber dili kullan; abartılı, magazinsel veya sansasyonel ifade kullanma.
- "Biz", "ben", "yazar" gibi öznel ifadeler kullanma; tarafsız kal.
- Haberde verilmeyen tarihleri, sayıları, alıntıları uydurma.
- Kazalar ve olaylarda spekülasyondan kaçın; resmi açıklamalar netleşmeden kesin hüküm verme.
- HTML gövdede en az 5 paragraf olsun (<p>...</p>).

GREVLİK/MRO/TEKNİK HABERLERDE İLK 5 PARAGRAF:
1) Sürecin seyri / tarihçe
2) Talepler ve rakamlar
3) İşverenin pozisyonu
4) Olası etkiler / operasyonel yansımalar
5) Sektörel bağlam / arka plan

KATEGORİLER:
- "airlines"          → havayolları, filo, sefer, sipariş
- "airports"          → havalimanı işletmesi, terminal, pist, apron, stand
- "ground-handling"   → yer hizmetleri, PBB, GPU, PCA, pushback, bagaj operasyonu
- "accidents"         → kaza, incident, emergency iniş, runway excursion
- "military-aviation" → savaş uçakları, hava kuvvetleri, savunma projeleri
- Kararsızsan "other" kullan.

EDİTÖR ATAMASI:
- airlines          → "Metehan Özülkü"
- airports          → "Kemal Kahraman"
- ground-handling   → "Hafife Kandemir"
- military-aviation → "Musa Demirbilek"
- accidents / other → "Editör Ekibi"

SEO:
- seoTitle: 55–70 karakter, Türkçe, net ve tıklanabilir ama clickbait değil.
- metaDesc: 130–160 karakter, haberi özetleyen bir cümle.
- slug: Türkçe karakterleri sadeleştir (ğ→g, ş→s, ı→i, ö→o, ü→u, ç→c), küçük harf, tire ile ayır.

GÖRSEL:
- imageQuery: İngilizce, marka adı içermeyen kısa görsel arama ifadesi (ör. "airport apron at night").
- images: Eğer gerçek telifsiz görsel kaynağına referans veremiyorsan boş dizi [] döndür.

ÇIKTI JSON FORMATIN:
{
  "seoTitle": string,
  "metaDesc": string,
  "slug": string,
  "tags": string[],
  "keywords": string[],
  "category": "airlines" | "airports" | "ground-handling" | "accidents" | "military-aviation" | "other",
  "editorName": string,
  "imageQuery": string,
  "images": GenImage[] (veya []),
  "html": string
}

KESİNLİKLE:
- Sadece tek bir JSON nesnesi döndür.
- Açıklama, yorum, Markdown vb. ekleme.`;
}

async function callGeminiJSON(body: GenRequestBody): Promise<GenResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY tanımlı değil");
  }

  const { input, maxChars, fast } = body;

  const model =
    fast === true ? "models/gemini-2.0-flash" : "models/gemini-2.5-flash";

  const maxTokens =
    typeof maxChars === "number" && maxChars > 0
      ? Math.min(Math.max(Math.round(maxChars / 4), 256), 4096)
      : 2048;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              buildSystemPrompt() +
              `

HAM GİRDİ:
${input}
`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: fast ? 0.9 : 0.7,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: maxTokens,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Gemini API error: ${resp.status} ${resp.statusText} - ${text}`
    );
  }

  const data: any = await resp.json();
  const textOutput: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error("Gemini boş çıktı döndürdü.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(textOutput);
  } catch {
    const match = textOutput.match(/\{[\s\S]*\}$/m);
    if (!match) {
      throw new Error("Gemini çıktısı JSON formatında değil.");
    }
    parsed = JSON.parse(match[0]);
  }

  const seoTitle = String(parsed.seoTitle || "").trim();
  const metaDesc = String(parsed.metaDesc || "").trim();
  const slugRaw = String(parsed.slug || seoTitle || "").trim();
  const slug = normaliseSlug(slugRaw || seoTitle || "havacilik-haberi");

  const tags: string[] = Array.isArray(parsed.tags)
    ? parsed.tags
        .map((t: any) => String(t || "").trim())
        .filter((t: string) => t.length > 0)
    : [];

  const keywords: string[] = Array.isArray(parsed.keywords)
    ? parsed.keywords
        .map((t: any) => String(t || "").trim())
        .filter((t: string) => t.length > 0)
    : [];

  let category: CategoryKey =
    (parsed.category as CategoryKey) || "other";

  if (
    ![
      "airlines",
      "airports",
      "ground-handling",
      "accidents",
      "military-aviation",
      "other",
    ].includes(category)
  ) {
    category = pickCategoryFromKeywords(keywords);
  }

  const editorName: string =
    parsed.editorName && typeof parsed.editorName === "string"
      ? parsed.editorName
      : CATEGORY_EDITOR_MAP[category];

  const imageQuery: string =
    (parsed.imageQuery && String(parsed.imageQuery).trim()) ||
    "airport runway at sunset";

  const images: GenImage[] = Array.isArray(parsed.images)
    ? parsed.images
        .map((img: any) => ({
          url: String(img?.url || "").trim(),
          alt: img?.alt ? String(img.alt) : undefined,
          credit: img?.credit ? String(img.credit) : undefined,
          link: img?.link ? String(img.link) : undefined,
          width:
            typeof img?.width === "number" ? (img.width as number) : undefined,
          height:
            typeof img?.height === "number"
              ? (img.height as number)
              : undefined,
          license: img?.license ? String(img.license) : undefined,
        }))
        .filter((img) => img.url.length > 0)
    : [];

  const html = String(parsed.html || "").trim();

  if (!seoTitle || !html) {
    throw new Error("Gemini çıktısı eksik: seoTitle veya html yok.");
  }

  return {
    seoTitle,
    metaDesc,
    slug,
    tags,
    keywords,
    category,
    editorName,
    imageQuery,
    images,
    html,
  };
}

// Gemini çökerse bile boş dönmemek için fallback
function fallbackFromInput(input: string): GenResult {
  const firstLine = input.split("\n").map((s) => s.trim())[0] || "Havacılık Haberi";
  const seoTitle =
    firstLine.length > 70 ? firstLine.slice(0, 67) + "..." : firstLine;

  const metaDesc =
    input.length > 150 ? input.slice(0, 147) + "..." : input;

  const slug = normaliseSlug(seoTitle || "havacilik-haberi");

  const html =
    "<p>" +
    input
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .join("</p><p>") +
    "</p>";

  return {
    seoTitle,
    metaDesc,
    slug,
    tags: [],
    keywords: [],
    category: "other",
    editorName: CATEGORY_EDITOR_MAP.other,
    imageQuery: "airport apron at night",
    images: [],
    html,
  };
}

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json()) as GenRequestBody;

    if (!json || typeof json.input !== "string" || !json.input.trim()) {
      return NextResponse.json(
        { error: "input alanı zorunludur." },
        { status: 400 }
      );
    }

    let result: GenResult;
    try {
      result = await callGeminiJSON(json);
    } catch (e) {
      console.error("[generate/dry-run] Gemini hatası, fallback kullanılıyor:", e);
      result = fallbackFromInput(json.input);
    }

    // ÖNEMLİ: Eski kontratla uyumlu — sadece alanları döndür, "ok" vb. yok
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("[generate/dry-run] genel hata:", error);
    return NextResponse.json(
      { error: String(error?.message || error || "Bilinmeyen hata") },
      { status: 500 }
    );
  }
}
