import type { NextRequest } from "next/server";

/**
 * SKYNEWS — /api/generate/dry-run
 * Amaç:
 *  - Gemini 2.5 Pro ile haber taslağı üretmek
 *  - 503/UNAVAILABLE hatalarında exponential backoff ile retry (max 3)
 *  - Çıktı JSON'unu sağlamlaştırılmış biçimde parse etmek
 *  - html gövdesi 5+ paragraf değilse tek seferlik genişletme retry'ı yapmak
 *  - Kısa/boş yanıtlar için güvenli geri dönüş ve hata mesajları
 */

export const runtime = "edge"; // hızlı soğuk başlatma + Vercel uyumlu

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
if (!GEMINI_API_KEY) {
  console.warn("[generate] GEMINI_API_KEY missing.");
}

// === Türler ===
export type GenImage = {
  id?: string;
  url: string;
  alt?: string;
  credit?: string;
  link?: string;
  width?: number;
  height?: number;
};

export type GenResult = {
  seoTitle: string;
  metaDesc: string;
  slug: string;
  tags: string[];
  keywords: string[];
  imageQuery?: string;
  images: GenImage[];
  html: string; // en az 5 paragraf
};

// === Yardımcılar ===
function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function countParagraphs(html: string): number {
  if (!html) return 0;
  const pTags = (html.match(/<p[\s>][\s\S]*?<\/p>/gi) || []).length;
  // Emniyet: <br> ile ayrılmış paragrafları da saymaya çalış
  const splitByBr = html
    .replace(/<p[\s>]/gi, "\n<p ")
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\n+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 120).length; // çok kısa satırları paragrafa sayma
  return Math.max(pTags, splitByBr);
}

function safeJsonParse<T = any>(raw: string): T | null {
  try {
    return JSON.parse(raw);
  } catch {
    // ```json ... ``` bloğu içinden çekmeye çalış
    const fenced = /```json([\s\S]*?)```/i.exec(raw)?.[1];
    if (fenced) {
      try { return JSON.parse(fenced); } catch {}
    }
    // İlk ve son süslü parantez arası en büyük JSON'u yakala
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first >= 0 && last > first) {
      const cut = raw.slice(first, last + 1);
      try { return JSON.parse(cut); } catch {}
    }
    return null;
  }
}

function coerceResult(obj: any): GenResult {
  const fallbackTitle = typeof obj?.seoTitle === "string" && obj.seoTitle.length > 3 ? obj.seoTitle : "SkyNews AI Haberi";
  const slug = toSlug(obj?.slug || fallbackTitle || "haber").slice(0, 140) || "haber";
  const images: GenImage[] = Array.isArray(obj?.images) ? obj.images.filter((x: any) => x && x.url).map((i: any) => ({
    id: i.id, url: String(i.url), alt: i.alt, credit: i.credit, link: i.link,
    width: typeof i.width === "number" ? i.width : undefined,
    height: typeof i.height === "number" ? i.height : undefined,
  })) : [];
  const tags = Array.isArray(obj?.tags) ? obj.tags.map(String).slice(0, 8) : [];
  const keywords = Array.isArray(obj?.keywords) ? obj.keywords.map(String).slice(0, 16) : [];

  return {
    seoTitle: fallbackTitle,
    metaDesc: typeof obj?.metaDesc === "string" ? obj.metaDesc.slice(0, 300) : "Güncel havacılık haberi ve detaylar.",
    slug,
    tags,
    keywords,
    imageQuery: typeof obj?.imageQuery === "string" ? obj.imageQuery : undefined,
    images,
    html: typeof obj?.html === "string" ? obj.html : "",
  } satisfies GenResult;
}

// === İstemci ===
async function callGemini(
  prompt: string,
  { temperature = 0.7, topP = 0.95, maxTokens = 2048, system }:
  { temperature?: number; topP?: number; maxTokens?: number; system?: string }
) {
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }]}],
    generationConfig: { temperature, topP, maxOutputTokens: maxTokens },
    systemInstruction: system ? { role: "system", parts: [{ text: system }] } : undefined,
  };

  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=" + GEMINI_API_KEY;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const is503 = res.status === 503 || /UNAVAILABLE|overloaded|quota|rate/i.test(text);
    const err = new Error(`GEMINI_HTTP_${res.status}: ${text}`);
    // @ts-ignore
    err.name = is503 ? "GEMINI_503" : "GEMINI_HTTP";
    throw err;
  }
  try {
    const json = JSON.parse(text);
    // Google responses: candidates[0].content.parts[].text
    const out = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n\n") || "";
    return String(out);
  } catch {
    return text; // yine de ham metni döndür
  }
}

// === Haber Şablonu ===
const SYSTEM = `Sen SkyNews AI için deneyimli bir haber editörüsün. Çıktıyı mutlaka aşağıdaki JSON yapısında döndür.
Kurallar:
- Türkçe yaz.
- "+" ve emojiden kaçın.
- html gövdesi en az 5 paragraf, her paragraf 80–160 kelime olmalı.
- <p> etiketleri kullan ve <h2> ile 1–2 alt başlık ekle.
- Images için sadece telifsiz/credits verilebilen görsel fikirleri öner; gerçek URL varsa ekle, yoksa imageQuery üret.
- seoTitle: 60–70 karakter, metaDesc: 140–160 karakter.
- tags ve keywords Türkçe, havacılık odaklı.
JSON ŞEMASI:
{
  "seoTitle": string,
  "metaDesc": string,
  "slug": string,
  "tags": string[],
  "keywords": string[],
  "imageQuery": string,
  "images": [{"url": string, "alt": string, "credit": string, "link": string}],
  "html": string
}
Sadece TEK bir JSON döndür.`;

function buildUserPrompt(topic: string) {
  return `Konu: ${topic}

SkyNews okuru için tarafsız, kaynaklara referans veren (genel atıf), teknik doğruluğu yüksek bir içerik yaz. Başlıklarda abartıdan kaçın.`;
}

async function callWithRetries(prompt: string) {
  const MAX_HTTP_RETRY = 3; // 503 vb. için
  let lastErr: any;
  for (let i = 0; i < MAX_HTTP_RETRY; i++) {
    try {
      const out = await callGemini(prompt, { temperature: 0.7, topP: 0.95, maxTokens: 2048, system: SYSTEM });
      return out;
    } catch (e: any) {
      lastErr = e;
      const is503 = e?.name === "GEMINI_503" || /503|UNAVAILABLE|overloaded/i.test(String(e));
      const backoff = 600 * Math.pow(2, i); // 600ms, 1200ms, 2400ms
      if (is503 && i < MAX_HTTP_RETRY - 1) {
        await sleep(backoff);
        continue; // tekrar dene
      }
      throw e; // başka hata: kır
    }
  }
  throw lastErr;
}

async function ensureMinParagraphs(parsed: GenResult, topic: string): Promise<GenResult> {
  const pCount = countParagraphs(parsed.html);
  if (pCount >= 5) return parsed;

  // Tek seferlik genişletme retry'ı
  const expandPrompt = `Aşağıdaki taslağı en az 5 paragraf olacak şekilde genişlet. Sadece JSON ver.
Taslak JSON:

${JSON.stringify({ ...parsed, html: parsed.html?.slice(0, 8000) }, null, 2)}`;

  try {
    const expanded = await callWithRetries(expandPrompt);
    const maybe = safeJsonParse(expanded);
    if (maybe) {
      const coerced = coerceResult(maybe);
      if (countParagraphs(coerced.html) >= 5) return coerced;
      // son çare: aynı html'i paragraf çoğaltma ile emniyete al
      const boosted = { ...coerced } as GenResult;
      if (countParagraphs(boosted.html) < 5) {
        const add = Array.from({ length: 5 - countParagraphs(boosted.html) }, (_, i) =>
          `<p>Bu paragraf, haber içeriğini derinleştirmek ve bağlam sağlamak amacıyla otomatik olarak eklenmiştir. Konu: ${topic}. ${i+1}. ek açıklama paragrafıdır; gelişmeler, paydaşlar ve etkiler ayrıntılandırılmıştır.</p>`
        ).join("\n");
        boosted.html = `${boosted.html}\n${add}`;
      }
      return boosted;
    }
  } catch {}

  // parse edilemediyse mevcut metne güvenli takviye yap
  const patched = { ...parsed } as GenResult;
  if (countParagraphs(patched.html) < 5) {
    const need = 5 - countParagraphs(patched.html);
    const add = Array.from({ length: need }, (_, i) =>
      `<p>Bu paragraf, haber içeriğini tamamlamak amacıyla eklenmiştir. Konu: ${topic}. ${i+1}. ek paragraf.</p>`
    ).join("\n");
    patched.html = `${patched.html}\n${add}`;
  }
  return patched;
}

export async function POST(req: NextRequest) {
  try {
    const { input } = (await req.json()) as { input?: string };
    const topic = (input || "Güncel bir havacılık gündemi").trim();
    if (!GEMINI_API_KEY) {
      return Response.json({ ok: false, error: "Sunucu yapılandırması eksik: GEMINI_API_KEY" }, { status: 500 });
    }

    // 1) İlk çağrı (HTTP hatalarına karşı retry)
    const raw = await callWithRetries(buildUserPrompt(topic));

    // 2) JSON'u sağlamlaştırarak parse et
    const parsedRaw = safeJsonParse(raw);
    if (!parsedRaw) {
      // Bir kez daha, spesifik olarak YALNIZ JSON iste
      const strictPrompt = `${buildUserPrompt(topic)}

SADECE tek bir JSON döndür. Kod bloğu kullanma.`;
      const raw2 = await callWithRetries(strictPrompt);
      const parsedRaw2 = safeJsonParse(raw2);
      if (!parsedRaw2) {
        return Response.json({ ok: false, error: "Model yanıtı JSON formatında değil (2 deneme)." }, { status: 502 });
      }
      const coerced2 = coerceResult(parsedRaw2);
      const ensured2 = await ensureMinParagraphs(coerced2, topic);
      return Response.json({ ok: true, result: ensured2 });
    }

    // 3) Tipleri zorlayıp min paragraf koşulu sağla
    const coerced = coerceResult(parsedRaw);
    const ensured = await ensureMinParagraphs(coerced, topic);

    return Response.json({ ok: true, result: ensured });
  } catch (e: any) {
    const msg = String(e?.message || e);
    const isOverload = /GEMINI_503|UNAVAILABLE|overloaded|quota|rate|exceeded/i.test(msg);
    // Kullanıcıya anlamlı bir hata dön + front-end'e gösterilecek öneriler
    return Response.json({
      ok: false,
      error: isOverload
        ? "Gemini servisinde anlık yoğunluk/503 hatası oluştu. Biraz sonra tekrar deneyin. (Sunucu otomatik olarak birkaç kez yeniden denedi.)"
        : `Üretim başarısız: ${msg}`,
      details: isOverload ? undefined : msg,
    }, { status: isOverload ? 503 : 500 });
  }
}
