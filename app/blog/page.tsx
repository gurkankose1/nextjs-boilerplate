// app/blog/page.tsx
import { adminDb } from "@/lib/firebaseAdmin";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  summary?: string;
  publishedDate?: string;
  publishedAt?: string;
  termKey?: string;
};

export default async function BlogListPage() {
  let posts: BlogPost[] = [];

  try {
    const snap = await adminDb
      .collection("blog_posts")
      .orderBy("publishedAt", "desc")
      .limit(20)
      .get();

    posts = snap.docs.map((doc) => {
      const data = doc.data() as Omit<BlogPost, "id">;
      return {
        id: doc.id,
        ...data,
      };
    });
  } catch (err) {
    console.error("BLOG LIST FIRESTORE ERROR:", err);
    posts = [];
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-4 text-sm text-slate-400">
          <Link href="/" className="hover:text-sky-400">
            Ana sayfa
          </Link>
          <span className="mx-1">/</span>
          <span className="text-slate-300">Havacılık Terimleri</span>
        </div>

        <h1 className="mb-6 text-2xl font-semibold tracking-tight sm:text-3xl">
          Havacılık Terimleri Blogu
        </h1>

        {posts.length === 0 ? (
          <p className="text-slate-300">
            Henüz oluşturulmuş bir terim yazısı yok. Cron job çalıştığında burada görünecek.
          </p>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const published =
                post.publishedDate ||
                (post.publishedAt ? post.publishedAt.slice(0, 10) : undefined);

              // Detay sayfasına link:
              // slug + id query paramını birlikte gönderiyoruz
              const href = `/blog/${encodeURIComponent(
                post.slug
              )}?id=${encodeURIComponent(post.id)}`;

              return (
                <Link
                  key={post.id}
                  href={href}
                  className="block rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:border-sky-500/70 hover:bg-slate-900/70 transition"
                >
                  <h2 className="text-lg font-semibold">{post.title}</h2>
                  {published && (
                    <p className="text-xs text-slate-400">
                      Yayın tarihi: <time dateTime={published}>{published}</time>
                    </p>
                  )}
                  {post.summary && (
                    <p className="mt-2 text-sm text-slate-300">
                      {post.summary}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
