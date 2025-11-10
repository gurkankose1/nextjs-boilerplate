// app/api/generate/dry-run/route.ts
import { NextResponse } from "next/server";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

type GenReq = {
  input: string;     // kullanıcıdan gelen başlık/özet/link
  language?: string; // "tr" varsayılacak
};

function buildPrompt(userInput: string) {
  return `
Aşağıdaki metne dayanarak SEO uyumlu, özgün bir haber taslağı üret.
Kurallar:
- Dil: Türkçe
- Çıktıyı JSON olarak dön: {seoTitle, metaDesc, slug, tags: string[], html, keywords: string[]}
- seoTitle: 60-70 karakter hedefle
- metaDesc: 120-155 karakter
- slug: kısa, latin harf, tireli
- html: <h2> alt başlıklar ve <p> paragraflar kullan, kaynak belirtme yok
- Kopya yapma; ana fikirleri özgünleştir.

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
    // Basit text prompt; output'ta JSON bekliyoruz
    body: JSON.stringify({
      contents: [{ parts: [{ text: content }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini hata: ${resp.status} ${t}`);
  }

  const data = await resp.json();
  // Cevap genelde data.candidates[0].content.parts[0].text içinde
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    JSON.stringify(data);

  // Kod blokları/formatları temizle
  const cleaned = text.replace(/^```(json)?/i, "").replace(/```$/i, "").trim();

  // JSON parse dene
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Parse edilemezse sarmala
    parsed = { html: cleaned };
  }

  return parsed;
}

async function searchPexels(query: string) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return { images: [] };

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query || "aviation");
  url.searchParams.set("per_page", "5");
  url.searchParams.set("orientation", "landscape");

  const r = await fetch(url.toString(), {
    headers: { Authorization: key },
    // fetch cache default ok
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

    // Görsel aramasını seoTitle + keywords üzerinden yap
    const q =
      ai?.seoTitle ||
      (Array.isArray(ai?.keywords) ? ai.keywords.join(" ") : userInput) ||
      "aviation";
    const imgs = await searchPexels(q);

    return NextResponse.json(
      {
        ok: true,
        result: {
          seoTitle: ai?.seoTitle ?? "",
          metaDesc: ai?.metaDesc ?? "",
          slug: ai?.slug ?? "",
          tags: ai?.tags ?? [],
          html: ai?.html ?? "",
          keywords: ai?.keywords ?? [],
          images: imgs.images,
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
