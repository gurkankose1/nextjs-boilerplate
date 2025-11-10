// app/api/generate/dry-run/route.ts
import { NextResponse } from "next/server";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent";

type GenReq = { input: string; language?: string };

function baseSchemaText() {
  return `
ÇIKTIYI YALNIZCA GEÇERLİ BİR JSON OLARAK DÖN (başka yazı, kod bloğu, açıklama ekleme).
Şema:
{
  "seoTitle": string,          // 60-70 karakter
  "metaDesc": string,          // 120-155 karakter
  "slug": string,              // kısa, latin harf, tireli
  "tags": string[],            // 3-7 etiket
  "keywords": string[],        // 5-12 anahtar kelime
  "html": string               // EN AZ 5 paragraf, <h2> alt başlıkları ve <p> paragraflarıyla
}
`;
}

function buildPrompt(userInput: string) {
  return `
Sen deneyimli bir haber editörüsün. Aşağıdaki girdiye dayanarak özgün, SEO uyumlu bir HABER TASLAĞI üret.
- Dil: Türkçe
- Konu: Havacılık/airline/airport bağlamını koru (varsa)
${baseSchemaText()}

Girdi:
${userInput}
`;
}

function buildRetryPrompt(userInput: string) {
  return `
İlk çıktı kısa/eksikti. Aşağıdaki girdiye dayanarak aynı şemada TAM ve UZUN bir haber oluştur:
- Dil: Türkçe
- EN AZ 5 paragraf, toplamda ~400–700 kelime.
- Uçak, havalimanı, şirket, filo, rota vb. bağlamları mümkün olduğunca ayrıntılandır.
${baseSchemaText()}

Girdi:
${userInput}
`;
}

async function callGeminiOnce(promptText: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY yok");

  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2048
      }
    })
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

  // Robust JSON parse
  const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };

  // Kod bloğu sarımlarını temizle
  let cleaned = String(raw).trim()
    .replace(/^```(json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  let parsed: any = tryParse(cleaned);
  if (!parsed) {
    const match = cleaned.match(/{[\s\S]*}/);
    if (match) parsed = tryParse(match[0]);
  }
  if (!parsed) {
    parsed = { seoTitle: "", metaDesc: "", slug: "", tags: [], keywords: [], html: "" };
  }
  return parsed;
}

function normalizeSlug(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function ensureFilled(ai: any, userInput: string) {
  const seoTitle = (ai?.seoTitle || userInput).slice(0, 70);
  const metaDesc = ai?.metaDesc || "Güncel havacılık haberi ve detaylar.";
  const slug = normalizeSlug(ai?.slug || seoTitle);
  const tags = Array.isArray(ai?.tags) && ai.tags.length ? ai.tags : ["Havacılık", "Gündem"];
  const keywords =
    Array.isArray(ai?.keywords) && ai.keywords.length
      ? ai.keywords
      : ["uçak", "havacılık", "havaalanı", "airline", "aviation"];
  const html = ai?.html || "";

  return { seoTitle, metaDesc, slug, tags, keywords, html };
}

function buildImageQuery(userInput: string, ai: { keywords: string[]; seoTitle: string }) {
  const parts: string[] = [];
  if (Array.isArray(ai?.keywords) && ai.keywords.length) parts.push(ai.keywords.slice(0, 6).join(" "));
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

  const r = await fetch(url.toString(), { headers: { Authorization: key } });
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

    // 1) İlk deneme
    let ai = await callGeminiOnce(buildPrompt(userInput));
    let filled = ensureFilled(ai, userInput);

    // 2) Metin çok kısa veya boşsa bir kez daha dene (uzun metin iste)
    if (!filled.html || filled.html.replace(/<[^>]+>/g, "").trim().length < 500) {
      ai = await callGeminiOnce(buildRetryPrompt(userInput));
      filled = ensureFilled(ai, userInput);
    }

    // Eğer hâlâ boşsa, minimum bir iskelet koy
    if (!filled.html) {
      filled.html = `<h2>${filled.seoTitle}</h2><p>${filled.metaDesc}</p>`;
    }

    const imageQuery = buildImageQuery(userInput, { keywords: filled.keywords, seoTitle: filled.seoTitle });
    const imgs = await searchPexels(imageQuery);

    return NextResponse.json(
      {
        ok: true,
        result: {
          ...filled,
          images: imgs.images,
          imageQuery
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
