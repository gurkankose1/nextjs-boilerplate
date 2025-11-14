// app/blog/[slug]/page.tsx
// @ts-nocheck
import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";

const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME && process.env.NEXT_PUBLIC_SITE_NAME.trim()
    ? process.env.NEXT_PUBLIC_SITE_NAME
    : "SkyNews.Tr";

export const revalidate = 300;

function mapBlogDoc(doc: any) {
  const data = doc.data() || {};
  return {
    id: doc.id,
    title: data.title || "Başlıksız yazı",
    slug: data.slug || doc.id,
    summary: data.summary || data.metaDesc || null,
    html: data.html || null,
    publishedAt: data.publishedAt || data.createdAt || null,
    seoTitle: data.seoTitle || null,
    metaDesc: data.metaDesc || null,
    mainImageUrl: data.mainImageUrl || null,
  };
}

async function getBlogPost(slug: string) {
  try {
    // 1) Önce slug ile ara
    if (slug && slug !== "undefined" && slug !== "null") {
      const bySlug = await adminDb
        .collection("blog_posts")
        .where("slug", "==", slug)
        .limit(1)
        .get();

      if (!bySlug.empty) {
        return mapBlogDoc(bySlug.docs[0]);
      }

      // 2) Slug ile bulunamadı → doküman ID'si olabilir, onu dene
      const byId = await adminDb.collection("blog_posts").doc(slug).get();
      if (byId.exists) {
        return mapBlogDoc(byId);
      }
    }

    // 3) Hâlâ yoksa → en son oluşturulan blog yazısını getir
    const latestSnap = await adminDb
      .collection("blog_posts")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (!latestSnap.empty) {
      return mapBlogDoc(latestSnap.docs[0]);
    }

    // Koleksiyon gerçekten boşsa:
    return null;
  } catch (err) {
    console.error("Error fetching blog post:", err);
    return null;
  }
}

export default async function BlogDetailPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const post = await getBlogPost(slug);

  if (!post) {
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
            Şu an için hiç blog yazısı bulunamadı. Cron ile en az bir yazı
            oluşturduktan sonra bu sayfa otomatik dolacak.
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

  // HTML içinden ```html ve ``` kalıntılarını temizle
  const rawHtml = post.html || "";
  const cleanHtml = rawHtml
    .replace(/```html/gi, "")
    .replace(/```/g, "")
    .trim();

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

        {/* Başlık */}
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

        {/* Görsel */}
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
          {cleanHtml ? (
            <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />
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
