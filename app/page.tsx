// app/page.tsx
import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";

const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME && process.env.NEXT_PUBLIC_SITE_NAME.trim()
    ? process.env.NEXT_PUBLIC_SITE_NAME
    : "SkyNews.Tr";

type ArticleCard = {
  id: string;
  title: string;
  slug: string;
  metaDesc?: string | null;
  category?: string | null;
  publishedAt?: string | null;
  views?: number | null;
};

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

const VALID_CATEGORY_KEYS = new Set<string>(
  CATEGORY_FILTERS.map((c) => c.key)
);

const CATEGORY_EDITOR_MAP: Record<string, string> = {
  airlines: "Metehan Özülkü",
  airports: "Kemal Kahraman",
  "ground-handling": "Hafife Kandemir",
  "military-aviation": "Musa Demirbilek",
  accidents: "Editör Ekibi",
};

function toIsoString(value: unknown): string | null {
  if (!value) return null;

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

async function getLatestArticles(limit = 40): Promise<ArticleCard[]> {
  const snap = await adminDb
    .collection("articles")
    .orderBy("publishedAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;

    return {
      id: doc.id,
      title:
        (data.title as string) ||
        (data.seoTitle as string) ||
        "Havacılık Haberi",
      slug: (data.slug as string) || doc.id,
      metaDesc: (data.metaDesc as string | undefined) ?? null,
      category: (data.category as string | undefined) ?? null,
      publishedAt: toIsoString(data.publishedAt) ?? null,
      views:
        typeof data.views === "number"
          ? (data.views as number)
          : 0,
    };
  });
}

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

  const mostReadArticles = [...articles]
    .sort((a, b) => {
      const va = a.views ?? 0;
      const vb = b.views ?? 0;
      if (va === vb) {
        const da = a.publishedAt ?? "";
        const db = b.publishedAt ?? "";
        return db.localeCompare(da);
      }
      return vb - va;
    })
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-6 md:px-8 lg:px-16">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ÜST HEADER + NAV */}
        <header className="border-b border-slate-800 pb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              {SITE_NAME}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Dünyanın dört bir yanından havacılık haberleri. Tam zamanlı editör
              kadromuzla 7/24 yayındayız.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-full border border-slate-700 bg-slate-900 hover:border-sky-400/80 hover:text-sky-100 transition"
            >
              Haberler
            </Link>
            <span className="px-3 py-1.5 rounded-full border border-slate-800 text-slate-400 text-[11px] md:text-xs">
              Köşe Yazıları (yakında)
            </span>
            <span className="px-3 py-1.5 rounded-full border border-slate-800 text-slate-400 text-[11px] md:text-xs">
              Analiz &amp; Dosya (yakında)
            </span>
          </nav>
        </header>

        {/* KATEGORİ FİLTRE BAR */}
        <nav className="overflow-x-auto">
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

        {/* İÇERİK ALANI */}
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
          <div className="lg:grid lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)] lg:gap-8 lg:items-start">
            {/* SOL KOLON: HERO + LİSTE */}
            <div className="space-y-8 mb-8 lg:mb-0">
              {/* HERO KART */}
              {hero && (
                <section>
                  <Link
                    href={`/news/${encodeURIComponent(
                      hero.slug
                    )}?id=${encodeURIComponent(hero.id)}`}
                    className="block rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-6 hover:border-sky-500/70 hover:shadow-[0_0_40px_rgba(56,189,248,0.25)] transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="text-xs uppercase tracking-[0.16em] text-sky-300/80">
                        Öne çıkan haber
                      </div>
                      {hero.category && (
                        <div className="text-[11px] text-slate-400">
                          Editör:{" "}
                          {CATEGORY_EDITOR_MAP[hero.category] ?? "Editör Ekibi"}
                        </div>
                      )}
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
                          href={`/news/${encodeURIComponent(
                            art.slug
                          )}?id=${encodeURIComponent(art.id)}`}
                          className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:border-sky-400/70 hover:bg-slate-900/80 transition flex flex-col gap-2"
                        >
                          <div className="text-xs text-sky-300/80 flex items-center justify-between gap-2">
                            <span>{catLabel}</span>
                            {art.category && (
                              <span className="text-[10px] text-slate-400">
                                {CATEGORY_EDITOR_MAP[art.category] ??
                                  "Editör Ekibi"}
                              </span>
                            )}
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
                              {new Date(art.publishedAt).toLocaleString(
                                "tr-TR"
                              )}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* SAĞ KOLON: EN ÇOK OKUNANLAR */}
            <aside className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <h3 className="text-sm uppercase tracking-[0.16em] text-slate-300 mb-3">
                  En çok okunan haberler
                </h3>
                {mostReadArticles.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Henüz okunma verisi yok. Haberler okundukça bu alan
                    otomatik dolacak. Şimdilik en güncel haberler öne çıkıyor.
                  </p>
                ) : (
                  <ol className="space-y-2 text-sm">
                    {mostReadArticles.map((art, index) => (
                      <li key={art.id} className="flex gap-2">
                        <span className="text-xs text-slate-500 mt-0.5 w-4 text-right">
                          {index + 1}.
                        </span>
                        <div className="flex-1">
                          <Link
                            href={`/news/${encodeURIComponent(
                              art.slug
                            )}?id=${encodeURIComponent(art.id)}`}
                            className="hover:text-sky-300 transition inline-block"
                          >
                            {art.title}
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span>
                              {(art.views ?? 0).toLocaleString("tr-TR")} okuma
                            </span>
                            {art.publishedAt && (
                              <span>
                                {new Date(
                                  art.publishedAt
                                ).toLocaleDateString("tr-TR")}
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
