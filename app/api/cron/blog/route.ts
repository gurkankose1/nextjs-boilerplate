// app/api/cron/blog/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { markdownToHtml } from "@/lib/markdownToHtml";

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

// —————————————————————————————————————————————
// ✔️ GÜNÜN TERİM LİSTESİ
// —————————————————————————————————————————————

const TERMS: TermDefinition[] = [
  {
    termKey: "pushback",
    title: "Pushback Nedir? Uçakların Geri İtilme ve Çekilme Süreci",
    slug: "pushback-nedir-ucaklarin-geri-itilme-sureci",
    shortDescription:
      "Pushback, uçağın park pozisyonundan kendi motor gücünü kullanmadan, yer hizmeti aracıyla geriye itilmesi işlemidir.",
    expertHint:
      "Yer hizmetleri, apron güvenliği, pushback prosedürleri, traktör (tug), towbar/towbarless sistemler, ATC koordinasyonu.",
  },
  {
    termKey: "pbb",
    title: "PBB (Passenger Boarding Bridge) Nedir? Yolcu Köprülerinin Rolü",
    slug: "pbb-nedir-yolcu-kopru-isleyisi",
    shortDescription:
      "Passenger Boarding Bridge, yolcunun terminal ile uçak arasında güvenli ve konforlu geçişini sağlayan köprü sistemidir.",
    expertHint:
      "Terminal operasyonları, PBB operatörlüğü, köprü parkı, uçak kapı hizalama, apron güvenliği.",
  },
  {
    termKey: "atc",
    title: "ATC Nedir? Hava Trafik Kontrolörleri Ne İş Yapar?",
    slug: "atc-nedir-hava-trafik-kontrolorleri-ne-is-yapar",
    shortDescription:
      "Air Traffic Control (ATC), hava ve yer trafiğinin güvenli ve düzenli akışını sağlayan kritik bir hizmettir.",
    expertHint:
      "Kule, yaklaşma (APP), saha radar (ACC), IFR/VFR, hava trafik yönetimi.",
  },
  {
    termKey: "weight-and-balance",
    title: "Uçaklarda Ağırlık ve Denge (Weight & Balance) Nedir?",
    slug: "ucaklarda-agirlik-ve-denge-weight-and-balance",
    shortDescription:
      "Weight & Balance, uçağın ağırlığının ve ağırlık merkezinin güvenli limitlerde tutulmasını sağlayan kritik hesaplamalardır.",
    expertHint:
      "Load sheet, trim, MAC, CG, performans hesaplamaları, kargo/bagaj yüklemesi.",
  },
];

// —————————————————————————————————————————————
// ✔️ Günün terimini seç (deterministik)
// —————————————————————————————————————————————
function pickTermOfTheDay(date: Date, overrideKey?: string | null): TermDefinition {
  if (overrideKey) {
    const f = TERMS.find((t) => t.termKey === overrideKey);
    if (f) return f;
  }
  const digits = date
    .toISOString()
    .slice(0, 10)
    .replace(/\D/g, "")
    .split("")
    .map((n) => Number(n));
  const idx = digits.reduce((a, b) => a + b, 0) % TERMS.length;
  return TERMS[idx];
}

// —————————————————————————————————————————————
// ✔️ HTML → Summary
// —————————————————————————————————————————————
function extractSummaryFromHtml(html: string, maxLength = 260): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length <= maxLength
    ? text
    : text.slice(0, maxLength - 1).trimEnd() + "…";
}

// —————————————————————————————————————————————
// ✔️ Gemini'den HTML + imagePrompt üretimi
// —————————————————————————————————————————————

async function generateHtmlWithGemini(term: TermDefinition): Promise<{
  html: string;
  imagePrompt: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;

  const fallbackHtml = `
<p>${term.shortDescription}</p>
<p>${SITE_NAME} teknik havacılık terimlerini operasyon ekiplerinin anlayacağı şekilde sadeleştirerek sunmayı amaçlar.</p>
  `.trim();

  const fallbackImage = `Cinematic aviation illustration of ${term.title}. Dark blue airport tones.`;

  if (!apiKey) {
    return { html: fallbackHtml, imagePrompt: fallbackImage };
  }

  try {
    const userPrompt = `
Sen ${SITE_NAME} için yazı hazırlayan profesyonel bir havacılık editörüsün.

Konu: ${term.title}
Kısa açıklama: ${term.shortDescription}
Uzman bağlamı: ${term.expertHint}

GÖREV:
• Sadece HTML gövdesi üret (başlık <h1> verme)
• 5–7 paragraf teknik-ama-sade bir yazı üret
• Gerekirse <ul>, <li> kullan
• Türkçe yaz
• Son satıra şu formatta image prompt ekle: IMAGE_PROMPT: <kısa İngilizce sahne>
    `.trim();

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }],
        },
      ],
    };

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (!resp.ok) {
      console.error("Gemini error:", await resp.text());
      return { html: fallbackHtml, imagePrompt: fallbackImage };
    }

    const data = await resp.json();
    const raw =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") ||
      "";

    let imagePrompt = fallbackImage;

    // IMAGE_PROMPT ayıklama
    const imgMatch = raw.match(/IMAGE_PROMPT:\s*(.+)$/im);
    if (imgMatch) {
      imagePrompt = imgMatch[1].trim();
    }

    // Prompt satırını kaldır
    let cleaned = raw.replace(/IMAGE_PROMPT:\s*.+$/im, "").trim();

    // Markdown fence temizliği
    cleaned = cleaned
      .replace(/```html/gi, "")
      .replace(/```/g, "")
      .trim();

    // Markdown → HTML çevir
    const html = await markdownToHtml(cleaned);

    return { html, imagePrompt };
  } catch (err) {
    console.error("Gemini exception:", err);
    return { html: fallbackHtml, imagePrompt: fallbackImage };
  }
}

// —————————————————————————————————————————————
// ✔️ ANA CRON ROUTE — Blog üretimi
// —————————————————————————————————————————————

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const overrideKey = url.searchParams.get("termKey") || null;

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const yyyyMmDd = today.toISOString().slice(0, 10);

  const term = pickTermOfTheDay(today, overrideKey);

  try {
    // Aynı terim bugün oluşturulmuş mu?
    const existing = await adminDb
      .collection("blog_posts")
      .where("termKey", "==", term.termKey)
      .where("publishedDate", "==", yyyyMmDd)
      .limit(1)
      .get();

    if (!existing.empty) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Already exists for today",
        termKey: term.termKey,
      });
    }

    // Gemini HTML + görsel prompt
    const { html, imagePrompt } = await generateHtmlWithGemini(term);
    const summary = extractSummaryFromHtml(html);

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
      mainImageUrl: null,
      publishedAt: today.toISOString(),
      publishedDate: yyyyMmDd,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      createdId: docRef.id,
      termKey: term.termKey,
      slug: term.slug,
      date: yyyyMmDd,
    });
  } catch (err) {
    console.error("Cron blog error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
