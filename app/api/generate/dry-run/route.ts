// app/api/generate/dry-run/route.ts
import { NextResponse } from "next/server";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

type GenReq = {
  input: string;     // kullanıcıdan gelen başlık/özet/link
  language?: string; // varsayılan "tr"
};

function buildPrompt(userInput: string) {
  // Modeli net yönlendirelim: sadece JSON dönsün
  return `
Sen deneyimli bir haber editörüsün. Aşağıdaki girdiye dayanarak SEO uyumlu, özgün bir HABER TASLAĞI üret.

Kurallar (önemli):
- Dil: Türkçe
- ÇIKTIYI YALNIZCA GEÇERLİ BİR JSON OLARAK DÖN (başka yazı, açıklama veya kod bloğu koyma).
- Şema:
{
  "seoTitle": string,          // 60-70 karakter
  "metaDesc": string,          // 120-155 karakter
  "slug": string,              // kısa, latin harf, tireli
  "tags": string[],            // 3-7 etiket
  "keywords": string[],        // 5-12 anahtar kelime
  "html": string               // <h2> ve <p> ile bölümlenmiş, kaynak belirtme yok
}

İpuçları:
- ana fikirleri özgünleştir, kopyalama yapma
- havacılık/airline/airport bağlamını koru (varsa)
- html içinde gereksiz boşluk/kod bloğu olmasın

Girdi:
${userInput}
`;
}

function buildImageQuery(userInput: string, ai: any) {
  // Daha alakalı results için: AI keywords + seoTitle + kullanıcı girdisi + havacılık odağı
  const parts: string[] = [];
  if (Array.isArray(ai?.keywords) && ai.keywords.length) parts.push(ai.keywords.slice(0, 6).join(" "));
  if (ai?.seoTitle) parts.push(ai.seoTitle);
  if (userInput) parts.push(userInput);

  // Havacılık bağlamını kuvvetlendir (senin sitenin temasına uygun)
  parts.push("aviation airline airport aircraft airplane airliner uçak havacılık havaalanı");

  const q = parts.join(" ").trim();
  // Pexels daha kısa/temiz sorguları sever; 120-150 karakter civarı idealdir.
  return q.length > 160 ? q.slice(0, 160) : q;
}

async function callGemini(content: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY yok");

  const resp = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body = JSON.stringify({
  contents: [{ parts: [{ text: content }] }],
  generationConfig: {
    temperature: 0.6,
    maxOutputTokens: 1200,
    responseMimeType: "application/json", // <— DÜZELTİLMİŞ
  },
});
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini hata: ${resp.status} ${t}`);
  }

  const data = await resp.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ??
    "";

  const cleaned = String(text).trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Bazı modeller yine de '```json' ile sarabiliyor; onları da sökelim
    const unwrapped = cleaned
      .replace(/^```(json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    parsed = JSON.parse(unwrapped);
  }

  return parsed;
}

async function searchPexels(query: string) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return { images: [] };

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query || "aviation");
  url.searchParams.set("per_page", "6");
  url.searchParams.set("orientation", "landscape");
  // Not: Pexels'te “safe” param yok, ama sorguyu temayla (aviation) sınırlıyoruz.

  const r = await fetch(url.toString(), {
    headers: { Authorization: key },
  });

  if (!r.ok) {
    return { images: [] };
  }
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

    // Boş alanlar olursa makul fallback'ler:
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

    // Görsel araması (daha alakalı)
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
          imageQuery, // debug amaçlı, UI'da gösterebilirsin
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
