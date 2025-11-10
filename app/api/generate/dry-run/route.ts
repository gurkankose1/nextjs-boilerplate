// app/api/generate/dry-run/route.ts
import { NextResponse } from "next/server";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

type GenReq = {
  input: string;
  language?: string;
};

function buildPrompt(userInput: string) {
  return `
Sen deneyimli bir haber editörüsün. Aşağıdaki girdiye dayanarak SEO uyumlu, özgün bir HABER TASLAĞI üret.

Kurallar (önemli):
- Dil: Türkçe
- ÇIKTIYI YALNIZCA GEÇERLİ BİR JSON OLARAK DÖN (başka yazı, açıklama veya kod bloğu koyma).
- Şema:
{
  "seoTitle": string,
  "metaDesc": string,
  "slug": string,
  "tags": string[],
  "keywords": string[],
  "html": string
}

İpuçları:
- ana fikirleri özgünleştir, kopyalama yapma
- havacılık/airline/airport bağlamını koru (varsa)
- html içinde gereksiz boşluk/kod bloğu olmasın

Girdi:
${userInput}
`;
}

async function callGemini(content: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY yok");

  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: content }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1200
        // responseMimeType: "application/json"  // (bazı modellerde desteklenmediği için çıkarıldı)
      },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini hata: ${resp.status} ${t}`);
  }

  const data = await resp.json();
  const raw =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ??
    "";

  // --- SAĞLAMLAŞTIRILMIŞ PARSE ---
  const tryParse = (s: string) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  // 1) Kod bloğu işaretlerini temizle
  let cleaned = String(raw).trim()
    .replace(/^```(json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  // 2) Direkt parse dene
  let parsed = tryParse(cleaned);

  // 3) Olmadıysa, ilk { ile son } arasını al ve parse et
  if (!parsed) {
    const match = cleaned.match(/{[\s\S]*}/);
    if (match) parsed = tryParse(match[0]);
  }

  // 4) Hâlâ yoksa, ham metni html olarak sarmala (fallback)
  if (!parsed) {
    parsed = {
      seoTitle: "",
      metaDesc: "",
      slug: "",
      tags: [],
      keywords: [],
      html: cleaned || String(raw) || "",
      __debugRaw: String(raw).slice(0, 2000) // debug amaçlı
    };
  }

  return parsed;
}

function buildImageQuery(userInput: string, ai: any) {
  const parts: string[] = [];
  if (Array.isArray(ai?.keywords) && ai.keywords.length)
    parts.push(ai.keywords.slice(0, 6).join(" "));
  if (ai?.seoTitle) parts.push(ai.seoTitle);
  if (userInput) parts.push(userInput);
  parts.push("aviation airline airport aircraft airplane airliner uçak havacılık havaalanı");
  const q = parts.join(" ").trim();
  return q.length > 160 ? q.slice(0, 160) : q;
}

async function searchPexels(query: string) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return { images: [] };

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query || "aviation");
  url.searchParams.set("per_page", "6");
  url.searchParams.set("orientation", "landscape");

  const r = await fetch(url.toString(), {
    headers: { Authorization: key },
  });

  if (!r.ok) return { images: [] };

  const j = await r.json();
  const images =
    (j.photos || []).map((p: any) => ({
      id: p.id,
      url: p.src?.large2x || p.src?.large || p.src?.original,
      alt: p.alt,
      credit: p.photographer,
      link: p.url,
      width: p.width,
      height: p.height,
    })) ?? [];

  return { images };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenReq;
    const userInput = (body.input || "").trim();
    const prompt = buildPrompt(userInput);

    const ai = await callGemini(prompt);

    // Boş alanlar için makul fallback
    const seoTitle = ai?.seoTitle || userInput.slice(0, 70);
    const metaDesc = ai?.metaDesc || "Güncel havacılık haberi ve detaylar.";
    const slug =
      ai?.slug ||
      seoTitle
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 80);
    const tags = Array.isArray(ai?.tags) && ai.tags.length ? ai.tags : ["Havacılık", "Gündem"];
    const keywords =
      Array.isArray(ai?.keywords) && ai.keywords.length
        ? ai.keywords
        : ["uçak", "havacılık", "havaalanı", "airline", "aviation"];
    const html = ai?.html || `<h2>${seoTitle}</h2><p>${metaDesc}</p>`;

    const imageQuery = buildImageQuery(userInput, { keywords, seoTitle });
    const imgs = await searchPexels(imageQuery);

    return NextResponse.json(
      {
        ok: true,
        result: {
          seoTitle,
          metaDesc,
          slug,
          tags,
          html,
          keywords,
          images: imgs.images,
          imageQuery,
          debugRaw: ai?.__debugRaw || undefined
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
