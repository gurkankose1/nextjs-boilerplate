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
  seoTitle?: string | null;
  views?: number | null;
  editorName?: string | null;
  mainImageUrl?: string | null;
};

type GundemMessage = {
  id: string;
  displayName: string;
  company?: string | null;
  message: string;
  createdAt: string | null;
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

const VALID_CATEGORIES = new Set<string>(
  CATEGORY_FILTERS.map((c) => c.key).filter((k) => k !== "all")
);

function normalizeCategory(cat: string | null | undefined): CategoryKey {
  if (!cat) return "all";
  if (VALID_CATEGORIES.has(cat)) {
    return cat as CategoryKey;
  }
  return "all";
}

function getEditorName(category: string | null | undefined): string {
  switch (category) {
    case "airlines":
      return "Metehan Özülkü";
    case "airports":
      return "Kemal Kahraman";
    case "ground-handling":
      return "Hafife Kandemir";
    case "military-aviation":
      return "Musa Demirbilek";
    case "accidents":
      return "Editör Ekibi";
    default:
      return "Editör Ekibi";
  }
}

async function getArticlesAndGundemMessages() {
  const articlesSnap = await adminDb
    .collection("articles")
    .orderBy("publishedAt", "desc")
    .limit(32)
    .get();

  const articles: ArticleCard[] = articlesSnap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      title: data.title || data.seoTitle || "Başlıksız Haber",
      slug: data.slug || doc.id,
      metaDesc: data.metaDesc ?? null,
      category: normalizeCategory(data.category ?? null),
      publishedAt: data.publishedAt ?? null,
      seoTitle: data.seoTitle ?? null,
      views: typeof data.views === "number" ? data.views : 0,
      editorName: getEditorName(data.category ?? null),
      mainImageUrl: data.mainImageUrl ?? null,
    };
  });

  const gundemSnap = await adminDb
    .collection("gundem_messages")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  const latestGundemMessages: GundemMessage[] = gundemSnap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      displayName: data.displayName || "Anonim",
      company: data.company || null,
      message: data.message || "",
      createdAt: data.createdAt || null,
    };
  });

  return { articles, latestGundemMessages };
}

export const revalidate = 60;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const categoryParam =
    typeof searchParams?.category === "string"
      ? (searchParams.category as CategoryKey)
      : "all";

  const activeCategory: CategoryKey = (CATEGORY_FILTERS.some(
    (c) => c.key === categoryParam
  )
    ? categoryParam
    : "all") as CategoryKey;

  const { articles, latestGundemMessages } = await getArticlesAndGundemMessages();

  const now = Date.now();
  const recentCutoff = now - 24 * 60 * 60 * 1000;

  const heroArticle =
    articles.find((art) => {
      if (!art.publishedAt) return false;
      const publishedTime = new Date(art.publishedAt).getTime();
      const hoursDiff = (now - publishedTime) / (1000 * 60 * 60);
      return (
        publishedTime >= recentCutoff &&
        (["airlines", "airports", "ground-handling"] as CategoryKey[]).includes(
          normalizeCategory(art.category)
        ) &&
        hoursDiff > 0
      );
    }) ?? articles[0];

  const filteredArticles =
    activeCategory === "all"
      ? articles
      : articles.filter(
          (art) => normalizeCategory(art.category) === activeCategory
        );

  const mostReadArticles = [...articles]
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 8);

  const categoryCounts: Record<string, number> = {};
  for (const art of articles) {
    const cat = normalizeCategory(art.category);
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  const headlineSuffix =
    activeCategory === "all"
      ? "Günün öne çıkan havacılık manşetleri"
      : `${CATEGORY_LABEL_MAP[activeCategory]} kategorisinde öne çıkan manşetler`;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-6 lg:flex-row">
        <div className="flex-1 space-y-6">
          <header className="border-b border-slate-800 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
                  {SITE_NAME}
                </h1>
                <p className="text-xs text-slate-400 sm:text-sm">
                  Dünyanın dört bir yanından havacılık haberleri, Türk
                  havacılığına odaklı editör kadrosu ile.
                </p>
              </div>
              <div className="flex gap-2 text-[11px] text-slate-400">
  <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1">
    Canlı akış • RSS + Gemini
  </span>
  <span className="rounded-full border border-slate-700 px-2 py-1">
    Editörlü içerik
  </span>
  <Link
    href="/blog"
    className="rounded-full border border-slate-700 px-2 py-1 hover:border-sky-500 hover:text-sky-200 transition"
  >
    Havacılık Terimleri / Blog
  </Link>
</div>


            <nav className="mt-4 flex flex-wrap gap-2 text-xs">
              {CATEGORY_FILTERS.map((item) => {
                const isActive = activeCategory === item.key;
                const baseHref =
                  item.key === "all"
                    ? "/"
                    : `/?${new URLSearchParams({
                        category: item.key,
                      }).toString()}`;
                return (
                  <Link
                    key={item.key}
                    href={baseHref}
                    className={[
                      "rounded-full border px-3 py-1 transition",
                      isActive
                        ? "border-sky-500 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-200",
                    ].join(" ")}
                  >
                    {item.label}
                    {item.key !== "all" &&
                      typeof categoryCounts[item.key] === "number" &&
                      categoryCounts[item.key] > 0 && (
                        <span className="ml-1 text-[10px] text-slate-400">
                          {categoryCounts[item.key]}
                        </span>
                      )}
                  </Link>
                );
              })}
            </nav>
          </header>

          {heroArticle && (
            <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)]">
              <Link
                href={`/news/${encodeURIComponent(
                  heroArticle.slug
                )}?id=${encodeURIComponent(heroArticle.id)}`}
                className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#0ea5e980,_transparent_60%)] opacity-40" />
                <div className="relative z-10 flex h-full flex-col">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">
                    Manşet •{" "}
                    {heroArticle.category && CATEGORY_LABEL_MAP[heroArticle.category]
                      ? CATEGORY_LABEL_MAP[heroArticle.category]
                      : "Havacılık"}
                  </p>
                  <h2 className="mb-2 text-lg font-semibold leading-snug text-slate-50 sm:text-xl">
                    {heroArticle.seoTitle || heroArticle.title}
                  </h2>
                  {heroArticle.metaDesc && (
                    <p className="mb-3 text-sm text-slate-200">
                      {heroArticle.metaDesc}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span>{heroArticle.editorName}</span>
                    {heroArticle.publishedAt && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-slate-500" />
                        <span>
                          {new Date(
                            heroArticle.publishedAt
                          ).toLocaleString("tr-TR")}
                        </span>
                      </>
                    )}
                    {typeof heroArticle.views === "number" && (
                      <>
                        <span className="h-1 w-1 rounded-full bg-slate-500" />
                        <span>
                          {heroArticle.views.toLocaleString("tr-TR")} okuma
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>

              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <p className="text-xs font-medium text-slate-300">
                  {headlineSuffix}
                </p>
                <ul className="space-y-2 text-xs">
                  {articles.slice(0, 6).map((art) => (
                    <li key={art.id} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" />
                      <div className="flex-1">
                        <Link
                          href={`/news/${encodeURIComponent(
                            art.slug
                          )}?id=${encodeURIComponent(art.id)}`}
                          className="font-medium text-slate-100 hover:text-sky-300"
                        >
                          {art.title}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                          {art.category && CATEGORY_LABEL_MAP[art.category] && (
                            <span>{CATEGORY_LABEL_MAP[art.category]}</span>
                          )}
                          {art.publishedAt && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-slate-600" />
                              <span>
                                {new Date(
                                  art.publishedAt
                                ).toLocaleTimeString("tr-TR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section className="mt-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
                Son Haberler
              </h2>
              <p className="text-[11px] text-slate-500">
                {activeCategory === "all"
                  ? "Tüm kategorilerden en güncel başlıklar"
                  : `${CATEGORY_LABEL_MAP[activeCategory]} kategorisinden son gelişmeler`}
              </p>
            </div>

            {filteredArticles.length === 0 ? (
              <p className="text-xs text-slate-400">
                Bu kategori için henüz haber bulunamadı. Editörlerimiz kısa
                süre içinde yeni içerikler ekleyecek.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredArticles.map((art) => {
                  const categoryLabel =
                    CATEGORY_LABEL_MAP[normalizeCategory(art.category)] ||
                    "Havacılık";

                  return (
                    <Link
                      key={art.id}
                      href={`/news/${encodeURIComponent(
                        art.slug
                      )}?id=${encodeURIComponent(art.id)}`}
                      className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3 transition hover:border-sky-500/70 hover:bg-slate-900"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="rounded-full border border-sky-500/50 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-sky-300">
                          {categoryLabel}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {art.editorName}
                        </span>
                      </div>
                      <h3 className="mb-1 text-sm font-semibold text-slate-50 group-hover:text-sky-200">
                        {art.title}
                      </h3>
                      {art.metaDesc && (
                        <p className="mb-2 line-clamp-2 text-[11px] text-slate-300">
                          {art.metaDesc}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                        {art.publishedAt && (
                          <span>
                            {new Date(art.publishedAt).toLocaleString("tr-TR", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                        )}
                        {typeof art.views === "number" && art.views > 0 && (
                          <>
                            <span className="h-1 w-1 rounded-full bg-slate-600" />
                            <span>
                              {art.views.toLocaleString("tr-TR")} okuma
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* GÜNDEM HAVACILIK – KOMPAKT BLOK (ORTA SÜTUN) */}
            {latestGundemMessages.length > 0 && (
              <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-xs font-semibold tracking-[0.18em] text-sky-300 uppercase">
                      Gündem Havacılık
                    </h3>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Çalışanların sesi, havacılığın nabzı. Son yorumlardan
                      öne çıkanlar:
                    </p>
                  </div>
                  <Link
                    href="/gundem"
                    className="text-[11px] text-sky-300 hover:text-sky-200 border border-sky-500/60 rounded-full px-3 py-1 ml-2"
                  >
                    Gündeme Katıl
                  </Link>
                </div>

                <ul className="space-y-1.5">
                  {latestGundemMessages.slice(0, 4).map((m) => (
                    <li
                      key={m.id}
                      className="text-[11px] text-slate-200 flex gap-2"
                    >
                      <span className="font-semibold text-sky-300">
                        {m.displayName}
                        {m.company ? (
                          <span className="text-slate-400">
                            {" "}
                            · {m.company}
                          </span>
                        ) : null}
                        :
                      </span>
                      <span className="line-clamp-2 text-[11px] text-slate-200">
                        {m.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </section>
        </div>

        {/* SAĞ KOLON: EN ÇOK OKUNANLAR + HAFTANIN ANKETİ + GÜNDEM ÖZET */}
        {articles.length > 0 && (
          <div className="w-full max-w-xs shrink-0 space-y-4 lg:max-w-sm">
            {/* SAĞ KOLON: EN ÇOK OKUNANLAR + HAFTANIN ANKETİ */}
            <aside className="space-y-4">
              {/* EN ÇOK OKUNANLAR */}
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

              {/* HAFTANIN ANKETİ – TASARIM İSKELETİ */}
              <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <h3 className="text-sm uppercase tracking-[0.16em] text-slate-300 mb-1">
                  Haftanın Anketi
                </h3>
                <p className="text-[11px] text-slate-400 mb-3">
                  Bu alan şimdilik sadece tasarım amacıyla sahte veri kullanıyor.
                  Anket backend&apos;e bağlandığında otomatik güncellenecek.
                </p>

                <p className="text-xs font-medium text-slate-200 mb-3">
                  Bu hafta havacılık gündeminde sizi en çok hangi başlık
                  ilgilendiriyor?
                </p>

                <form className="space-y-1.5">
                  {[
                    "Yeni uçak siparişleri",
                    "Havalimanı operasyonları",
                    "Askeri havacılık gelişmeleri",
                    "Kaza / olay raporları",
                  ].map((opt, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-2 text-[11px] text-slate-200"
                    >
                      <input
                        type="radio"
                        name="weekly-poll-preview"
                        className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                        disabled
                      />
                      <span>{opt}</span>
                    </label>
                  ))}

                  <button
                    type="button"
                    disabled
                    className="mt-2 w-full rounded-full bg-slate-800 text-[11px] font-semibold text-slate-400 py-2 border border-slate-700 cursor-not-allowed"
                  >
                    Yakında oy kullanabileceksiniz
                  </button>
                </form>

                <p className="mt-2 text-[10px] text-slate-500">
                  Anket detayları ve önceki haftaların sonuçları için{" "}
                  <Link
                    href="/gundem"
                    className="underline underline-offset-2 text-sky-300 hover:text-sky-200"
                  >
                    Gündem Havacılık
                  </Link>{" "}
                  sayfasına göz atın.
                </p>
              </section>

              {/* GÜNDEM HAVACILIK – ÖZET KUTUSU (KARE) */}
              <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                <h3 className="text-sm uppercase tracking-[0.16em] text-slate-300 mb-1">
                  Gündem Havacılık
                </h3>
                <p className="text-[11px] text-slate-400 mb-3">
                  SkyNews.Tr okurları havacılık gündemini burada tartışıyor.
                  Aşağıda son mesajlardan kısa bir özet görüyorsunuz.
                </p>

                <div className="space-y-2">
                  {[
                    {
                      displayName: "Rampçı34",
                      company: "Yer Hizmeti",
                      message:
                        "Sabah saatlerinde yoğun sis operasyonu bayağı zorladı, sizde durum nasıldı?",
                    },
                    {
                      displayName: "ATCspotter",
                      company: "ATC Adayı",
                      message:
                        "Yeni yayınlanan NOTAM hakkında ne düşünüyorsunuz, özellikle geceleri trafik akışı etkilenir mi?",
                    },
                    {
                      displayName: "TechOpsTR",
                      company: "Bakım",
                      message:
                        "Line maintenance ekipleri için nöbet düzeni konuşalım mı, çoğu havalimanında aynı sorunlar var.",
                    },
                  ].map((msg, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-800/60 bg-slate-950/40 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-semibold text-sky-300">
                          {msg.displayName}
                        </span>
                        {msg.company && (
                          <span className="text-[10px] text-slate-500">
                            {msg.company}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-200 line-clamp-2">
                        {msg.message}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="mt-3 w-full rounded-full border border-slate-700 bg-slate-900/60 py-2 text-[11px] font-semibold text-sky-300 hover:bg-slate-800/80 transition"
                >
                  Gündeme katılmak için /gundem sayfasına git
                </button>
              </section>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
