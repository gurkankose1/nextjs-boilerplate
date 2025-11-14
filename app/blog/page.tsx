// app/blog/page.tsx
import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  publishedAt?: string | null;
  seoTitle?: string | null;
  metaDesc?: string | null;
};

const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME && process.env.NEXT_PUBLIC_SITE_NAME.trim()
    ? process.env.NEXT_PUBLIC_SITE_NAME
    : "SkyNews.Tr";

export const revalidate = 120;

async function getBlogPosts(): Promise<BlogPost[]> {
  const snap = await adminDb
    .collection("blog_posts")
    .orderBy("publishedAt", "desc")
    .limit(40)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      title: data.title || "Başlıksız yazı",
      slug: data.slug || doc.id,
      summary: data.summary || data.metaDesc || null,
      publishedAt: data.publishedAt || null,
      seoTitle: data.seoTitle || null,
      metaDesc: data.metaDesc || null,
    };
  });
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">
        {/* ÜST BAŞLIK */}
        <header className="border-b border-slate-800 pb-4 mb-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-sky-400 mb-1">
            Havacılık Terimleri • Blog
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
            {SITE_NAME} Havacılık Terimleri ve Bilgi Köşesi
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Her gün havacılıkla ilgili bir kavramı sade ve teknik olarak doğru
            biçimde açıklayan kısa yazılar: pushback nedir, ATC ne iş yapar,
            PBB nasıl çalışır, uçaklarda denge ve ağırlık merkezi, slot,
            NOTAM, SID/STAR, daha fazlası...
          </p>
        </header>

        {/* LİSTE */}
        {posts.length === 0 ? (
          <p className="text-xs text-slate-400">
            Henüz blog yazısı bulunmuyor. Otomatik terim üretimi devreye
            alındığında bu sayfa her gün yeni bir içerikle güncellenecek.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${encodeURIComponent(post.slug)}?id=${encodeURIComponent(
                  post.id
                )}`}
                className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition hover:border-sky-500/70 hover:bg-slate-900"
              >
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="rounded-full border border-sky-500/50 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-sky-300">
                      Havacılık Terimi
                    </span>
                    {post.publishedAt && (
                      <span className="text-[10px] text-slate-500">
                        {new Date(post.publishedAt).toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                  <h2 className="mb-1 text-sm font-semibold text-slate-50 group-hover:text-sky-200">
                    {post.title}
                  </h2>
                  {post.summary && (
                    <p className="text-[11px] text-slate-300 line-clamp-3">
                      {post.summary}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
