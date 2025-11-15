// app/blog/page.tsx
// @ts-nocheck
import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";

export const revalidate = 300;

function mapBlogDoc(doc: any) {
  const data = doc.data() || {};

  return {
    id: doc.id,
    title: data.title || "Başlıksız yazı",
    slug: data.slug || doc.id,
    summary: data.summary || data.metaDesc || "",
    category: data.category || "Havacılık Terimi",
    mainImageUrl: data.mainImageUrl || null,
    createdAt: data.createdAt || data.publishedAt || null,
  };
}

async function getBlogPosts() {
  const snap = await adminDb
    .collection("blog_posts")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return snap.docs.map(mapBlogDoc);
}

function formatDate(value: any) {
  if (!value) return null;

  try {
    let d: Date;

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

export default async function BlogListPage() {
  const posts = await getBlogPosts();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">
        {/* Breadcrumb */}
        <nav className="mb-4 text-[11px] text-slate-500">
          <Link href="/" className="hover:text-sky-300">
            Ana sayfa
          </Link>
          <span className="mx-1">/</span>
          <span className="text-slate-300">Havacılık Terimleri</span>
        </nav>

        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            Havacılık Terimleri • Blog
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            PBB, pushback, GPU, PCA, taksi yolu, apron operasyonu… Tüm terimler
            tek bir yerde.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-sm text-slate-400">
            Henüz hiç blog yazısı bulunamadı. Cron-job.org üzerinden çalışan
            görev ilk yazıları oluşturduğunda bu sayfa dolacak.
          </p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {posts.map((post) => {
              const published = formatDate(post.createdAt);

              return (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug || post.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-4 transition hover:border-sky-500/70 hover:bg-slate-900"
                >
                  <div className="mb-3 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                    <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-[2px] uppercase tracking-[0.18em] text-sky-300">
                      {post.category}
                    </span>
                    {published && <span>{published}</span>}
                  </div>

                  <h2 className="mb-2 line-clamp-2 text-sm font-semibold text-slate-50 group-hover:text-sky-300">
                    {post.title}
                  </h2>

                  {post.summary && (
                    <p className="mb-3 line-clamp-3 text-xs text-slate-400">
                      {post.summary}
                    </p>
                  )}

                  <span className="mt-auto text-[11px] font-medium text-sky-300">
                    Devamını oku →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
