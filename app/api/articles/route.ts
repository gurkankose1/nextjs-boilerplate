import { NextResponse } from "next/server";

type Article = {
  id: string;
  title: string;
  summary?: string;
  slug: string;
  html?: string;
  category?: string;
  source?: string;
  sourceUrl?: string;
  published?: string;
  createdAt?: string;
  mainImageUrl?: string;
};

// Şimdilik DEMO veri. İki haber ekliyorum.
// 1) Eurofighter haberi (slug ve id aynen senin linkindeki gibi)
// 2) Pegasus haberi (daha önce yazdığın slug + id)
const DEMO_ARTICLES: Article[] = [
  {
    id: "WPsT1eXFf0YPlfQxfyL7",
    slug: "turkiyenin-20-adet-eurofighter-typhoon-savas-ucag-satn-almndan-ra",
    title:
      "Türkiye’nin 20 adet Eurofighter Typhoon savaş uçağı alımı gündemde",
    summary:
      "Türkiye’nin 20 adet Eurofighter Typhoon savaş uçağı alımı için yürüttüğü süreçte son durum ve olası senaryolar.",
    html: `<p>Bu sayfa şu anda <strong>demo</strong> veri ile çalışıyor.</p>
<p>Gerçek projede bu içerik Firestore veya başka bir backend'den gelecektir.</p>
<p>Şimdilik amaç, <code>/news/[slug]?id=...</code> yapısının sorunsuz çalıştığını kanıtlamak.</p>`,
    category: "Savunma & Askerî Havacılık",
    source: "Demo Kaynak",
    sourceUrl: "https://example.com/eurofighter-demo",
    published: new Date().toISOString(),
    mainImageUrl:
      "https://images.pexels.com/photos/46148/aircraft-jet-landing-cloud-46148.jpeg"
  },
  {
    id: "iipfSbHhnTpqZnCI1l3t",
    slug: "pegasus-hava-tasimaciligi-as-2025-yilinin-ilk-dokuz-ayina-iliskin-finansal-sonuclarini-acikladi-sirk",
    title:
      "Pegasus Hava Taşımacılığı A.Ş. 2025 yılının ilk dokuz ayına ilişkin finansal sonuçlarını açıkladı",
    summary:
      "Pegasus’un 2025 yılının ilk dokuz ayındaki yolcu sayısı, gelirleri ve operasyonel performansı hakkında demo içerik.",
    html: `<p>Bu da Pegasus için eklenmiş <strong>demo</strong> bir haberdir.</p>
<p>Gerçek veriler bağlandığında bu alan otomatik olarak gerçek HTML ile dolacak.</p>`,
    category: "Havayolları",
    source: "Demo Kaynak",
    sourceUrl: "https://example.com/pegasus-demo",
    published: new Date().toISOString(),
    mainImageUrl:
      "https://images.pexels.com/photos/358220/pexels-photo-358220.jpeg"
  }
];

// GET /api/articles  ->  DEMO_ARTICLES dizisini döner
export async function GET(_request: Request) {
  return NextResponse.json(DEMO_ARTICLES);
}
