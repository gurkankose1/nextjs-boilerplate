// app/news/[slug]/page.tsx
import { notFound } from "next/navigation";
import { adminDb } from "../../../lib/firebaseAdmin";

// Bu regex, "otomatik ek paragraf" metnini taşıyan <p> bloklarını komple siler.
// Hem noktalama, boşluk, varyasyon toleranslı; büyük/küçük harf duyarsızdır.
// "otomatik ek paragraf" metnini taşıyan <p> bloklarını komple siler.
function stripAutoAdded(html: string): string {
  if (!html) return "";
  // Not: 's' bayrağı yok; onun yerine [\s\S]*? kullanıyoruz
  const re = /<p[^>]*>\s*Bu paragraf,\s*haber içeriğini\s*tamamlamak[\s\S]*?<\/p>\s*/gi;
  let out = html.replace(re, "");
  // Temizlik sonrası oluşabilecek fazla boşluk/çift <br> vb. toparla (hafif dokunuşlar):
  out = out.replace(/\n{3,}/g, "\n\n").replace(/(\s|&nbsp;){2,}/g, " ");
  return out.trim();
}

type Article = {
  title: string;
  slug: string;
  html: string;
  images?: { url: string; alt?: string; credit?: string; link?: string }[];
  metaDesc?: string | null;
  tags?: string[];
  publishedAt?: string;
};

export const dynamic = "force-dynamic"; // anında güncel render

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const art = await fetchArticle(params.slug);
  if (!art) return {};
  return {
    title: art.title,
    description: art.metaDesc || undefined,
    openGraph: {
      title: art.title,
      description: art.metaDesc || undefined,
      images: art.images?.[0]?.url ? [{ url: art.images[0].url }] : undefined,
      type: "article",
    },
  };
}

async function fetchArticle(slug: string): Promise<Article | null> {
  const snap = await adminDb
    .collection("articles")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const data = snap.docs[0].data() as any;
  return {
    title: data.title || "SkyNews Haberi",
    slug: data.slug || slug,
    html: String(data.html || ""),
    images: Array.isArray(data.images) ? data.images : [],
    metaDesc: data.metaDesc || null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    publishedAt: data.publishedAt || null,
  };
}

export default async function NewsPage({ params }: { params: { slug: string } }) {
  const article = await fetchArticle(params.slug);
  if (!article) notFound();

  const cleanedHtml = stripAutoAdded(article!.html);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ lineHeight: 1.2 }}>{article!.title}</h1>
        {article!.publishedAt && (
          <div style={{ color: "#666", fontSize: 14, marginTop: 6 }}>
            Yayın: {new Date(article!.publishedAt).toLocaleString("tr-TR")}
          </div>
        )}
        {article!.tags && article!.tags.length > 0 && (
          <div style={{ color: "#555", fontSize: 12, marginTop: 6 }}>
            Etiketler: {article!.tags.join(", ")}
          </div>
        )}
      </header>

      {/* Kapak görseli (varsa) */}
      {article!.images && article!.images[0]?.url && (
        <figure style={{ margin: "16px 0" }}>
          <img src={article!.images[0].url} alt={article!.images[0].alt || ""} style={{ width: "100%", borderRadius: 8 }} />
          {(article!.images[0].credit || article!.images[0].link) && (
            <figcaption style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
              {article!.images[0].credit || "Görsel"}
              {article!.images[0].link && (
                <>
                  {" "}
                  — <a href={article!.images[0].link} target="_blank">kaynak</a>
                </>
              )}
            </figcaption>
          )}
        </figure>
      )}

      {/* GÖVDE — TEMİZLENMİŞ HTML */}
      <article
        style={{ lineHeight: 1.7, fontSize: 18 }}
        dangerouslySetInnerHTML={{ __html: cleanedHtml }}
      />
    </main>
  );
}
