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
      title: (data.title as string) || (data.seoTitle as string) || "SkyNews Haberi",
      slug: (data.slug as string) || doc.id,
      metaDesc: (data.metaDesc as string | undefined) ?? null,
      category: (data.category as string | undefined) ?? null,
      publishedAt: toIsoString(data.publishedAt) ?? null,
    };
  });
}

// Kategori butonları için tanımlar (iç anahtar + ekranda görünen isim)
const CATEGORY_FILTERS = [
  { key: "all", label: "Tümü" },
  { key: "airlines", label: "Havayolları" },
  { key: "airports", label: "Havalimanları" },
  { key: "ground-handling", label: "Yer Hizmetleri" },
  { key: "accidents", label: "Uçak Kazaları" },
  { key: "military-aviation", label: "Askeri Havacılık" },
] as const;

type CategoryKey = (typeof CATEGORY_FILTERS)[number]["key"];

const CATEGORY_LABEL_MAP: Record<string, string> = CATEGORY_FILTERS.reduce(
  (acc, item) => {
    if (item.key !== "all") {
      acc[item.key] = item.label;
    }
    return acc;
  },
  {} as Record<string, string>
);

// Geçerli kategori anahtarlarını tutan set
const VALID_CATEGORY_KEYS = new Set<string>(
  CATEGORY_FILTERS.map((c) => c.key)
);

// Her request’te en güncel listeyi almak için
export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined;
    category?: string;
  };
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const articles = await getLatestArticles();

  const rawCategory = searchParams?.category;

  const activeCategory: CategoryKey =
    typeof rawCategory === "string" && VALID_CATEGORY_KEYS.has(rawCategory)
      ? (rawCategory as CategoryKey)
      : "all";

  const filteredArticles =
    activeCategory === "all"
      ? articles
      : articles.filter((article) => {
          const cat = (article.category ?? "").toLowerCase();
          return cat === activeCategory.toLowerCase();
        });

  const hero = filteredArticles[0];
  const rest = filteredArticles.slice(1);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8 md:px-8 lg:px-16">
      <div className="max-w-5xl mx-auto">
        {/* HEADER / BRAND BAR */}
        <header className="mb-6 border-b border-slate-800 pb-4 flex items-baseline justify-between gap-4">
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

        {/* KATEGORİ FİLTRE BAR */}
        <nav className="mb-8 overflow-x-auto">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80 min-w-max">
            {CATEGORY_FILTERS.map((cat) => {
              const isActive = activeCategory === cat.key;
              const href =
                cat.key === "all" ? "/" : `/?category=${encodeURIComponent(cat.key)}`;

              return (
                <Link
                  key={cat.key}
                  href={href}
                  className={[
                    "px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition",
                    isActive
                      ? "bg-sky-500 text-slate-950 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.45)]"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:border-sky-400/80 hover:text-sky-100",
                  ].join(" ")}
                >
                  {cat.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* HENÜZ HABER YOKSA */}
        {articles.length === 0 ? (
          <p className="text-slate-400">
            Henüz yayınlanmış haber yok. Studio &quot;Drafts&quot; bölümünden
            bir taslağı &quot;Publish&quot; ederek anasayfada görebilirsin.
          </p>
        ) : filteredArticles.length === 0 ? (
          <p className="text-slate-400">
            Bu kategoride henüz haber yok. Farklı bir kategori seçebilir veya
            &quot;Tümü&quot; sekmesine dönebilirsin.
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
                        {CATEGORY_LABEL_MAP[hero.category] ??
                          hero.category ??
                          "Havacılık"}
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
                  {rest.map((art) => {
                    const catLabel =
                      (art.category &&
                        (CATEGORY_LABEL_MAP[art.category] ?? art.category)) ||
                      "Havacılık";

                    return (
                      <Link
                        key={art.id}
                        href={`/news/${art.slug}`}
                        className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:border-sky-400/70 hover:bg-slate-900/80 transition flex flex-col gap-2"
                      >
                        <div className="text-xs text-sky-300/80">
                          {catLabel}
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
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
