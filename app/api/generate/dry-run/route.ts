// app/api/generate/dry-run/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn(
    "[generate/dry-run] GEMINI_API_KEY env değişkeni tanımlı değil."
  );
}

// Kategoriler ve editörler (senin tanımladıkların)
const CATEGORY_EDITOR_MAP: Record<string, string> = {
  airlines: "Metehan Özülkü",
  airports: "Kemal Kahraman",
  "ground-handling": "Hafife Kandemir",
  "military-aviation": "Musa Demirbilek",
  accidents: "Editör Ekibi",
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  airlines: "Havayolları",
  airports: "Havalimanları",
  "ground-handling": "Yer Hizmetleri",
  accidents: "Uçak Kazaları",
  "military-aviation": "Askeri Havacılık",
};

type GenRequestBody = {
  input: string;
  maxChars?: number;
  fast?: boolean;
};

type GenImage = {
  url: string;
  alt?: string;
  credit?: string;
  link?: string;
  width?: number;
  height?: number;
  license?: string;
};

type GenResult = {
  seoTitle: string;
  metaDesc: string;
  slug: string;
  tags: string[];
  keywords: string[];
  category: keyof typeof CATEGORY_LABEL_MAP | "other";
  editorName: string;
  imageQuery: string;
  images?: GenImage[];
  html: string;
};

function normaliseSlug(input: string): string {
  const map: Record<string, string> = {
    ğ: "g",
    Ğ: "g",
    ü: "u",
    Ü: "u",
    ş: "s",
    Ş: "s",
    ı: "i",
    İ: "i",
    ö: "o",
    Ö: "o",
    ç: "c",
    Ç: "c",
  };
  return input
    .trim()
    .toLowerCase()
    .replace(/[ğĞüÜşŞıİöÖçÇ]/g, (ch) => map[ch] || ch)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function pickCategoryFromKeywords(keywords: string[]): GenResult["category"] {
  const joined = keywords.join(" ").toLowerCase();

  const scores: Record<GenResult["category"], number> = {
    airlines: 0,
    airports: 0,
    "ground-handling": 0,
    accidents: 0,
    "military-aviation": 0,
    other: 0,
  };

  const bump = (cat: GenResult["category"], amount = 1) => {
    scores[cat] += amount;
  };

  if (joined.match(/\bkaza\b|\baccident\b|\bincident\b|\bcrash\b/)) {
    bump("accidents", 3);
  }

  if (
    joined.match(
      /\bairline\b|\bcarrier\b|\bsefer\b|\bflight\b|\bfilo\b|\border\b|\bairbus\b|\bboeing\b|\bmax\b|\bneo\b/
    )
  ) {
    bump("airlines", 2);
  }

  if (
    joined.match(
      /\bairport\b|\bterminal\b|\bpier\b|\bstand\b|\bgate\b|\bhavalimanı\b|\bIGA\b|\bSAW\b|\bIST\b/
    )
  ) {
    bump("airports", 2);
  }

  if (
    joined.match(
      /\bground handling\b|\byer hizmet\b|\bmarshalling\b|\bpbb\b|\bköprü\b|\bgpu\b|\bpca\b|\bpushback\b/
    )
  ) {
    bump("ground-handling", 2);
  }

  if (
    joined.match(
      /\bair force\b|\bairforce\b|\baskeri\b|\bmilitary\b|\bfighter\b|\bjet\b|\bdefence\b|\bdefense\b/
    )
  ) {
    bump("military-aviation", 2);
  }

  let best: GenResult["category"] = "other";
  let bestScore = 0;
  for (const [key, value] of Object.entries(scores)) {
    if (value > bestScore) {
      bestScore = value;
      best = key as GenResult["category"];
    }
  }
  return bestScore > 0 ? best : "other";
}

function mapEditor(category: GenResult["category"]): string {
  return CATEGORY_EDITOR_MAP[category] || "Editör Ekibi";
}

function buildSystemPrompt(): string {
  return `
Sen, Türkçe yazan profesyonel bir havacılık haber editörüsün.
Görevin: Sana verilen ham konu metninden (başlık + link + kısa özet) yola çıkarak;
SEO uyumlu, teknik olarak temiz, tarafsız ve profesyonel bir haberi JSON formatında üretmek.

GENEL İLKELER:
- DİL: 
  - Haber dili kullan; abartılı, magazinsel veya sansasyonel ifade kullanma.
  - "Biz", "ben", "yazar" gibi öznel ifadeler kullanma; tarafsız kal.
  - Türkiye'deki havacılık sektörüne hakim, ciddi bir editör gibi yaz.
- GERÇEKLİK:
  - Haberde verilmeyen bir tarihi, rakamı, alıntıyı UYDURMA.
  - Bilmiyorsan "netleşmedi", "paylaşılmadı" gibi ifadelerle açıkça belirt.
- GÜVENLİK:
  - Kazalar ve olaylarda spekülasyondan kaçın; resmi açıklamalar ve doğrulanmış bilgileri esas al.

HTML GÖVDE (html alanı):
- HTML mutlaka en az 5 paragraf içermelidir: <p>...</p>
- Gereksiz <h1> kullanma; başlık zaten ayrı tutulacak.
- Liste gerekiyorsa <ul>, <ol> kullanabilirsin ama ana akış paragraf olsun.
- Kısa, okunabilir paragraflar tercih et.

ÖZEL YAPI - GREV / MRO / TEKNİK HABERLER:
Eğer haber;
  - grev, toplu sözleşme, sendika, iş bırakma, iş yavaşlatma
  - MRO, bakım merkezi, motor atölyesi, üs bakım, TEC, hangar işletmesi
  - yer hizmetleri operasyonu, PBB, GPU, PCA, su servisi vb.
ile ilgiliyse, ilk 5 paragrafı aşağıdaki kurguda yaz:

1) Sürecin seyri / tarihçe:
   - Olayın veya sürecin nasıl başladığını, nerede ve ne zaman geliştiğini özetle.
2) Talepler ve rakamlar:
   - Varsa sendikanın veya tarafların talepleri, ücret oranları, filo büyüklüğü, uçuş sayıları vb.
3) İşverenin pozisyonu:
   - İlgili şirketin veya kurumun resmi açıklamasını, savunmasını veya tutumunu özetle.
4) Olası etkiler / operasyonel yansımalar:
   - Sefer iptalleri, rötarlar, kapasite düşüşü, apron / terminal operasyonuna etkiler.
5) Sektörel bağlam / arka plan:
   - Bu gelişmenin Türkiye ve dünya havacılığına, rekabete veya operasyonel standartlara olası yansımaları.

UÇAK KAZALARI / OLAYLAR:
- Tonun sakin, saygılı ve spekülatif olmayan olsun.
- Soruşturma aşamasındaysa, soruşturmanın sürdüğünü ve bulguların erken olabileceğini vurgula.
- Kesin sebep açıklanmadıysa "kesin sebep henüz açıklanmadı" de; sen tahmin yürütme.

KATEGORİ VE EDITÖR:
- Haber için aşağıdaki kategorilerden en uygunu seçilecek:
  - "airlines"          → Havayolları
  - "airports"          → Havalimanları
  - "ground-handling"   → Yer Hizmetleri
  - "accidents"         → Uçak Kazaları / Olaylar
  - "military-aviation" → Askeri Havacılık
- Kategoriyi belirlerken ana odak noktası neyse ona göre seç:
  - Yeni hat, filo, sipariş, finansal karar → airlines
  - Terminal, pist, apron, stand, slot, havalimanı işletmesi → airports
  - PBB, GPU, PCA, pushback, bagaj, apron operasyonu, handling şirketleri → ground-handling
  - Kaza, incident, ciddi olay, emercensi iniş, runway excursion vb. → accidents
  - savaş uçakları, savunma projeleri, hava kuvvetleri, füze, askeri tatbikat → military-aviation
- Her kategori için aşağıdaki isimlerden bir editör adı ata:
  - airlines          → "Metehan Özülkü"
  - airports          → "Kemal Kahraman"
  - ground-handling   → "Hafife Kandemir"
  - military-aviation → "Musa Demirbilek"
  - accidents         → "Editör Ekibi"
- Eğer kategori net belirlenemiyorsa "other" kullan ve editorName olarak "Editör Ekibi" ver.

SEO VE METAVERİ:
- seoTitle:
  - 55–70 karakter, Türkçe, net ve tıklanabilir ama clickbait olmayan bir başlık.
  - Markaları ve önemli unsurları (ör: THY, IGA, SAW, Airbus A321neo vb.) içerebilir.
- metaDesc:
  - 130–160 karakter arası, haberi özetleyen akıcı bir cümle.
- slug:
  - Türkçe karakterleri sadeleştir (ğ→g, ş→s, ı→i, ö→o, ü→u, ç→c).
  - Küçük harf ve tire ile ayır: "turkish-airlines-yeni-filo-planini-acikladi" gibi.
  - Tarih veya saat ekleme; mümkün olduğunca kısa ve anlamlı tut.
- tags:
  - Maksimum 6 kısa etiket. Ör: ["THY", "filo planlaması", "geniş gövde"].
- keywords:
  - 5–12 adet SEO anahtar kelimesi. Ör: ["Turkish Airlines", "geniş gövde uçak", "filo yenileme", "İstanbul Havalimanı"].

GÖRSEL SORGUSU (imageQuery, images):
- imageQuery:
  - Telifsiz görsel araması için, marka/logodan bağımsız KISA bir İngilizce arama ifadesi üret.
  - Örnekler:
    - "airport apron at night"
    - "airline cabin crew walking in terminal"
    - "cargo aircraft loading at airport"
    - "air traffic control tower at sunset"
  - THY, Pegasus, Emirates, Boeing, Airbus gibi marka isimlerini zorunlu değilse kullanma.
- images:
  - Eğer gerçek, telifsiz bir görsel kaynağına referans veremiyorsan boş bir dizi döndür: [].
  - Eğer kurgu yapıyorsan, "url" sahte bir URL olmasın; o zaman da [] kullan.
  - Bu alan backend tarafından Wikimedia Commons / Unsplash / Pexels sonuçlarıyla doldurulabilir.

⚠️ ÇIKTI FORMATIN:
- SADECE GEÇERLİ BİR JSON nesnesi döndür:
  {
    "seoTitle": string,
    "metaDesc": string,
    "slug": string,
    "tags": string[],
    "keywords": string[],
    "category": "airlines" | "airports" | "ground-handling" | "accidents" | "military-aviation" | "other",
    "editorName": string,
    "imageQuery": string,
    "images": GenImage[] (veya boş dizi),
    "html": string
  }
- Kesinlikle açıklama, açıklayıcı metin, Markdown, ek metin YAZMA.
- Sadece tek bir JSON obje döndür.
  `.trim();
}

// Gemini REST çağrısı
async function callGeminiJSON(body: GenRequestBody): Promise<GenResult> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY tanımlı değil");
  }

  const { input, maxChars, fast } = body;

  const model =
    fast === true ? "models/gemini-2.0-flash" : "models/gemini-2.5-flash";

  const systemPrompt = buildSystemPrompt();

  const maxTokens =
    typeof maxChars === "number" && maxChars > 0
      ? Math.min(Math.max(Math.round(maxChars / 4), 256), 4096)
      : 2048;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              systemPrompt +
              `

HAM GİRDİ:
${input}
`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: fast ? 0.9 : 0.7,
      topK: 40,
      topP: 0.9,
      maxOutputTokens: maxTokens,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(
      `Gemini API error: ${resp.status} ${resp.statusText} - ${text}`
    );
  }

  const data: any = await resp.json();
  const textOutput: string | undefined =
    data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error("Gemini boş çıktı döndürdü.");
  }

  // JSON'u güvenle ayıklamaya çalış
  let parsed: any;
  try {
    parsed = JSON.parse(textOutput);
  } catch {
    // Metnin içinden JSON blok aramayı dene
    const match = textOutput.match(/\{[\s\S]*\}$/m);
    if (!match) {
      throw new Error("Gemini çıktısı JSON formatında değil.");
    }
    parsed = JSON.parse(match[0]);
  }

  // Tipleri normalize et
  const seoTitle = String(parsed.seoTitle || "").trim();
  const metaDesc = String(parsed.metaDesc || "").trim();
  const slugRaw: string = String(parsed.slug || seoTitle || "").trim();
  const slug = normaliseSlug(slugRaw || seoTitle || "havacilik-haberi");

  const tags: string[] = Array.isArray(parsed.tags)
    ? parsed.tags
        .map((t: any) => String(t || "").trim())
        .filter((t: string) => t.length > 0)
    : [];
  const keywords: string[] = Array.isArray(parsed.keywords)
    ? parsed.keywords
        .map((t: any) => String(t || "").trim())
        .filter((t: string) => t.length > 0)
    : [];

  let category: GenResult["category"] = parsed.category || "other";
  if (
    ![
      "airlines",
      "airports",
      "ground-handling",
      "accidents",
      "military-aviation",
      "other",
    ].includes(category)
  ) {
    // LLM saçmalamışsa keywordlerden çıkar
    category = pickCategoryFromKeywords(keywords);
  }

  const editorName: string =
    parsed.editorName && typeof parsed.editorName === "string"
      ? parsed.editorName
      : mapEditor(category);

  const imageQuery: string =
    (parsed.imageQuery && String(parsed.imageQuery).trim()) ||
    "airport runway at sunset";

  const images: GenImage[] = Array.isArray(parsed.images)
    ? parsed.images
        .map((img: any) => ({
          url: String(img?.url || "").trim(),
          alt: img?.alt ? String(img.alt) : undefined,
          credit: img?.credit ? String(img.credit) : undefined,
          link: img?.link ? String(img.link) : undefined,
          width:
            typeof img?.width === "number" ? (img.width as number) : undefined,
          height:
            typeof img?.height === "number"
              ? (img.height as number)
              : undefined,
          license: img?.license ? String(img.license) : undefined,
        }))
        .filter((img: GenImage) => img.url.length > 0)
    : [];

  const html: string = String(parsed.html || "").trim();

  if (!seoTitle || !html) {
    throw new Error("Gemini çıktısı eksik: seoTitle veya html yok.");
  }

  const result: GenResult = {
    seoTitle,
    metaDesc,
    slug,
    tags,
    keywords,
    category,
    editorName,
    imageQuery,
    images,
    html,
  };

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json()) as GenRequestBody;

    if (!json || typeof json.input !== "string" || !json.input.trim()) {
      return NextResponse.json(
        { ok: false, error: "input alanı zorunludur." },
        { status: 400 }
      );
    }

    const result = await callGeminiJSON(json);

    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[generate/dry-run] error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: String(error?.message || error || "Bilinmeyen hata"),
      },
      { status: 500 }
    );
  }
}
