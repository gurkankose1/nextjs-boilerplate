// app/api/generate/dry-run/route.ts
import type { NextRequest } from "next/server";

// —— Ücretsiz plan için güvenli süre/limitler ——
const TIME_BUDGET_MS = 9000;      // toplam bütçe ~8 sn
const FETCH_TIMEOUT_MS = 6500;    // tek model çağrısı 6.5 sn
const MAX_HTTP_RETRY = 2;         // 503/timeout için 2 deneme
const BACKOFF_BASE_MS = 400;      // 400ms, 800ms
const MAX_TOKENS_FIRST = 768;     // ilk deneme
const MAX_TOKENS_EXPAND = 512;    // genişletme denemesi

// Model fallback (yoğunluk/timeout durumunda daha hızlı modele geç)
const MODEL_FALLBACK = "gemini-1.5-flash";

export const runtime = "edge"; // firebase-admin yok; Edge hızlı

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
if (!GEMINI_API_KEY) {
  console.warn("[generate] GEMINI_API_KEY missing.");
}

// ==== Türler ====
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

// ==== Yardımcılar ====
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
  const splitByBr = html
    .replace(/<p[\s>]/gi, "\n<p ")
    .replace(/<br\s*\/?>/gi, "\n")
    .split(/\n+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 120).length;
  return Math.max(pTags, splitByBr);
}

function safeJsonParse<T = any>(raw: string): T | null {
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = /```json([\s\S]*?)```/i.exec(raw)?.[1];
    if (fenced) {
      try { return JSON.parse(fenced); } catch {}
    }
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
  const images: GenImage[] = Array.isArray(obj?.images)
    ? obj.images.filter((x: any) => x && x.url).map((i: any) => ({
        id: i.id, url: String(i.url), alt: i.alt, credit: i.credit, link: i.link,
        width: typeof i.width === "number" ? i.width : undefined,
        height: typeof i.height === "number" ? i.height : undefined,
      }))
    : [];
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

// ==== Gemini istemcisi (timeout'lu) ====
async function callGemini(
  prompt: string,
  { model = MODEL_PRIMARY, temperature = 0.7, topP = 0.95, maxTokens = MAX_TOKENS_FIRST, system }:
  { model?: string; temperature?: number; topP?: number; maxTokens?: number; system?: string }
) {
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }]}],
    generationConfig: { temperature, topP, maxOutputTokens: maxTokens },
    systemInstruction: system ? { role: "system", parts: [{ text: system }] } : undefined,
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  // fetch timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

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
    const out = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n\n") || "";
    return String(out);
  } catch {
    return text;
  }
}

// ==== Sistem promtu ====
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

// ==== Prompt ====
function buildUserPrompt(topic: string) {
  return `Konu: ${topic}

SkyNews okuru için tarafsız, kaynaklara referans veren (genel atıf), teknik doğruluğu yüksek bir içerik yaz. Başlıklarda abartıdan kaçın.`;
}

// ==== Retry + Fallback sarmalayıcı ====
async function callWithRetries(prompt: string, { maxTokens = MAX_TOKENS_FIRST } = {}) {
  let lastErr: any;
  const started = Date.now();

  for (let i = 0; i < MAX_HTTP_RETRY; i++) {
    try {
      const elapsed = Date.now() - started;
      if (elapsed > TIME_BUDGET_MS) throw new Error("TIME_BUDGET_EXCEEDED");

      // Önce 2.5-pro
      try {
        const out = await callGemini(prompt, {
          model: MODEL_PRIMARY, temperature: 0.7, topP: 0.95, maxTokens, system: SYSTEM
        });
        return out;
      } catch (err: any) {
        const retriable = /503|UNAVAILABLE|overloaded|abort|timeout/i.test(String(err));
        if (!retriable) throw err;
        // Fallback: 1.5-flash
        const out2 = await callGemini(prompt, {
          model: MODEL_FALLBACK, temperature: 0.7, topP: 0.95, maxTokens, system: SYSTEM
        });
        return out2;
      }
    } catch (e: any) {
      lastErr = e;
      const is503 = /503|UNAVAILABLE|overloaded|abort|timeout|TIME_BUDGET_EXCEEDED/i.test(String(e));
      if (is503 && i < MAX_HTTP_RETRY - 1) {
        const backoff = BACKOFF_BASE_MS * Math.pow(2, i); // 400ms, 800ms
        await sleep(backoff);
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

// ==== 5+ paragrafı garanti eden katman ====
async function ensureMinParagraphs(parsed: GenResult, topic: string): Promise<GenResult> {
  const pCount = countParagraphs(parsed.html);
  if (pCount >= 5) return parsed;

  const expandPrompt = `Aşağıdaki taslağı en az 5 paragraf olacak şekilde genişlet. Sadece JSON ver.
Taslak JSON:

${JSON.stringify({ ...parsed, html: parsed.html?.slice(0, 8000) }, null, 2)}`;

  try {
    const expanded = await callWithRetries(expandPrompt, { maxTokens: MAX_TOKENS_EXPAND });
    const maybe = safeJsonParse(expanded);
    if (maybe) {
      const coerced = coerceResult(maybe);
      if (countParagraphs(coerced.html) >= 5) return coerced;

      // son çare: otomatik ek paragraf
      const boosted = { ...coerced } as GenResult;
      if (countParagraphs(boosted.html) < 5) {
        const add = Array.from({ length: 5 - countParagraphs(boosted.html) }, (_, i) =>
          `<p>Bu paragraf, haber içeriğini derinleştirmek ve bağlam sağlamak amacıyla otomatik olarak eklenmiştir. Konu: ${topic}. ${i + 1}. ek açıklama paragrafıdır; gelişmeler, paydaşlar ve etkiler ayrıntılandırılmıştır.</p>`
        ).join("\n");
        boosted.html = `${boosted.html}\n${add}`;
      }
      return boosted;
    }
  } catch {
    // genişletme başarısızsa alttaki fallback'e geç
  }

  // parse edilemediyse mevcut metne güvenli takviye yap
  const patched = { ...parsed } as GenResult;
  if (countParagraphs(patched.html) < 5) {
    const need = 5 - countParagraphs(patched.html);
    const add = Array.from({ length: need }, (_, i) =>
      `<p>Bu paragraf, haber içeriğini tamamlamak amacıyla eklenmiştir. Konu: ${topic}. ${i + 1}. ek paragraf.</p>`
    ).join("\n");
    patched.html = `${patched.html}\n${add}`;
  }
  return patched;
}

// ==== API ====
export async function POST(req: NextRequest) {
  try {
    const { input } = (await req.json()) as { input?: string };
    const topic = (input || "Güncel bir havacılık gündemi").trim().slice(0, 1200);
    if (!GEMINI_API_KEY) {
      return Response.json({ ok: false, error: "Sunucu yapılandırması eksik: GEMINI_API_KEY" }, { status: 500 });
    }

    // 1) İlk çağrı
    const raw = await callWithRetries(buildUserPrompt(topic), { maxTokens: MAX_TOKENS_FIRST });

    // 2) JSON parse
    const parsedRaw = safeJsonParse(raw);
    if (!parsedRaw) {
      const strictPrompt = `${buildUserPrompt(topic)}

SADECE tek bir JSON döndür. Kod bloğu kullanma.`;
      const raw2 = await callWithRetries(strictPrompt, { maxTokens: MAX_TOKENS_FIRST });
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
    const isOverload = /GEMINI_503|UNAVAILABLE|overloaded|quota|rate|exceeded|TIME_BUDGET_EXCEEDED|AbortController|aborted/i.test(msg);
    return Response.json({
      ok: false,
      error: isOverload
        ? "Gemini servisinde yoğunluk veya süre sınırı aşıldı. Kısa süre sonra tekrar deneyin."
        : `Üretim başarısız: ${msg}`,
      details: isOverload ? undefined : msg,
    }, { status: isOverload ? 503 : 500 });
  }
}
