// app/api/generate/dry-run/route.ts
import type { NextRequest } from "next/server";

// —— v1 + 2.5/2.0 model fallback ——
const FETCH_TIMEOUT_MS = 9000;
const MAX_TOKENS = 2048; // daha uzun içerik için
const MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-2.0-flash"];

export const runtime = "edge";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;

// ==== Türler ====
export type GenImage = {
  id?: string; url: string; alt?: string; credit?: string; link?: string;
  width?: number; height?: number;
};
export type GenResult = {
  seoTitle: string; metaDesc: string; slug: string; tags: string[];
  keywords: string[]; imageQuery?: string; images: GenImage[]; html: string;
};

// ==== Yardımcılar ====
function toSlug(s: string) {
  return s.toLowerCase()
    .replace(/ç/g,"c").replace(/ğ/g,"g").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ü/g,"u")
    .replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-").replace(/-+/g,"-");
}
function countParagraphs(html: string) {
  if (!html) return 0;
  const pTags = (html.match(/<p[\s>][\s\S]*?<\/p>/gi) || []).length;
  const splitByBr = html.replace(/<p[\s>]/gi,"\n<p ").replace(/<br\s*\/?>/gi,"\n")
    .split(/\n+/).map(x=>x.trim()).filter(x=>x.length>120).length;
  return Math.max(pTags, splitByBr);
}
function safeJsonParse<T=any>(raw: string): T|null {
  try { return JSON.parse(raw); } catch {
    const fenced = /```json([\s\S]*?)```/i.exec(raw)?.[1];
    if (fenced) { try { return JSON.parse(fenced); } catch {} }
    const first = raw.indexOf("{"), last = raw.lastIndexOf("}");
    if (first>=0 && last>first) { const cut = raw.slice(first,last+1); try { return JSON.parse(cut); } catch {} }
    return null;
  }
}
function coerceResult(obj: any): GenResult {
  const fallbackTitle = typeof obj?.seoTitle==="string" && obj.seoTitle.length>3 ? obj.seoTitle : "SkyNews AI Haberi";
  const slug = toSlug(obj?.slug || fallbackTitle || "haber").slice(0,140) || "haber";
  const images: GenImage[] = Array.isArray(obj?.images)
    ? obj.images.filter((x:any)=>x && x.url).map((i:any)=>({
        id:i.id, url:String(i.url), alt:i.alt, credit:i.credit, link:i.link,
        width: typeof i.width==="number"?i.width:undefined,
        height: typeof i.height==="number"?i.height:undefined,
      }))
    : [];
  const tags = Array.isArray(obj?.tags)?obj.tags.map(String).slice(0,8):[];
  const keywords = Array.isArray(obj?.keywords)?obj.keywords.map(String).slice(0,16):[];
  return {
    seoTitle: fallbackTitle,
    metaDesc: typeof obj?.metaDesc==="string" ? obj.metaDesc.slice(0,160) : "Güncel havacılık haberi ve detaylar.",
    slug, tags, keywords,
    imageQuery: typeof obj?.imageQuery==="string" ? obj.imageQuery : undefined,
    images,
    html: typeof obj?.html==="string" ? obj.html : "",
  };
}

// —— Düz metin & cümle bölme (lookbehind yok; ES2018 altı güvenli) ——
function stripTags(html: string): string {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function splitSentences(text: string): string[] {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  const m = cleaned.match(/[^.!?]+[.!?]+/g);
  if (m && m.length) return m.map(s => s.trim());
  return cleaned ? [cleaned] : [];
}

// —— Cümle bazlı karakter limiti (başlıkları koru, tag bütünlüğü) ——
function compressHtml(html: string, maxChars: number): string {
  if (!html || !maxChars || maxChars < 200) return html;
  const blocks = html.match(/<(h2|p)[^>]*>[\s\S]*?<\/\1>/gi) || [html];
  let total = 0;
  const out: string[] = [];

  for (const block of blocks) {
    const isH2 = /^<h2/i.test(block);
    const plain = stripTags(block);

    if (isH2) {
      if (total + plain.length + 1 <= maxChars) {
        out.push(block);
        total += plain.length + 1;
      }
      continue;
    }

    const sentences = splitSentences(plain);
    let acc = "";
    for (const s of sentences) {
      const add = acc ? acc + " " + s : s;
      if (total + add.length + 1 > maxChars) break;
      acc = add;
    }
    if (acc) {
      out.push(`<p>${acc}</p>`);
      total += acc.length + 1;
    }
    if (total >= maxChars) break;
  }

  if (out.length === 0) {
    const plain = stripTags(html).slice(0, Math.max(180, maxChars - 20)).trim();
    return `<p>${plain}…</p>`;
  }
  return out.join("\n");
}

// —— Eksik paragrafı farklı temalarla anlamlı tamamla ——
function ensureMinParagraphsLocal(parsed: GenResult, topic: string): GenResult {
  let html = parsed.html || "";

  const parts = html
    .replace(/<h2[^>]*>[\s\S]*?<\/h2>/gi, "\n")
    .split(/<\/p>/gi)
    .map(s => s.replace(/<p[^>]*>/gi, "").trim())
    .filter(s => s.length > 0);

  const themes = [
    (t:string)=>`<p><strong>Sürecin Seyri:</strong> ${t} kapsamında tarafların hangi tarihlerde bir araya geldiği, hangi başlıklarda yakınlaştığı ve nerede tıkandığı özetlenir. Görüşmelerin yöntemine ve arabuluculuk adımlarına değinilir; kronoloji net verilir, tekrar yapılmaz.</p>`,
    (t:string)=>`<p><strong>Talepler ve Rakamlar:</strong> Çalışanların ücret, yan haklar ve çalışma koşullarına ilişkin somut beklentileri ile işverenin son teklif aralığı tarafsız biçimde verilir. Yüzdeler tek kez yazılır; enflasyon ve alım gücü etkisi kısaca açıklanır.</p>`,
    (t:string)=>`<p><strong>İşverenin Pozisyonu:</strong> İşveren cephesinin maliyet yapısı, operasyonel süreklilik kaygıları ve küresel tedarik/ithal girdi etkileri özetlenir. Üretimin durması riskine karşı alternatif senaryolara değinilir.</p>`,
    (t:string)=>`<p><strong>Olası Etkiler:</strong> Olası grev kararının bakım çevrim sürelerine, filo kullanılabilirliğine ve sefer planlamasına etkileri analitik bir dille ele alınır. Emniyet süreçlerine ilişkin mevzuat hatırlatması yapılır.</p>`,
    (t:string)=>`<p><strong>Sektörel Bağlam:</strong> MRO pazarındaki eğilimler, bölgesel kapasite ve nitelikli işgücü dinamikleri kısaca verilir. Benzer örnek uyuşmazlıklar ve sonuçları karşılaştırmalı olarak anılır.</p>`
  ];

  const need = Math.max(0, 5 - parts.length);
  if (need > 0) {
    const toAdd = themes.slice(0, need).map(fn => fn(topic)).join("\n");
    if (/<h2/i.test(html)) html = html.replace(/<\/h2>/i, "</h2>\n" + toAdd);
    else html += "\n" + toAdd;
  }

  html = html.replace(/(\.)(\s+)(\1)/g, "$1 ");
  return { ...parsed, html };
}

// —— Sistem yönergesi (prompt başında) ——
const SYSTEM = `Sen SkyNews AI için deneyimli bir haber editörüsün. Çıktıyı mutlaka aşağıdaki JSON yapısında döndür.
Kurallar:
- Türkçe yaz; “AI” üslubundan kaçın.
- html gövdesi EN AZ 5 paragraf olsun ve HER paragraf farklı bir alt konuya odaklansın (tekrar yok): 
  1) Sürecin seyri/tarihçe, 2) Talepler ve rakamlar, 3) İşverenin pozisyonu, 4) Olası etkiler/operasyonel yansımalar, 5) Sektörel bağlam/arka plan.
- <p> etiketleri kullan; 1–2 adet <h2> alt başlık ekle (tekrarsız).
- Abartısız, sayıları bir kez ver; cümle tekrarı yapma.
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

function buildUserPrompt(topic: string) {
  return `${SYSTEM}

Konu: ${topic}

SkyNews okuru için tarafsız, teknik doğruluğu yüksek, SEO uyumlu bir içerik yaz. AI olduğu anlaşılmasın. Kısa ve uzun cümleleri dengeli kullan.`;
}

// —— Tek çağrı (v1), 404 olursa sıradaki modele geç ——
async function callGeminiOnceWithFallback(prompt: string) {
  let lastErr: any;
  for (const model of MODEL_CANDIDATES) {
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }]}],
      generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: MAX_TOKENS }
    };
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
    } catch (e) {
      clearTimeout(timer); lastErr = e; continue;
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    if (res.status === 404) { lastErr = new Error(`HTTP 404 for model ${model}: ${text}`); continue; }
    if (!res.ok) { throw new Error(`HTTP ${res.status} ${res.statusText} :: ${text}`); }

    try {
      const json = JSON.parse(text);
      const out = json?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text).filter(Boolean).join("\n\n") || "";
      return String(out);
    } catch { return text; }
  }
  throw lastErr || new Error("No usable model found");
}

// ==== API ====
export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return Response.json({ ok: false, error: "Sunucu yapılandırması eksik: GEMINI_API_KEY" }, { status: 500 });
    }

    const { input, maxChars } = (await req.json()) as { input?: string; maxChars?: number };
    const topic = (input || "Güncel bir havacılık gündemi").trim().slice(0, 800);

    // 1) Model çağrısı
    const raw = await callGeminiOnceWithFallback(buildUserPrompt(topic));

    // 2) JSON parse
    const parsedRaw = safeJsonParse(raw);
    if (!parsedRaw) {
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
      let ensuredStub = ensureMinParagraphsLocal(stub, topic);
      if (typeof maxChars === "number" && maxChars > 0) {
        ensuredStub.html = compressHtml(ensuredStub.html, maxChars);
        const meta = stripTags(ensuredStub.html).slice(0, 160);
        ensuredStub.metaDesc = meta.replace(/\s+\S*$/, "");
      }
      return Response.json({ ok: true, result: ensuredStub });
    }

    // 3) Tipleri zorla + 5+ paragraf garanti
    const coerced = coerceResult(parsedRaw);
    let ensured = ensureMinParagraphsLocal(coerced, topic);

    // 4) Kullanıcı karakter limiti istediyse, akışı bozmadan kısalt
    if (typeof maxChars === "number" && maxChars > 0) {
      ensured.html = compressHtml(ensured.html, maxChars);
      const meta = stripTags(ensured.html).slice(0, 160);
      ensured.metaDesc = meta.replace(/\s+\S*$/, "");
    }

    return Response.json({ ok: true, result: ensured });

  } catch (e: any) {
    const msg = String(e?.message || e);
    const isTransient = /\b(503|UNAVAILABLE|overloaded|timeout|aborted)\b/i.test(msg);
    return Response.json({
      ok: false,
      error: isTransient ? "Gemini servisinde geçici bir sorun var. Tekrar deneyin." : `Üretim başarısız: ${msg}`,
      details: msg,
    }, { status: isTransient ? 503 : 500 });
  }
}
