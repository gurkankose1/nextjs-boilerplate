// app/api/generate/dry-run/route.ts
import type { NextRequest } from "next/server";

// ——— Model ve zaman ayarları ———
const FETCH_TIMEOUT_MS = 9000;
const MAX_TOKENS = 2048;
const MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-2.0-flash"];

export const runtime = "edge";

// Retry/backoff ayarları
const MAX_HTTP_RETRY = 3;       // toplam 3 deneme
const BACKOFF_BASE_MS = 400;    // 400ms → 800ms → 1600ms (jitter ile)


// ——— Env ———
const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY as string | undefined;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY as string | undefined; // opsiyonel

// ==== Türler ====
export type GenImage = {
  id?: string;
  url: string;
  alt?: string;
  credit?: string;
  link?: string;
  width?: number;
  height?: number;
  license?: string;   // ⇐ eklendi (CC BY-SA, Unsplash License, vb.)
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
function sleep(ms: number) {
  return new Promise(res => setTimeout(res, ms));
}
function isTransientErr(msg: string) {
  return /\b(503|UNAVAILABLE|timeout|aborted|overloaded|rate|quota|exceeded)\b/i.test(msg);
}

function isValidHttpUrl(u?: string) {
  if (!u) return false;
  try {
    const x = new URL(u);
    return (x.protocol === "http:" || x.protocol === "https:") && !/example\.com/i.test(x.hostname);
  } catch { return false; }
}
function sanitizeImages(arr: any[]): GenImage[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((i: any) => ({
    id: i?.id ? String(i.id) : undefined,
    url: i?.url ? String(i.url) : "",
    alt: i?.alt ? String(i.alt) : undefined,
    credit: i?.credit ? String(i.credit) : undefined,
    link: i?.link ? String(i.link) : undefined,
    width: typeof i?.width === "number" ? i.width : undefined,
    height: typeof i?.height === "number" ? i.height : undefined,
    license: i?.license ? String(i.license) : undefined,
  }))
  .filter(i => isValidHttpUrl(i.url))
  .slice(0, 8);
}
function stripTags(html: string): string {
  return String(html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function splitSentences(text: string): string[] {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  const m = cleaned.match(/[^.!?]+[.!?]+/g);
  if (m && m.length) return m.map(s => s.trim());
  return cleaned ? [cleaned] : [];
}
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
  const images: GenImage[] = sanitizeImages(obj?.images || []);
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

// —— Sistem yönergesi ——
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

// — Tek çağrıyı retry/backoff ile sarmalayan üst seviye yardımcı —
async function callGeminiWithRetry(prompt: string) {
  let lastErr: any;
  for (let i = 0; i < MAX_HTTP_RETRY; i++) {
    try {
      // model fallback’lı tek çağrı
      return await callGeminiOnceWithFallback(prompt);
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || e);
      // sadece geçici hatalarda bekleyip tekrar dene
      if (isTransientErr(msg) && i < MAX_HTTP_RETRY - 1) {
        const jitter = Math.floor(Math.random() * 250);
        const wait = BACKOFF_BASE_MS * Math.pow(2, i) + jitter; // 400, ~800, ~1600ms
        await sleep(wait);
        continue;
      }
      throw e;
    }
  }
  throw lastErr || new Error("Unknown error");
}


// —— Entity tespiti (marka/tesis/konum) ——
type EntityHints = { entity?: string; aliases: string[]; commonsQueries: string[]; stockQueries: string[]; };
function detectEntityHints(topic: string): EntityHints {
  const t = topic.toLowerCase();
  // TEC / THY / Pratt & Whitney / SAW gibi yaygın örnekler
  if (/turkish engine center|tec\b/.test(t)) {
    return {
      entity: "Turkish Engine Center",
      aliases: ["Turkish Engine Center", "TEC Istanbul", "TEC Sabiha Gökçen"],
      commonsQueries: ["Turkish Engine Center", "aircraft engine maintenance Istanbul", "hangar Sabiha Gökçen"],
      stockQueries: ["aircraft engine maintenance", "jet engine hangar", "MRO facility", "airport hangar interior"]
    };
  }
  if (/(türk hava yolları|thy)\b/.test(t)) {
    return {
      entity: "Turkish Airlines",
      aliases: ["Turkish Airlines", "THY"],
      commonsQueries: ["Turkish Airlines", "Turkish Airlines hangar", "THY Technic"],
      stockQueries: ["aircraft at gate Istanbul", "airport narrowbody ramp", "airline operations"]
    };
  }
  if (/pratt\s*&?\s*whitney|pratt and whitney/.test(t)) {
    return {
      entity: "Pratt & Whitney",
      aliases: ["Pratt & Whitney", "P&W"],
      commonsQueries: ["Pratt & Whitney engine", "PW1100G", "jet engine maintenance"],
      stockQueries: ["jet engine close-up", "engine MRO hangar", "engine shop"]
    };
  }
  if (/sabiha gökçen|saw\b/.test(t)) {
    return {
      entity: "Sabiha Gökçen International Airport",
      aliases: ["Istanbul Sabiha Gökçen Airport", "SAW"],
      commonsQueries: ["Sabiha Gökçen Airport terminal", "SAW apron", "SAW tower"],
      stockQueries: ["airport terminal interior", "airport apron night", "aircraft taxiing"]
    };
  }
  // varsayılan
  return {
    aliases: [],
    commonsQueries: [],
    stockQueries: ["aviation", "airport operations", "aircraft engine maintenance", "MRO hangar"]
  };
}

// —— Wikimedia Commons (lisanslı) — TS-safe sürüm ——
async function searchCommons(queries: string[], limit = 6): Promise<GenImage[]> {
  const results: GenImage[] = [];

  for (const q of queries) {
    const url =
      `https://commons.wikimedia.org/w/api.php` +
      `?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}` +
      `&gsrlimit=${limit}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;

    const res = await fetch(url, { headers: { "User-Agent": "SkyNewsAI/1.0 (edge)" } });
    if (!res.ok) continue;

    // Yanıtı açıkça 'any' olarak daralt
    const data: any = await res.json();
    const pagesObj = (data?.query?.pages ?? {}) as Record<string, any>;
    const pages = Object.values(pagesObj) as any[];

    for (const p of pages) {
      // imageinfo korumalı erişim
      const infoArr = Array.isArray(p?.imageinfo) ? (p.imageinfo as any[]) : [];
      const info = infoArr[0] as any | undefined;

      const imgUrl = info?.url as string | undefined;
      if (!imgUrl || !(imgUrl.startsWith("http://") || imgUrl.startsWith("https://"))) continue;

      const meta = (info?.extmetadata ?? {}) as Record<string, any>;
      const license =
        (meta?.LicenseShortName?.value as string | undefined) ||
        (meta?.License as string | undefined) ||
        "Commons";

      // Artist alanı bazen HTML içerir — stripTags ile sadele
      const artistRaw = meta?.Artist?.value as string | undefined;

      results.push({
        id: String(p?.pageid ?? ""),
        url: imgUrl,
        alt: stripTags(String(p?.title ?? q)),
        credit: artistRaw ? stripTags(artistRaw) : "Wikimedia Commons",
        link: `https://commons.wikimedia.org/?curid=${p?.pageid ?? ""}`,
        license,
      });

      if (results.length >= limit) break;
    }

    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
}

// —— Pexels (telifsiz stok) ——
async function searchPexels(query: string, limit = 6) {
  if (!PEXELS_API_KEY) return [];
  const url = `https://api.pexels.com/v1/search?per_page=${limit}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
  if (!res.ok) return [];
  const json = await res.json();
  const photos = Array.isArray(json?.photos) ? json.photos : [];
  return photos.map((p: any) => {
    const src = p?.src || {};
    const best = src?.large2x || src?.large || src?.landscape || src?.medium || src?.original || src?.small || src?.portrait;
    return {
      id: String(p?.id ?? ""),
      url: String(best || ""),
      alt: String(p?.alt || query),
      credit: String(p?.photographer || "Pexels"),
      link: String(p?.url || ""),
      width: Number(p?.width || 0) || undefined,
      height: Number(p?.height || 0) || undefined,
      license: "Pexels License"
    };
  }).filter((x: any) => x.url && x.url.startsWith("http"));
}

// —— Unsplash (opsiyonel stok) ——
async function searchUnsplash(query: string, limit = 6) {
  if (!UNSPLASH_ACCESS_KEY) return [];
  const url = `https://api.unsplash.com/search/photos?per_page=${limit}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } });
  if (!res.ok) return [];
  const json = await res.json();
  const results = Array.isArray(json?.results) ? json.results : [];
  return results.map((r: any) => ({
    id: String(r?.id || ""),
    url: String(r?.urls?.regular || r?.urls?.small || r?.urls?.full || ""),
    alt: String(r?.alt_description || query),
    credit: String(r?.user?.name || "Unsplash"),
    link: String(r?.links?.html || ""),
    width: Number(r?.width || 0) || undefined,
    height: Number(r?.height || 0) || undefined,
    license: "Unsplash License"
  })).filter((x: any) => x.url && x.url.startsWith("http"));
}

// —— Sorgu üretici ——
function buildImageQuery(topic: string): string {
  const base = topic.toLowerCase();
  const extra: string[] = [];
  if (/tec|turkish engine center|pratt|whitney|thy|türk hava yolları/.test(base)) {
    extra.push("aircraft engine maintenance", "MRO", "hangar", "jet engine");
  }
  if (/grev|strike|sendika|tisl/.test(base)) {
    extra.push("aviation workers", "airport operations");
  }
  return [topic, "aviation", "airport", ...extra].join(" ");
}

// —— Görsel garanti hattı ——
async function ensureImages(ensured: GenResult, topic: string): Promise<GenResult> {
  const hints = detectEntityHints(topic);
  let imgs = sanitizeImages(ensured.images || []);

  // 1) ENTITY VARSA: Commons’ı öncele (marka/tesis ihtiyacı için en iyi kaynak)
  if (hints.entity || hints.commonsQueries.length) {
    const commons = await searchCommons(
      hints.commonsQueries.length ? hints.commonsQueries : [hints.entity!],
      Math.max(6 - imgs.length, 0) || 6
    );
    imgs = [...commons, ...imgs];
  }

  // 2) Hâlâ azsa: daha “teknik/konu odaklı” stok sorguları (Unsplash → Pexels)
  if (imgs.length < 3 && hints.stockQueries.length) {
    if (UNSPLASH_ACCESS_KEY) {
      const u = await searchUnsplash(hints.stockQueries.join(" "), 6 - imgs.length);
      imgs = [...imgs, ...u];
    }
    if (imgs.length < 3) {
      const p = await searchPexels(hints.stockQueries.join(" "), 6 - imgs.length);
      imgs = [...imgs, ...p];
    }
  }

  // 3) Genel fallback (topic tabanlı)
  if (imgs.length < 3) {
    const q = ensured.imageQuery || buildImageQuery(topic);
    const p2 = await searchPexels(q, 6 - imgs.length);
    imgs = [...imgs, ...p2];
  }

  // Temizle + meta doldur
  imgs = sanitizeImages(imgs).map(i => ({
    ...i,
    alt: i.alt || ensured.seoTitle || ensured.slug,
    credit: i.credit || "SkyNews",
    license: i.license || "CC/Stock"
  }));

  ensured.images = imgs.slice(0, 6);
  return ensured;
}

// —— Model çağrısı ——
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

    // 1) Model
    const raw = await callGeminiWithRetry(
      `${SYSTEM}\n\nKonu: ${topic}\n\nSkyNews okuru için tarafsız, teknik doğruluğu yüksek, SEO uyumlu bir içerik yaz. AI olduğu anlaşılmasın. Kısa ve uzun cümleleri dengeli kullan.`
    );

    // 2) JSON parse
    const parsedRaw = safeJsonParse(raw);
    if (!parsedRaw) {
      const stub: GenResult = {
        seoTitle: "SkyNews — Güncel gelişme",
        metaDesc: "Güncel havacılık haberi ve ayrıntılar.",
        slug: toSlug(topic).slice(0, 120) || "haber",
        tags: ["Havacılık"],
        keywords: ["havacılık", "gündem"],
        imageQuery: buildImageQuery(topic),
        images: [],
        html: `<h2>Özet</h2><p>${topic}</p>`,
      };
      let ensuredStub = ensureMinParagraphsLocal(stub, topic);
      if (typeof maxChars === "number" && maxChars > 0) {
        ensuredStub.html = compressHtml(ensuredStub.html, maxChars);
        const meta = stripTags(ensuredStub.html).slice(0, 160);
        ensuredStub.metaDesc = meta.replace(/\s+\S*$/, "");
      }
      ensuredStub = await ensureImages(ensuredStub, topic);
      return Response.json({ ok: true, result: ensuredStub });
    }

    // 3) Tipleri zorla + min 5 paragraf
    const coerced = coerceResult(parsedRaw);
    if (!coerced.imageQuery) coerced.imageQuery = buildImageQuery(topic);
    let ensured = ensureMinParagraphsLocal(coerced, topic);

    // 4) Karakter limiti
    if (typeof maxChars === "number" && maxChars > 0) {
      ensured.html = compressHtml(ensured.html, maxChars);
      const meta = stripTags(ensured.html).slice(0, 160);
      ensured.metaDesc = meta.replace(/\s+\S*$/, "");
    }

    // 5) Görseller (Commons → Unsplash → Pexels)
    ensured = await ensureImages(ensured, topic);

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
