// app/blog/[slug]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
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

async function getBlogPost(slug: string, idFromQuery?: string | null) {
  // Önce query string'den gelen id ile dene
  if (idFromQuery) {
    const doc = await adminDb.collection("blog_posts").doc(idFromQuery).get();
    if (doc.exists) {
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
      } as BlogPost;
    }
  }

  // Id yoksa veya bulunamazsa slug ile ara
  const snap = await adminDb
    .collection("blog_posts")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snap.empty) {
    return null;
  }

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
  } as BlogPost;
}

export const revalidate = 300;

export default async function BlogDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { id?: string };
}) {
  const slug = params.slug;
  const idFromQuery = searchParams?.id ?? null;

  const post = await getBlogPost(slug, idFromQuery);

  if (!post) {
    notFound();
  }

  const published =
    post.publishedAt &&
    !Number.isNaN(new Date(post.publishedAt).getTime())
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
              className="h-56 w-full object-cover"
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
