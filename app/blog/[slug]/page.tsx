// app/blog/[slug]/page.tsx
import { adminDb } from "@/lib/firebaseAdmin";
import Link from "next/link";
import { notFound } from "next/navigation";

type BlogPost = {
  title: string;
  slug: string;
  summary?: string;
  html?: string;
  mainImageUrl?: string | null;
  publishedAt?: string;
  publishedDate?: string;
  termKey?: string;
};

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  // 1) Firestore'dan slug'a göre doğru dokümanı çek
  const snap = await adminDb
    .collection("blog_posts")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snap.empty) {
    // Slug yanlışsa 404
    notFound();
  }

  const doc = snap.docs[0];
  const data = doc.data() as BlogPost;

  // 2) HTML içeriği al, varsa <body> sarmalayıcısını temizle
  let html = data.html || "";
  html = html.replace(/<\/?body[^>]*>/gi, "").trim();

  const published =
    data.publishedDate ||
    (data.publishedAt ? data.publishedAt.slice(0, 10) : undefined);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-4 text-sm text-slate-400">
          <Link href="/" className="hover:text-sky-400">
            Ana sayfa
          </Link>
          <span className="mx-1">/</span>
          <Link href="/blog" className="hover:text-sky-400">
            Havacılık Terimleri
          </Link>
          <span className="mx-1">/</span>
          <span className="text-slate-300">İçerik</span>
        </div>

        {/* Başlık + tarih */}
        <header className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {data.title}
          </h1>
          {published && (
            <p className="text-sm text-slate-400">
              Yayın tarihi:{" "}
              <time dateTime={published}>
                {published}
              </time>
            </p>
          )}
          {data.summary && (
            <p className="text-sm text-slate-300">
              {data.summary}
            </p>
          )}
        </header>

        {/* Görsel */}
        {data.mainImageUrl && (
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
            <img
              src={data.mainImageUrl}
              alt={data.title}
              className="w-full h-[320px] object-cover object-center"
            />
          </div>
        )}

        {/* İçerik */}
        <article className="space-y-4 leading-relaxed text-slate-200">
          {html ? (
            <div
              className="[&>p]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>li]:mb-1"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <p>Bu terim için içerik bulunamadı.</p>
          )}
        </article>
      </div>
    </main>
  );
}
