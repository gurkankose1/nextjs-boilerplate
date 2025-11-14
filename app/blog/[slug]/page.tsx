// app/blog/[slug]/page.tsx
import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  html?: string | null;
  publishedAt?: string | null;
  seoTitle?: string | null;
  metaDesc?: string | null;
  mainImageUrl?: string | null;
};

const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME && process.env.NEXT_PUBLIC_SITE_NAME.trim()
    ? process.env.NEXT_PUBLIC_SITE_NAME
    : "SkyNews.Tr";

export const revalidate = 300;

// 1) Slug ile arar; bulamazsa en son blog yazısını getirir
async function getBlogPostBySlugOrLatest(slug: string): Promise<BlogPost | null> {
  try {
    // Önce slug ile dene (slug boş / "undefined" ise atla)
    if (slug && slug !== "undefined" && slug !== "null") {
      const snap = await adminDb
        .collection("blog_posts")
        .where("slug", "==", slug)
        .limit(1)
        .get();

      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data() || {};
        return {
          id: doc.id,
          title: data.title || "Başlıksız yazı",
          slug: data.slug || slug,
          summary: data.summary || data.metaDesc || null,
          html: data.html || null,
          publishedAt: data.publishedAt || null,
          seoTitle: data.seoTitle || null,
          metaDesc: data.metaDesc || null,
          mainImageUrl: data.mainImageUrl || null,
        };
      }
    }

    // Slug ile bulunamadı → en son yayınlanan blog yazısını getir
    const latestSnap = await adminDb
      .collection("blog_posts")
      .orderBy("publishedAt", "desc")
      .limit(1)
      .get();

    if (latestSnap.empty) {
      return null;
    }

    const latestDoc = latestSnap.docs[0];
    const latestData = latestDoc.data() || {};

    return {
      id: latestDoc.id,
      title: latestData.title || "Başlıksız yazı",
      slug: latestData.slug || latestDoc.id,
      summary: latestData.summary || latestData.metaDesc || null,
      html: latestData.html || null,
      publishedAt: latestData.publishedAt || null,
      seoTitle: latestData.seoTitle || null,
      metaDesc: latestData.metaDesc || null,
      mainImageUrl: latestData.mainImageUrl || null,
    };
  } catch (err) {
    console.error("Error fetching blog post:", err);
    return null;
  }
}

export default async function BlogDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;
  const post = await getBlogPostBySlugOrLatest(slug);

  if (!post) {
    // Koleksiyon gerçekten boşsa buraya düşer
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
          <nav className="mb-4 text-[11px] text-slate-500">
            <Link href="/" className="hover:text-sky-300">
              Ana sayfa
            </Link>
            <span className="mx-1">/</span>
            <Link href="/blog" className="hover:text-sky-300">
              Havacılık Terimleri
            </Link>
          </nav>
          <h1 className="text-xl font-semibold text-slate-50 mb-2">
            İçerik bulunamadı
          </h1>
          <p className="text-sm text-slate-400 mb-2">
            Bu terim için blog yazısı bulunamadı ya da henüz hiç blog yazısı
            oluşturulmamış görünüyor.
          </p>
          <p className="text-[11px] text-slate-500">
            Debug — slug: <code>{slug || "(boş)"}</code>
          </p>
        </div>
      </main>
    );
  }

  const published =
    post.publishedAt && !Number.isNaN(new Date(post.publishedAt).getTime())
      ? new Date(post.publishedAt).toLocaleDateString("tr-TR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
        {/* Breadcrumb */}
        <nav className="mb-4 text-[11px] text-slate-500">
          <Link href="/" className="hover:text-sky-300">
            Ana sayfa
          </Link>
          <span className="mx-1">/</span>
          <Link href="/blog" className="hover:text-sky-300">
            Havacılık Terimleri
          </Link>
          <span className="mx-1">/</span>
          <span className="text-slate-300 line-clamp-1 align-middle">
            {post.title}
          </span>
        </nav>

        {/* Başlık + meta */}
        <header className="mb-6 border-b border-slate-800 pb-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-sky-400 mb-1">
            Havacılık Terimi • Blog
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
            {post.title}
          </h1>
          {post.summary && (
            <p className="mt-2 text-xs text-slate-300 sm:text-sm">
              {post.summary}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <span>{SITE_NAME} Bilgi Köşesi</span>
            {published && (
              <>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span>{published}</span>
              </>
            )}
          </div>
        </header>

        {/* Görsel alanı */}
        {post.mainImageUrl ? (
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.mainImageUrl}
              alt={post.title}
              className="w-full h-[320px] object-cover object-center rounded-xl shadow-lg shadow-slate-900/50"
            />
          </div>
        ) : (
          <div className="mb-6 h-40 w-full rounded-2xl border border-slate-800 bg-gradient-to-br from-sky-900/70 via-slate-900 to-slate-950 flex items-center justify-center">
            <span className="text-[11px] text-slate-300">
              Bu terim için AI görseli yakında eklenecek.
            </span>
          </div>
        )}

        {/* İçerik */}
        <article className="prose prose-invert prose-sm max-w-none prose-headings:text-slate-50 prose-p:text-slate-100 prose-a:text-sky-300">
          {post.html ? (
            <div dangerouslySetInnerHTML={{ __html: post.html }} />
          ) : (
            <p className="text-sm text-slate-300">
              Bu terim için içerik henüz oluşturulmamış görünüyor.
            </p>
          )}
        </article>
      </div>
    </main>
  );
}
