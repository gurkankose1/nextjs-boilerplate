// app/api/generate/dry-run/route.ts
import type { NextRequest } from "next/server";

// —— Ücretsiz planda stabil “hızlı mod” — tek çağrı ——
const FETCH_TIMEOUT_MS = 6500;          // tek model çağrısı azami 6.5 sn
const MAX_TOKENS = 640;                 // kısa döndür, hız kazan
const MODEL = "gemini-1.5-flash";       // hızlı ve ücretsizde daha stabil

export const runtime = "edge";          // firebase-admin yok; Edge hızlı

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

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
    if (fenced) { try { return JSON.parse(fenced); } catch {} }
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
    metaDesc: typeof obj?.metaDesc === "string" ? obj.metaDesc.slice(140, 160) : (obj?.metaDesc || "Güncel havacılık haberi ve detaylar.").slice(0, 160),
    slug,
    tags,
    keywords,
    imageQuery: typeof obj?.imageQuery === "string" ? obj.imageQuery : undefined,
    images,
    html: typeof obj?.html === "string" ? obj.html : "",
  } satisfies GenResult;
}

// ==== Sistem promtu ====
const SYSTEM = `Sen SkyNews AI için deneyimli bir haber editörüsün. Çıktıyı mutlaka aşağıdaki JSON yapısında döndür.
Kurallar:
- Türkçe yaz; “AI” üslubundan kaçın.
- html gövdesi en az 5 paragraf hedefle, <p> kullan; 1-2 adet <h2> alt başlık ekle.
- Abartısız, kaynaklara genel atıf yap (ör. “resmî açıklamaya göre…”).
- seoTitle: 60–70 karakter, metaDesc: 140–160 karakter.
- tags/keywords: Türkçe, havacılık odaklı.
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

SkyNews okuru için tarafsız, teknik doğruluğu yüksek, SEO uyumlu bir içerik yaz. AI olduğu anlaşılmasın. Kısa cümleler ve uzun cümleleri dengeli kullan.`;
}

// ==== Gemini tek çağrı (timeout'lu) ====
async function callGeminiOnce(prompt: string) {
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }]}],
    generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: MAX_TOKENS },
    systemInstruction: { role: "system", parts: [{ text: SYSTEM }] },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

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
    throw new Error(`GEMINI_HTTP_${res.status}: ${text}`);
  }

  try {
    const json = JSON.parse(text);
    const out = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n\n") || "";
    return String(out);
  } catch {
    return text;
  }
}

// ==== 5+ paragrafı yerelde garanti et ====
function ensureMinParagraphsLocal(parsed: GenResult, topic: string): GenResult {
  let html = parsed.html || "";
  const current = countParagraphs(html);
  if (current >= 5) return parsed;

  const need = 5 - current;
  const add = Array.from({ length: need }, (_, i) =>
    `<p>Bu paragraf, haber içeriğini tamamlamak ve bağlamı netleştirmek amacıyla otomatik olarak eklenmiştir. Konu: ${topic}. ${i + 1}. ek paragraf.</p>`
  ).join("\n");
  return { ...parsed, html: `${html}\n${add}` };
}

// ==== API ====
export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return Response.json({ ok: false, error: "Sunucu yapılandırması eksik: GEMINI_API_KEY" }, { status: 500 });
    }

    const { input } = (await req.json()) as { input?: string };
    const topic = (input || "Güncel bir havacılık gündemi").trim().slice(0, 800);

    // 1) Tek model çağrısı
    const raw = await callGeminiOnce(buildUserPrompt(topic));

    // 2) JSON parse sağlamlaştırma
    const parsedRaw = safeJsonParse(raw);
    if (!parsedRaw) {
      // Model JSON vermezse: minimal “şablon”la boş dönme
      const stub: GenResult = {
        seoTitle: "SkyNews — Güncel gelişme",
        metaDesc: "Güncel havacılık haberi ve ayrıntılar.",
        slug: toSlug(topic).slice(0, 120) || "haber",
        tags: ["Havacılık"],
        keywords: ["havacılık", "gündem"],
        imageQuery: "airport aviation",
        images: [],
        html: `<h2>Özet</h2><p>${topic}</p>`,
      };
      const ensuredStub = ensureMinParagraphsLocal(stub, topic);
      return Response.json({ ok: true, result: ensuredStub });
    }

    // 3) Tip zorla + 5+ paragrafı yerelde tamamla
    const coerced = coerceResult(parsedRaw);
    const ensured = ensureMinParagraphsLocal(coerced, topic);

    return Response.json({ ok: true, result: ensured });
  } catch (e: any) {
    const msg = String(e?.message || e);
    // Ağ/timeout/yoğunluk durumunda kullanıcıya anlaşılır mesaj
    const isOverload = /GEMINI_HTTP_|timeout|AbortController|aborted|UNAVAILABLE|overloaded|quota|rate/i.test(msg);
    return Response.json({
      ok: false,
      error: isOverload
        ? "Gemini servisinde yoğunluk veya süre sınırı aşıldı. Tekrar deneyin."
        : `Üretim başarısız: ${msg}`,
      details: isOverload ? undefined : msg,
    }, { status: isOverload ? 503 : 500 });
  }
}
