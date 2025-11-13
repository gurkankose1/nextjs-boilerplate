// app/page.tsx
import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";

type ArticleCard = {
  id: string;
  title: string;
  slug: string;
  metaDesc?: string | null;
  category?: string | null;
  publishedAt?: string | null;
};

function toIsoString(value: unknown): string | null {
  if (!value) return null;

  // Firestore Timestamp (admin SDK) için
  if (typeof (value as any)?.toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (value instanceof Date) return value.toISOString();

  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

async function getLatestArticles(limit = 20): Promise<ArticleCard[]> {
  const snap = await adminDb
    .collection("articles")
    .orderBy("publishedAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;

    return {
      id: doc.id,
      title: (data.title as string) || "SkyNews Haberi",
      slug: (data.slug as string) || doc.id,
      metaDesc: (data.metaDesc as string | undefined) ?? null,
      category: (data.category as string | undefined) ?? null,
      publishedAt: toIsoString(data.publishedAt) ?? null,
    };
  });
}

// Her request’te en güncel listeyi almak için
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const articles = await getLatestArticles();

  const hero = articles[0];
  const rest = articles.slice(1);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8 md:px-8 lg:px-16">
      <div className="max-w-5xl mx-auto">
        {/* HEADER / BRAND BAR */}
        <header className="mb-8 border-b border-slate-800 pb-4 flex items-baseline justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              SkyNews.Tr
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Küresel havacılık gündemi, Türkçe ve teknik odaklı.
            </p>
          </div>
          <span className="text-xs uppercase tracking-[0.15em] text-sky-300/80">
            Beta
          </span>
        </header>

        {/* HENÜZ HABER YOKSA */}
        {articles.length === 0 ? (
          <p className="text-slate-400">
            Henüz yayınlanmış haber yok. Studio &quot;Drafts&quot; bölümünden
            bir taslağı &quot;Publish&quot; ederek anasayfada görebilirsin.
          </p>
        ) : (
          <>
            {/* HERO KART */}
            {hero && (
              <section className="mb-10">
                <Link
                  href={`/news/${hero.slug}`}
                  className="block rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 hover:border-sky-500/70 hover:shadow-[0_0_40px_rgba(56,189,248,0.25)] transition"
                >
                  <div className="text-xs uppercase tracking-[0.16em] text-sky-300/80 mb-2">
                    Öne çıkan haber
                  </div>
                  <h2 className="text-2xl md:text-3xl font-semibold leading-tight mb-3">
                    {hero.title}
                  </h2>

                  <div className="flex flex-wrap gap-3 items-center text-xs text-slate-400 mb-3">
                    {hero.category && (
                      <span className="px-2 py-1 rounded-full border border-slate-700/80">
                        {hero.category}
                      </span>
                    )}
                    {hero.publishedAt && (
                      <span>
                        {new Date(hero.publishedAt).toLocaleString("tr-TR")}
                      </span>
                    )}
                  </div>

                  {hero.metaDesc && (
                    <p className="text-sm text-slate-300">
                      {hero.metaDesc}
                    </p>
                  )}
                </Link>
              </section>
            )}

            {/* DİĞER HABERLER */}
            {rest.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-sm uppercase tracking-[0.16em] text-slate-400">
                  Son haberler
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rest.map((art) => (
                    <Link
                      key={art.id}
                      href={`/news/${art.slug}`}
                      className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:border-sky-400/70 hover:bg-slate-900/80 transition flex flex-col gap-2"
                    >
                      <div className="text-xs text-sky-300/80">
                        {art.category || "Havacılık"}
                      </div>
                      <h4 className="font-semibold leading-snug">
                        {art.title}
                      </h4>
                      {art.metaDesc && (
                        <p className="text-xs text-slate-300">
                          {art.metaDesc}
                        </p>
                      )}
                      {art.publishedAt && (
                        <div className="mt-auto text-[11px] text-slate-500">
                          {new Date(art.publishedAt).toLocaleString("tr-TR")}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
