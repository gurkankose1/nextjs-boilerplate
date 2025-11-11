// app/api/generate/dry-run/route.ts
import type { NextRequest } from "next/server";

// ——— Katı zaman bütçesi ———
const TOTAL_DEADLINE_MS = 9500;

// ——— Model ve retry ———
const FETCH_TIMEOUT_MS = 8000;
const MAX_TOKENS_DEFAULT = 1536;
const MODEL_CANDIDATES = ["gemini-2.5-flash", "gemini-2.0-flash"];
const MAX_HTTP_RETRY = 1;
const BACKOFF_BASE_MS = 300;

// ——— Görsel zaman bütçesi ———
const IMAGE_PROVIDER_BUDGET_MS = 1100;
const IMAGE_TOTAL_BUDGET_MS = 2200;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ——— Env ———
const GEMINI_API_KEY = process.env.GEMINI_API_KEY as string;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY as string | undefined;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY as string | undefined;

// ==== Türler ====
export type GenImage = {
  id?: string;
  url: string;
  alt?: string;
  credit?: string;
  link?: string;
  width?: number;
  height?: number;
  license?: string;
};
export type GenResult = {
  seoTitle: string; metaDesc: string; slug: string; tags: string[];
  keywords: string[]; imageQuery?: string; images: GenImage[]; html: string;
};

// ==== Yardımcılar ====
function now(){ return Date.now(); }
function toSlug(s: string){
  return s.toLowerCase()
    .replace(/ç/g,"c").replace(/ğ/g,"g").replace(/ı/g,"i").replace(/ö/g,"o").replace(/ş/g,"s").replace(/ü/g,"u")
    .replace(/[^a-z0-9\s-]/g,"").trim().replace(/\s+/g,"-").replace(/-+/g,"-");
}
function sleep(ms:number){ return new Promise(res=>setTimeout(res,ms)); }
function isTransientErr(msg:string){ return /\b(503|UNAVAILABLE|timeout|aborted|overloaded|rate|quota|exceeded)\b/i.test(msg); }
function withTimeout<T>(p:Promise<T>, ms:number, label="timeout"):Promise<T>{
  return Promise.race([
    p,
    new Promise<T>((_,rej)=>setTimeout(()=>rej(new Error(label)), ms))
  ]) as Promise<T>;
}
function remaining(deadline:number){ return Math.max(0, deadline - now()); }
function hardStopIfExpired(deadline:number){ if (remaining(deadline) <= 0) throw new Error("BUDGET_EXCEEDED"); }

function isValidHttpUrl(u?:string){
  if(!u) return false;
  try{ const x=new URL(u); return x.protocol==="http:"||x.protocol==="https:"; } catch{ return false; }
}
function sanitizeImages(arr:any[]):GenImage[]{
  if(!Array.isArray(arr)) return [];
  return arr.map((i:any)=>({
    id: i?.id ? String(i.id):undefined,
    url: i?.url ? String(i.url):"",
    alt: i?.alt ? String(i.alt):undefined,
    credit: i?.credit ? String(i.credit):undefined,
    link: i?.link ? String(i.link):undefined,
    width: typeof i?.width==="number"?i.width:undefined,
    height: typeof i?.height==="number"?i.height:undefined,
    license: i?.license ? String(i.license):undefined,
  })).filter(i=>isValidHttpUrl(i.url)).slice(0,8);
}

function stripTags(html:string){ return String(html||"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(); }
function splitSentences(text:string){
  const cleaned=String(text||"").replace(/\s+/g," ").trim();
  const m=cleaned.match(/[^.!?]+[.!?]+/g);
  if(m&&m.length) return m.map(s=>s.trim());
  return cleaned?[cleaned]:[];
}
function compressHtml(html:string, maxChars:number){
  if(!html||!maxChars||maxChars<200) return html;
  const blocks = html.match(/<(h2|p)[^>]*>[\s\S]*?<\/\1>/gi) || [html];
  let total=0; const out:string[]=[];
  for(const block of blocks){
    const isH2=/^<h2/i.test(block);
    const plain=stripTags(block);
    if(isH2){
      if(total+plain.length+1<=maxChars){ out.push(block); total+=plain.length+1; }
      continue;
    }
    const sentences=splitSentences(plain);
    let acc="";
    for(const s of sentences){
      const add=acc?acc+" "+s:s;
      if(total+add.length+1>maxChars) break;
      acc=add;
    }
    if(acc){ out.push(`<p>${acc}</p>`); total+=acc.length+1; }
    if(total>=maxChars) break;
  }
  if(out.length===0){
    const plain=stripTags(html).slice(0, Math.max(180, maxChars-20)).trim();
    return `<p>${plain}…</p>`;
  }
  return out.join("\n");
}
function ensureMinParagraphsLocal(parsed:GenResult, topic:string):GenResult{
  let html=parsed.html||"";
  const parts=html.replace(/<h2[^>]*>[\s\S]*?<\/h2>/gi,"\n").split(/<\/p>/gi)
    .map(s=>s.replace(/<p[^>]*>/gi,"").trim()).filter(s=>s.length>0);
  const themes=[
    (t:string)=>`<p><strong>Sürecin Seyri:</strong> ${t} kapsamında tarafların hangi tarihlerde bir araya geldiği, hangi başlıklarda yakınlaştığı ve nerede tıkandığı özetlenir.</p>`,
    (t:string)=>`<p><strong>Talepler ve Rakamlar:</strong> Ücret, yan haklar ve çalışma koşullarına ilişkin beklentiler ve son teklif aralığı tarafsız verilir.</p>`,
    (t:string)=>`<p><strong>İşverenin Pozisyonu:</strong> Maliyet yapısı, operasyonel kaygılar ve tedarik zinciri etkileri özetlenir.</p>`,
    (t:string)=>`<p><strong>Olası Etkiler:</strong> Grevin bakım çevrimi, filo kullanılabilirliği ve sefer planlamasına etkileri analitik ele alınır.</p>`,
    (t:string)=>`<p><strong>Sektörel Bağlam:</strong> MRO pazar eğilimleri ve benzer uyuşmazlık örnekleri kısaca anılır.</p>`
  ];
  const need=Math.max(0,5-parts.length);
  if(need>0){
    const toAdd=themes.slice(0,need).map(fn=>fn(topic)).join("\n");
    if(/<h2/i.test(html)) html=html.replace(/<\/h2>/i, "</h2>\n"+toAdd);
    else html+="\n"+toAdd;
  }
  html=html.replace(/(\.)(\s+)(\1)/g,"$1 ");
  return {...parsed, html};
}
function safeJsonParse<T=any>(raw:string):T|null{
  try{ return JSON.parse(raw); }catch{
    const fenced=/```json([\s\S]*?)```/i.exec(raw)?.[1];
    if(fenced){ try{ return JSON.parse(fenced);}catch{} }
    const first=raw.indexOf("{"), last=raw.lastIndexOf("}");
    if(first>=0 && last>first){ const cut=raw.slice(first,last+1); try{ return JSON.parse(cut);}catch{} }
    return null;
  }
}
function coerceResult(obj:any):GenResult{
  const fallbackTitle = typeof obj?.seoTitle==="string" && obj.seoTitle.length>3 ? obj.seoTitle : "SkyNews AI Haberi";
  const slug=toSlug(obj?.slug||fallbackTitle||"haber").slice(0,140)||"haber";
  const images:GenImage[]=sanitizeImages(obj?.images||[]);
  const tags=Array.isArray(obj?.tags)?obj.tags.map(String).slice(0,8):[];
  const keywords=Array.isArray(obj?.keywords)?obj.keywords.map(String).slice(0,16):[];
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
- html gövdesi EN AZ 5 paragraf olsun ve HER paragraf farklı bir alt konuya odaklansın (tekrar yok).
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

// —— Prompt —— 
function buildUserPrompt(topic:string){
  return `${SYSTEM}

Konu: ${topic}

SkyNews okuru için tarafsız, teknik doğruluğu yüksek, SEO uyumlu bir içerik yaz. AI olduğu anlaşılmasın. Kısa ve uzun cümleleri dengeli kullan.`;
}

// —— Model çağrısı (fallback) ——
async function callGeminiOnceWithFallback(prompt:string, maxTokens:number){
  let lastErr:any;
  for(const model of MODEL_CANDIDATES){
    const body = { contents:[{ role:"user", parts:[{ text: prompt }]}], generationConfig:{ temperature:0.7, topP:0.95, maxOutputTokens:maxTokens } };
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const controller = new AbortController();
    const timer=setTimeout(()=>controller.abort(), FETCH_TIMEOUT_MS);
    let res:Response;
    try{
      res = await fetch(url,{ method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(body), signal: controller.signal });
    } finally { clearTimeout(timer); }
    const text=await res.text();
    if(res.status===404){ lastErr=new Error(`HTTP 404 for model ${model}: ${text}`); continue; }
    if(!res.ok){ throw new Error(`HTTP ${res.status} ${res.statusText} :: ${text}`); }
    try{
      const json=JSON.parse(text);
      const out=json?.candidates?.[0]?.content?.parts?.map((p:any)=>p?.text).filter(Boolean).join("\n\n")||"";
      return String(out);
    }catch{ return text; }
  }
  throw lastErr || new Error("No usable model found");
}

// — retry/backoff —
async function callGeminiWithRetry(prompt:string, maxTokens:number){
  let lastErr:any;
  for(let i=0;i<MAX_HTTP_RETRY;i++){
    try{ return await callGeminiOnceWithFallback(prompt, maxTokens); }
    catch(e:any){
      lastErr=e; const msg=String(e?.message||e);
      if(isTransientErr(msg) && i<MAX_HTTP_RETRY-1){
        const jitter=Math.floor(Math.random()*200);
        await sleep(BACKOFF_BASE_MS*Math.pow(2,i)+jitter);
        continue;
      }
      throw e;
    }
  }
  throw lastErr||new Error("Unknown error");
}

// —— Entity ipuçları —— (kısaltılmış)
type EntityHints = { entity?: string; commonsQueries: string[]; stockQueries: string[]; };
function detectEntityHints(topic:string):EntityHints{
  const t=topic.toLowerCase();
  if(/turkish engine center|tec\b/.test(t)){
    return { entity:"Turkish Engine Center", commonsQueries:["Turkish Engine Center","hangar Sabiha Gökçen"], stockQueries:["aircraft engine maintenance","MRO hangar"] };
  }
  if(/(türk hava yolları|thy)\b/.test(t)){
    return { entity:"Turkish Airlines", commonsQueries:["Turkish Airlines hangar","THY Technic"], stockQueries:["aircraft at gate Istanbul","airline operations"] };
  }
  if(/pratt\s*&?\s*whitney|pratt and whitney/.test(t)){
    return { entity:"Pratt & Whitney", commonsQueries:["Pratt & Whitney engine","PW1100G"], stockQueries:["jet engine close-up","engine shop"] };
  }
  if(/sabiha gökçen|saw\b/.test(t)){
    return { entity:"SAW", commonsQueries:["Sabiha Gökçen Airport terminal","SAW apron"], stockQueries:["airport apron","terminal interior"] };
  }
  return { commonsQueries:[], stockQueries:["aviation","airport operations","MRO"] };
}

// —— Commons/Unsplash/Pexels arayıcıları ——
async function searchCommons(queries:string[], limit:number, deadline:number):Promise<GenImage[]>{
  const results:GenImage[]=[];
  for(const q of queries){
    if(remaining(deadline)<=0) break;
    const url=`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;
    try{
      const res=await withTimeout(fetch(url,{ headers:{ "User-Agent":"SkyNewsAI/1.0" }}), Math.min(IMAGE_PROVIDER_BUDGET_MS, remaining(deadline)), "commons-timeout");
      if(!res.ok) continue;
      const data:any=await res.json();
      const pages=Object.values(data?.query?.pages??{}) as any[];
      for(const p of pages){
        const infoArr = Array.isArray(p?.imageinfo) ? p.imageinfo as any[] : [];
        const info = infoArr[0] as any|undefined;
        const imgUrl = info?.url as string|undefined;
        if(!imgUrl || !/^https?:\/\//i.test(imgUrl)) continue;
        const meta = (info?.extmetadata ?? {}) as Record<string, any>;
        const license = (meta?.LicenseShortName?.value as string|undefined) || (meta?.License as string|undefined) || "Commons";
        const artistRaw = meta?.Artist?.value as string|undefined;
        results.push({
          id:String(p?.pageid??""), url:imgUrl, alt:stripTags(String(p?.title??q)),
          credit: artistRaw? stripTags(artistRaw): "Wikimedia Commons",
          link:`https://commons.wikimedia.org/?curid=${p?.pageid??""}`, license
        });
        if(results.length>=limit) break;
      }
      if(results.length>=limit) break;
    }catch{}
  }
  return results.slice(0,limit);
}
async function searchPexels(query:string, limit:number, deadline:number){
  if(!PEXELS_API_KEY) return [];
  try{
    const res=await withTimeout(fetch(`https://api.pexels.com/v1/search?per_page=${limit}&query=${encodeURIComponent(query)}`,{ headers:{ Authorization: PEXELS_API_KEY }}),
      Math.min(IMAGE_PROVIDER_BUDGET_MS, remaining(deadline)), "pexels-timeout");
    if(!res.ok) return [];
    const json=await res.json();
    const photos=Array.isArray(json?.photos)?json.photos:[];
    return photos.map((p:any)=>{
      const src=p?.src||{}; const best=src?.large2x||src?.large||src?.landscape||src?.medium||src?.original||src?.small||src?.portrait;
      return { id:String(p?.id??""), url:String(best||""), alt:String(p?.alt||query), credit:String(p?.photographer||"Pexels"),
        link:String(p?.url||""), width:Number(p?.width||0)||undefined, height:Number(p?.height||0)||undefined, license:"Pexels License" };
    }).filter((x:any)=>x.url && x.url.startsWith("http"));
  }catch{ return []; }
}
async function searchUnsplash(query:string, limit:number, deadline:number){
  if(!UNSPLASH_ACCESS_KEY) return [];
  try{
    const res=await withTimeout(fetch(`https://api.unsplash.com/search/photos?per_page=${limit}&query=${encodeURIComponent(query)}`,{ headers:{ Authorization:`Client-ID ${UNSPLASH_ACCESS_KEY}` }}),
      Math.min(IMAGE_PROVIDER_BUDGET_MS, remaining(deadline)), "unsplash-timeout");
    if(!res.ok) return [];
    const json=await res.json();
    const results=Array.isArray(json?.results)?json.results:[];
    return results.map((r:any)=>({
      id:String(r?.id||""), url:String(r?.urls?.regular||r?.urls?.small||r?.urls?.full||""), alt:String(r?.alt_description||query),
      credit:String(r?.user?.name||"Unsplash"), link:String(r?.links?.html||""), width:Number(r?.width||0)||undefined, height:Number(r?.height||0)||undefined, license:"Unsplash License"
    })).filter((x:any)=>x.url && x.url.startsWith("http"));
  }catch{ return []; }
}

// —— Sorgu üretici —— 
function buildImageQuery(topic:string){
  const base=topic.toLowerCase(); const extra:string[]=[];
  if(/tec|turkish engine center|pratt|whitney|thy|türk hava yolları/.test(base)){ extra.push("aircraft engine maintenance","MRO","hangar","jet engine"); }
  if(/grev|strike|sendika|tisl/.test(base)){ extra.push("aviation workers","airport operations"); }
  return [topic,"aviation","airport",...extra].join(" ");
}

// —— Görsel garanti hattı —— 
async function ensureImages(ensured:GenResult, topic:string, imageDeadline:number){
  const hints=detectEntityHints(topic);
  let imgs=sanitizeImages(ensured.images||[]);
  const need=(n:number)=>Math.max(0, n-imgs.length);
  let remain=Math.min(IMAGE_TOTAL_BUDGET_MS, remaining(imageDeadline));

  if((hints.entity || hints.commonsQueries.length) && remain>0 && imgs.length<3){
    const commons=await searchCommons(hints.commonsQueries.length?hints.commonsQueries:[hints.entity!], Math.min(6, need(6)), now()+Math.min(remain, IMAGE_PROVIDER_BUDGET_MS));
    imgs=[...imgs, ...commons]; remain=Math.min(IMAGE_TOTAL_BUDGET_MS, remaining(imageDeadline));
  }
  if(imgs.length<3 && remain>0 && (UNSPLASH_ACCESS_KEY||PEXELS_API_KEY)){
    if(UNSPLASH_ACCESS_KEY){
      const u=await searchUnsplash(hints.stockQueries.length?hints.stockQueries.join(" "):buildImageQuery(topic), need(6), now()+Math.min(remain, IMAGE_PROVIDER_BUDGET_MS));
      imgs=[...imgs, ...u]; remain=Math.min(IMAGE_TOTAL_BUDGET_MS, remaining(imageDeadline));
    }
    if(imgs.length<3 && remain>0 && PEXELS_API_KEY){
      const p=await searchPexels(hints.stockQueries.length?hints.stockQueries.join(" "):buildImageQuery(topic), need(6), now()+Math.min(remain, IMAGE_PROVIDER_BUDGET_MS));
      imgs=[...imgs, ...p];
    }
  }
  if(imgs.length<3 && remaining(imageDeadline)>0 && PEXELS_API_KEY){
    const p2=await searchPexels(buildImageQuery(topic), need(6), now()+Math.min(remaining(imageDeadline), IMAGE_PROVIDER_BUDGET_MS));
    imgs=[...imgs, ...p2];
  }
  imgs=sanitizeImages(imgs).map(i=>({ ...i, alt: i.alt||ensured.seoTitle||ensured.slug, credit: i.credit||"SkyNews", license: i.license||"CC/Stock" }));
  ensured.images=imgs.slice(0,6);
  return ensured;
}

// ==== API ====
export async function POST(req: NextRequest){
  const started=now(); const deadline=started+TOTAL_DEADLINE_MS;
  try{
    if(!GEMINI_API_KEY){ return Response.json({ ok:false, error:"Sunucu yapılandırması eksik: GEMINI_API_KEY" },{ status:500 }); }

    const { input, maxChars, fast } = (await req.json()) as { input?:string; maxChars?:number; fast?:boolean };
    const topic=(input||"Güncel bir havacılık gündemi").trim().slice(0,800);
    const maxTokens = fast ? Math.min(1024, MAX_TOKENS_DEFAULT) : MAX_TOKENS_DEFAULT;

    // 1) Model
    const raw = await callGeminiWithRetry(
      `${SYSTEM}\n\nKonu: ${topic}\n\nSkyNews okuru için tarafsız, teknik doğruluğu yüksek, SEO uyumlu bir içerik yaz. AI olduğu anlaşılmasın. Kısa ve uzun cümleleri dengeli kullan.`,
      maxTokens
    );

    // 2) JSON parse (gerekirse stub)
    const parsedRaw=safeJsonParse(raw);
    if(!parsedRaw){
      let ensured:GenResult={
        seoTitle:"SkyNews — Güncel gelişme",
        metaDesc:"Güncel havacılık haberi ve ayrıntılar.",
        slug: toSlug(topic).slice(0,120)||"haber",
        tags:["Havacılık"],
        keywords:["havacılık","gündem"],
        imageQuery: buildImageQuery(topic),
        images: [],
        html:`<h2>Özet</h2><p>${topic}</p>`
      };
      ensured=ensureMinParagraphsLocal(ensured, topic);
      if(typeof maxChars==="number" && maxChars>0){
        ensured.html=compressHtml(ensured.html, maxChars);
        const meta=stripTags(ensured.html).slice(0,160);
        ensured.metaDesc=meta.replace(/\s+\S*$/,"");
      }
      if(!fast){
        const imageDeadline= started + Math.min(TOTAL_DEADLINE_MS, (TOTAL_DEADLINE_MS-1200));
        if(remaining(imageDeadline)>0){ try{ ensured=await ensureImages(ensured, topic, imageDeadline); }catch{} }
      } else {
        ensured.images=[];
      }
      return Response.json({ ok:true, result: ensured });
    }

    // 3) Tipleri zorla + min 5 paragraf
    let ensured=ensureMinParagraphsLocal(coerceResult(parsedRaw), topic);

    // 4) Karakter limiti
    if(typeof maxChars==="number" && maxChars>0){
      ensured.html=compressHtml(ensured.html, maxChars);
      const meta=stripTags(ensured.html).slice(0,160);
      ensured.metaDesc=meta.replace(/\s+\S*$/,"");
    }

    // 5) Görseller (fast ise atla)
    if(!fast){
      const imageDeadline= started + Math.min(TOTAL_DEADLINE_MS, (TOTAL_DEADLINE_MS-1200));
      if(remaining(imageDeadline)>0){ try{ ensured=await ensureImages(ensured, topic, imageDeadline); }catch{} }
    } else {
      ensured.images=[];
    }

    return Response.json({ ok:true, result: ensured });

  }catch(e:any){
    const msg=String(e?.message||e);
    const isTransient=isTransientErr(msg)||/BUDGET_EXCEEDED|timeout/i.test(msg);
    return Response.json({ ok:false, error: isTransient ? "Geçici yoğunluk veya süre sınırı. Tekrar deneyin." : `Üretim başarısız: ${msg}`, details: msg }, { status: isTransient?503:500 });
  }
}
