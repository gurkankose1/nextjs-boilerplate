// app/blog/[slug]/page.tsx
// @ts-nocheck
import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";

export const revalidate = 300;

const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME && process.env.NEXT_PUBLIC_SITE_NAME.trim()
    ? process.env.NEXT_PUBLIC_SITE_NAME
    : "SkyNews.Tr";

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
    if (!slug || slug === "undefined" || slug === "null") {
      return null;
    }

    // 1) slug alanına göre ara
    const bySlug = await adminDb
      .collection("blog_posts")
      .where("slug", "==", slug)
      .limit(1)
      .get();

    if (!bySlug.empty) {
      return mapBlogDoc(bySlug.docs[0]);
    }

    // 2) Slug ile bulunamadıysa doc ID olma ihtimalini dene
    const byId = await adminDb.collection("blog_posts").doc(slug).get();
    if (byId.exists) {
      return mapBlogDoc(byId);
    }

    // 3) Bu slug için gerçekten kayıt yok
    return null;
  } catch (err) {
    console.error("Error fetching blog post:", err);
    return null;
  }
}

function formatDate(value: any) {
  if (!value) return null;

  try {
    let d: Date;

    // Firestore Timestamp ise
    if (value.toDate && typeof value.toDate === "function") {
      d = value.toDate();
    } else {
      d = new Date(value);
    }

    if (Number.isNaN(d.getTime())) return null;

    return d.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export default async function BlogDetailPage({
  params,
}: {
  params: { slug: string };
}) {
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
          <h1 className="mb-2 text-xl font-semibold text-slate-50">
            İçerik bulunamadı
          </h1>
          <p className="mb-2 text-sm text-slate-400">
            Bu slug için bir blog yazısı bulunamadı. Slug alanı mı, link mi
            yanlış bakmak lazım.
          </p>
          <p className="text-[11px] text-slate-500">
            Debug — slug: <code>{slug || "(boş)"}</code>
          </p>
        </div>
      </main>
    );
  }

  const published = formatDate(post.publishedAt);

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
          <span className="align-middle line-clamp-1 text-slate-300">
            {post.title}
          </span>
        </nav>

        {/* Başlık */}
        <header className="mb-6 border-b border-slate-800 pb-4">
          <p className="mb-1 text-[11px] uppercase tracking-[0.22em] text-sky-400">
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
              className="h-[320px] w-full rounded-xl object-cover object-center shadow-lg shadow-slate-900/50"
            />
          </div>
        ) : (
          <div className="mb-6 flex h-40 w-full items-center justify-center rounded-2xl border border-slate-800 bg-gradient-to-br from-sky-900/70 via-slate-900 to-slate-950">
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
