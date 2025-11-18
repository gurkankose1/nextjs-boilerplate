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

type PollOption = {
  id: string;
  text: string;
  votes: number;
};

type Poll = {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
};

type CategoryKey =
  | "all"
  | "airlines"
  | "airports"
  | "ground-handling"
  | "military-aviation"
  | "accidents";

const CATEGORY_FILTERS: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "airlines", label: "Havayolları" },
  { key: "airports", label: "Havalimanları" },
  { key: "ground-handling", label: "Yer Hizmetleri" },
  { key: "military-aviation", label: "Askerî Havacılık" },
  { key: "accidents", label: "Kaza / Olay" },
];

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

function normalizeCategory(category: string | null | undefined): CategoryKey {
  if (!category) return "all";
  const lower = String(category).trim().toLowerCase();
  if (VALID_CATEGORIES.has(lower)) {
    return lower as CategoryKey;
  }
  return "all";
}

function getEditorName(category: string | null | undefined): string {
  const normalized = normalizeCategory(category);
  switch (normalized) {
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
    .orderBy("createdAt", "desc")
    .limit(32)
    .get();

  const articles: ArticleCard[] = articlesSnap.docs.map((doc) => {
    const data = doc.data() || {};

    const rawPublished =
      data.publishedAt ?? data.published ?? data.createdAt ?? null;

    let publishedAt: string | null = null;
    if (rawPublished) {
      if (typeof rawPublished === "string") {
        publishedAt = rawPublished;
      } else if (rawPublished instanceof Date) {
        publishedAt = rawPublished.toISOString();
      } else if (typeof (rawPublished as any).toDate === "function") {
        publishedAt = (rawPublished as any).toDate().toISOString();
      } else {
        publishedAt = String(rawPublished);
      }
    }

    return {
      id: doc.id,
      title: data.title || data.seoTitle || "Başlıksız Haber",
      slug: data.slug || doc.id,
      metaDesc: data.metaDesc ?? data.summary ?? null,
      category: normalizeCategory(data.category ?? null),
      publishedAt,
      seoTitle: data.seoTitle ?? null,
      views: typeof data.views === "number" ? data.views : 0,
      editorName: getEditorName(data.category ?? null),
      mainImageUrl: data.mainImageUrl ?? null,
    };
  });

  const gundemSnap = await adminDb
    .collection("gundem_messages")
    .orderBy("createdAt", "desc")
    .limit(20)
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

  // Aktif anketi çek (polls koleksiyonu varsayımı)
  let activePoll: Poll | null = null;

  try {
    const pollSnap = await adminDb
      .collection("polls")
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();

    if (!pollSnap.empty) {
      const pollDoc = pollSnap.docs[0];
      const data = pollDoc.data() || {};
      const optionsRaw: any[] = Array.isArray(data.options)
        ? data.options
        : [];

      const options: PollOption[] = optionsRaw.map((opt, index) => ({
        id: opt.id ?? String(index),
        text: opt.text ?? "Seçenek",
        votes: typeof opt.votes === "number" ? opt.votes : 0,
      }));

      const totalVotes = options.reduce(
        (sum, o) => sum + (o.votes || 0),
        0
      );

      activePoll = {
        id: pollDoc.id,
        question: data.question || "Bu haftanın anketi",
        options,
        totalVotes,
      };
    }
  } catch (_e) {
    // polls koleksiyonu yoksa / index yoksa sessizce yoksay
    activePoll = null;
  }

  return { articles, latestGundemMessages, activePoll };
}

export const revalidate = 60;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const categoryParam =
    typeof searchParams?.category === "string"
      ? searchParams.category
      : undefined;

  const activeCategory: CategoryKey = (CATEGORY_FILTERS.some(
    (c) => c.key === categoryParam
  )
    ? categoryParam
    : "all") as CategoryKey;

  const { articles, latestGundemMessages, activePoll } =
    await getArticlesAndGundemMessages();

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
    .slice(0, 5);

  const heroPublishedDate = heroArticle?.publishedAt
    ? new Date(heroArticle.publishedAt)
    : null;

  const tickerArticles = articles.slice(0, 5);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* ÜST SABİT HEADER + NAV + KAYAN HABERLER */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/40">
              <span className="text-xs font-bold text-sky-400">SKY</span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-50">
                {SITE_NAME}
              </span>
              <span className="text-[10px] uppercase tracking-[0.28em] text-slate-400">
                Aviation News
              </span>
            </div>
          </Link>
          <nav className="hidden items-center gap-5 text-xs font-medium text-slate-300 sm:flex">
            <Link href="/" className="hover:text-sky-300">
              Haberler
            </Link>
            <Link href="/gundem" className="hover:text-sky-300">
              Gündem Havacılık
            </Link>
            <Link href="/kategori/turkiye" className="hover:text-sky-300">
              Türk Havacılığı
            </Link>
            <Link href="/admin" className="text-slate-500 hover:text-sky-300">
              Admin Panel
            </Link>
          </nav>
        </div>

        {/* KAYAN HABER ŞERİDİ */}
        {tickerArticles.length > 0 && (
          <div className="border-t border-slate-800 bg-slate-900/90">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-xs">
              <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-50">
                Son Haberler
              </span>
              <div className="relative flex-1 overflow-hidden">
                <div className="marquee whitespace-nowrap">
                  {tickerArticles.map((art, idx) => {
                    const href = `/news/${encodeURIComponent(
                      art.slug
                    )}?id=${encodeURIComponent(art.id)}`;
                    const dateText = art.publishedAt
                      ? new Date(art.publishedAt).toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "";
                    return (
                      <Link
                        key={art.id}
                        href={href}
                        className="mr-8 inline-flex items-center gap-2 text-slate-200 hover:text-sky-300"
                      >
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                          {idx + 1}
                        </span>
                        <span className="max-w-xs truncate">
                          {art.title}
                        </span>
                        {dateText && (
                          <span className="text-[10px] text-slate-400">
                            {dateText}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ORTA BÖLÜM: HERO + LİSTE + SAĞDA EN ÇOK OKUNANLAR + ANKET */}
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row lg:py-10">
        {/* Sol taraf: Hero + filtre + liste */}
        <div className="flex-1 space-y-6">
          <header className="border-b border-slate-800 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs text-slate-400 sm:text-sm">
                  Dünyanın dört bir yanından havacılık haberleri, Türk
                  havacılığına odaklı editör kadrosu ile.
                </p>
              </div>
              <div className="flex gap-2 text-[11px] text-slate-400">
                <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1">
                  Canlı akış • RSS + Gemini
                </span>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1">
                  Önce Türk havacılığı
                </span>
              </div>
            </div>

            <nav className="mt-4 flex flex-wrap gap-2 text-xs">
              {CATEGORY_FILTERS.map((item) => {
                const isActive = item.key === activeCategory;
                return (
                  <Link
                    key={item.key}
                    href={
                      item.key === "all"
                        ? "/"
                        : `/?category=${encodeURIComponent(item.key)}`
                    }
                    className={[
                      "rounded-full border px-3 py-1 transition",
                      isActive
                        ? "border-sky-500 bg-sky-500/20 text-sky-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-100",
                    ].join(" ")}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          {/* Hero Kart */}
          {heroArticle && (
            <section className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 shadow-lg">
              <Link
                href={`/news/${encodeURIComponent(
                  heroArticle.slug
                )}?id=${encodeURIComponent(heroArticle.id)}`}
                className="group flex flex-col md:flex-row"
              >
                <div className="flex-1 space-y-3 p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    {heroArticle.category && (
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 uppercase tracking-wide">
                        {CATEGORY_LABEL_MAP[heroArticle.category] ??
                          heroArticle.category}
                      </span>
                    )}
                    {heroPublishedDate && (
                      <span>
                        {heroPublishedDate.toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    <span>Yazar: {heroArticle.editorName ?? "Editör"}</span>
                  </div>
                  <h2 className="text-lg font-semibold leading-tight text-slate-50 md:text-xl">
                    {heroArticle.title}
                  </h2>
                  {heroArticle.metaDesc && (
                    <p className="text-sm text-slate-300 line-clamp-3">
                      {heroArticle.metaDesc}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Öne çıkan haber
                    </span>
                    <span>Detayları oku →</span>
                  </div>
                </div>
                {heroArticle.mainImageUrl && (
                  <div className="relative h-48 w-full overflow-hidden border-t border-slate-800 md:h-auto md:w-64 md:border-l">
                    <img
                      src={heroArticle.mainImageUrl}
                      alt={heroArticle.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  </div>
                )}
              </Link>
            </section>
          )}

          {/* Liste */}
          <section className="mt-6 space-y-4">
            {filteredArticles.map((art) => {
              const publishedDate = art.publishedAt
                ? new Date(art.publishedAt)
                : null;
              const articleHref = `/news/${encodeURIComponent(
                art.slug
              )}?id=${encodeURIComponent(art.id)}`;

              return (
                <article
                  key={art.id}
                  className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-3 transition hover:border-sky-500/60 hover:bg-slate-950"
                >
                  {art.mainImageUrl && (
                    <Link
                      href={articleHref}
                      className="relative hidden h-24 w-32 overflow-hidden rounded-xl border border-slate-800 sm:block"
                    >
                      <img
                        src={art.mainImageUrl}
                        alt={art.title}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                  )}
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      {art.category && (
                        <span className="rounded-full border border-slate-700 px-2 py-0.5 uppercase tracking-wide">
                          {CATEGORY_LABEL_MAP[art.category] ?? art.category}
                        </span>
                      )}
                      {publishedDate && (
                        <span>
                          {publishedDate.toLocaleString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {typeof art.views === "number" && art.views > 0 && (
                        <span>{art.views} okunma</span>
                      )}
                      <span>Yazar: {art.editorName ?? "Editör"}</span>
                    </div>
                    <Link href={articleHref}>
                      <h3 className="text-sm font-semibold text-slate-50 md:text-base">
                        {art.title}
                      </h3>
                    </Link>
                    {art.metaDesc && (
                      <p className="text-xs text-slate-400 line-clamp-2 md:text-sm">
                        {art.metaDesc}
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        </div>

        {/* Sağ kolon: En Çok Okunanlar + Haftanın Anketi */}
        {mostReadArticles.length > 0 && (
          <div className="w-full space-y-6 lg:w-72">
            {/* En Çok Okunanlar */}
            <aside className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <h2 className="mb-3 text-sm font-semibold text-slate-100">
                En Çok Okunanlar
              </h2>
              <div className="space-y-2">
                {mostReadArticles.map((art) => {
                  const href = `/news/${encodeURIComponent(
                    art.slug
                  )}?id=${encodeURIComponent(art.id)}`;
                  return (
                    <Link
                      key={art.id}
                      href={href}
                      className="group flex gap-2 rounded-xl border border-transparent px-2 py-1.5 text-xs text-slate-300 transition hover:border-sky-500/60 hover:bg-slate-900"
                    >
                      <div className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" />
                      <div className="flex-1">
                        <p className="line-clamp-2 group-hover:text-sky-100">
                          {art.title}
                        </p>
                        {typeof art.views === "number" && art.views > 0 && (
                          <p className="text-[10px] text-slate-500">
                            {art.views} okunma
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </aside>

            {/* Haftanın Anketi (aktif anket varsa) */}
            {activePoll && (
              <aside className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <h2 className="mb-3 text-sm font-semibold text-slate-100">
                  Haftanın Anketi
                </h2>
                <p className="mb-3 text-xs text-slate-300">
                  {activePoll.question}
                </p>
                <div className="space-y-2">
                  {activePoll.options.map((opt) => {
                    const total = activePoll.totalVotes || 0;
                    const ratio =
                      total > 0
                        ? Math.round((opt.votes / total) * 100)
                        : 0;

                    return (
                      <div key={opt.id} className="space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-200">
                            {opt.text}
                          </span>
                          <span className="text-slate-400">
                            {opt.votes} oy • {ratio}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[10px] text-slate-500">
                  Toplam {activePoll.totalVotes} oy • Anket sonuçları
                  haftalık olarak Gemini ile yorumlanacak.
                </p>
              </aside>
            )}
          </div>
        )}
      </div>

      {/* ALTTA YATAY GÜNDEM HAVACILIK ŞERİDİ */}
      {latestGundemMessages.length > 0 && (
        <section className="border-t border-slate-800 bg-slate-950/95">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  Gündem Havacılık
                </h2>
                <p className="text-[11px] text-slate-400">
                  Son kullanıcı yorumları ve sektör dedikoduları.
                </p>
              </div>
              <Link
                href="/gundem"
                className="text-xs font-medium text-sky-400 hover:text-sky-300"
              >
                Tümünü gör →
              </Link>
            </div>

            <div className="gundem-scroll flex gap-3 overflow-x-auto pb-1">
              {latestGundemMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="min-w-[260px] max-w-xs flex-1 rounded-2xl border border-slate-800 bg-slate-900/80 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-medium text-slate-100">
                      {msg.displayName}
                      {msg.company && (
                        <span className="text-[10px] text-slate-400">
                          {" "}
                          • {msg.company}
                        </span>
                      )}
                    </div>
                    {msg.createdAt && (
                      <div className="text-[10px] text-slate-500">
                        {new Date(msg.createdAt).toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-200 line-clamp-3">
                    {msg.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
