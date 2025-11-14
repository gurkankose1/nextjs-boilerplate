// app/api/cron/blog/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME && process.env.NEXT_PUBLIC_SITE_NAME.trim()
    ? process.env.NEXT_PUBLIC_SITE_NAME
    : "SkyNews.Tr";

type TermDefinition = {
  termKey: string;
  title: string;
  slug: string;
  shortDescription: string;
  expertHint: string;
};

// Gün içinde dönebileceğimiz örnek terimler (daha sonra genişletebiliriz)
const TERMS: TermDefinition[] = [
  {
    termKey: "pushback",
    title: "Pushback Nedir? Uçakların Geri İtilme ve Çekilme Süreci",
    slug: "pushback-nedir-ucaklarin-geri-itilme-sureci",
    shortDescription:
      "Pushback, uçağın park pozisyonundan kendi motor gücünü kullanmadan, yer hizmeti aracıyla geriye itilmesi işlemidir. Apron güvenliği ve taksi başlangıcı için kritik bir adımdır.",
    expertHint:
      "Yer hizmetleri, apron güvenliği, pushback prosedürleri, traktör (tug), towbar/towbarless sistemler, ATC koordinasyonu.",
  },
  {
    termKey: "pbb",
    title: "PBB (Passenger Boarding Bridge) Nedir? Yolcu Köprülerinin Rolü",
    slug: "pbb-nedir-yolcu-kopru-isleyisi",
    shortDescription:
      "Passenger Boarding Bridge, yolcunun terminal ile uçak arasında güvenli ve konforlu geçişini sağlayan köprü sistemidir. Operasyon, güvenlik ve havalimanı verimliliğinde önemli rol oynar.",
    expertHint:
      "Havalimanı terminal operasyonları, PBB operatörlüğü, köprü parkı, uçak kapı hizalama, apron güvenliği, yolcu deneyimi.",
  },
  {
    termKey: "atc",
    title: "ATC Nedir? Hava Trafik Kontrolörleri Ne İş Yapar?",
    slug: "atc-nedir-hava-trafik-kontrolorleri-ne-is-yapar",
    shortDescription:
      "Air Traffic Control (ATC), hava araçlarının havada ve yerde emniyetli ve düzenli akışını sağlayan kritik bir hizmettir. Kule, yaklaşma ve saha radar ünitelerini içerir.",
    expertHint:
      "Hava trafik yönetimi, kule (TWR), yaklaşma (APP), saha/alan radar (ACC), frekans kullanımı, ayrım miniması, IFR/VFR.",
  },
  {
    termKey: "weight-and-balance",
    title: "Uçaklarda Ağırlık ve Denge (Weight & Balance) Nedir?",
    slug: "ucaklarda-agirlik-ve-denge-weight-and-balance",
    shortDescription:
      "Weight & Balance, uçağın toplam ağırlığı ve ağırlık merkezinin limitler içinde kalmasını sağlar. Emniyetli kalkış, tırmanış ve iniş performansı için kritik öneme sahiptir.",
    expertHint:
      "Load sheet, trim, MAC, CG, kalkış ağırlığı limitleri, kabin yerleşimi, kargo & bagaj yüklemesi, performans hesaplamaları.",
  },
];

// Bugünün tarihine göre deterministik bir terim seç (her gün farklı olsun)
function pickTermOfTheDay(date: Date, overrideKey?: string | null): TermDefinition {
  if (overrideKey) {
    const found = TERMS.find((t) => t.termKey === overrideKey);
    if (found) return found;
  }
  const yyyyMmDd = date.toISOString().slice(0, 10); // 2025-11-14
  const sum = yyyyMmDd
    .split("")
    .filter((ch) => /\d/.test(ch))
    .map((ch) => Number(ch))
    .reduce((acc, n) => acc + n, 0);
  const idx = sum % TERMS.length;
  return TERMS[idx];
}

// Basit HTML temizleme ve özet çıkarma
function extractSummaryFromHtml(html: string, maxLength = 260): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trimEnd() + "…";
}

// Gemini'den HTML gövdesi almaya çalışan yardımcı fonksiyon
async function generateHtmlWithGemini(term: TermDefinition): Promise<{
  html: string;
  imagePrompt: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;

  const baseHtmlFallback = `
<p>${term.shortDescription}</p>
<p>Bu yazıda ${term.title} konusunu temel kavramlar, operasyonel süreçler ve emniyet bakış açısıyla özetleyeceğiz.</p>
<p>${SITE_NAME}, bu tür teknik kavramları sahada çalışan ekiplerin anlayacağı sade bir dille anlatmayı amaçlar.</p>
`.trim();

  const defaultImagePrompt = `Sinematik, gerçekçi havacılık illüstrasyonu: ${term.title} konusunu çağrıştıran, apron ve uçak detayları içeren bir sahne. Koyu lacivert ve mavi tonlar.`;

  if (!apiKey) {
    // Gemini yoksa basit bir fallback dön
    return {
      html: baseHtmlFallback,
      imagePrompt: defaultImagePrompt,
    };
  }

  try {
    const systemAndUserPrompt = [
      `Sen ${SITE_NAME} için yazı hazırlayan profesyonel bir havacılık editörüsün.`,
      `Konuyu, sahada çalışan ramp, ATC, yer hizmeti, kabin ve teknik ekiplerin anlayacağı sade ama teknik olarak doğru bir dille anlat.`,
      ``,
      `Konu başlığı: "${term.title}"`,
      `Kısa açıklama: "${term.shortDescription}"`,
      `Uzmanlık bağlamı: ${term.expertHint}`,
      ``,
      `ÇIKTI FORMATIN:`,
      `• Sadece HTML gövdesi üret (başlık etiketi <h1> yazma, sadece <p>, <ul>, <li>, <strong> vb. kullan).`,
      `• 5–7 paragraf olsun.`,
      `• Gerektiğinde madde işaretli listeler kullanabilirsin.`,
      `• Türkçe yaz.`,
      ``,
      `Ayrıca, bu konuyu temsil edecek bir AI görseli için çok kısa bir İngilizce "image prompt" üret (tek cümle).`,
      `Bu image prompt'u da en sonda ayrı bir satırda şu formatta yaz:`,
      `"IMAGE_PROMPT: <prompt burada>"`,
    ].join("\n");

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: systemAndUserPrompt }],
        },
      ],
    };

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      console.error("Gemini blog call failed:", await resp.text());
      return {
        html: baseHtmlFallback,
        imagePrompt: defaultImagePrompt,
      };
    }

    const data = await resp.json();
    const parts: string[] =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "") ?? [];
    let fullText = parts.join("\n").trim();

    let imagePrompt = defaultImagePrompt;

    // IMAGE_PROMPT satırını ayıklayalım
    const imagePromptMatch = fullText.match(/IMAGE_PROMPT:\s*(.+)$/im);
    if (imagePromptMatch) {
      imagePrompt = imagePromptMatch[1].trim();
      fullText = fullText.replace(/IMAGE_PROMPT:\s*.+$/im, "").trim();
    }

    const html = fullText || baseHtmlFallback;

    return {
      html,
      imagePrompt,
    };
  } catch (err) {
    console.error("Error calling Gemini for blog:", err);
    return {
      html: baseHtmlFallback,
      imagePrompt: defaultImagePrompt,
    };
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const overrideKey = url.searchParams.get("termKey") || null;

  // Basit secret kontrolü
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const term = pickTermOfTheDay(today, overrideKey);

  try {
    // Aynı terim için bugün zaten blog yazısı oluşturulmuş mu kontrol et
    const yyyyMmDd = today.toISOString().slice(0, 10); // 2025-11-14
    const existingSnap = await adminDb
      .collection("blog_posts")
      .where("termKey", "==", term.termKey)
      .where("publishedDate", "==", yyyyMmDd)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Today’s blog post for this term already exists.",
        termKey: term.termKey,
        date: yyyyMmDd,
      });
    }

    // Gemini'den HTML + imagePrompt al
    const { html, imagePrompt } = await generateHtmlWithGemini(term);
    const summary = extractSummaryFromHtml(html, 260);

    const docRef = await adminDb.collection("blog_posts").add({
      termKey: term.termKey,
      title: term.title,
      slug: term.slug,
      summary,
      html,
      seoTitle: term.title,
      metaDesc: summary,
      category: "term",
      source: "auto-gemini",
      imagePrompt,
      mainImageUrl: null, // Daha sonra AI veya Pexels/Unsplash ile dolduracağız
      publishedAt: today.toISOString(),
      publishedDate: yyyyMmDd,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      createdId: docRef.id,
      termKey: term.termKey,
      slug: term.slug,
      title: term.title,
      publishedDate: yyyyMmDd,
    });
  } catch (err) {
    console.error("Error in /api/cron/blog:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Internal error while creating blog post",
      },
      { status: 500 }
    );
  }
}
