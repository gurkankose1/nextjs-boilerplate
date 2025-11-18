import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Article = {
  id: string;
  title: string;
  seoTitle?: string;
  summary?: string;
  slug: string;
  html?: string;
  category?: string;
  source?: string;
  sourceUrl?: string;
  published?: string;
  createdAt?: string;
  mainImageUrl?: string;
};

type PageProps = {
  params: {
    slug: string;
  };
  searchParams?: {
    [key: string]: string | string[] | undefined;
  };
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://skynews-web.vercel.app/";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://nextjs-boilerplate-sand-mu-98.vercel.app";

/**
 * URL query'sinden id parametresini çeker (id bir array de olabilir).
 */
function getIdFromSearchParams(
  searchParams: PageProps["searchParams"]
): string | null {
  if (!searchParams) return null;
  const raw = searchParams.id;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

/**
 * Haberleri list endpoint'inden çeker ve
 * gelen dizide id veya slug'a göre ilgili haberi bulur.
 *
 * Anasayfada çalışan endpoint ile aynı mantığı kullanıyoruz:
 * GET /articles?turkey_first=true  → Article[]
 */
async function fetchArticle(
  id: string | null,
  slug: string | null
): Promise<Article | null> {
  if (!id && !slug) return null;

  const base = API_BASE.replace(/\/$/, "");
  const url = `${base}/articles?turkey_first=true`;

  const res = await fetch(url, {
    next: { revalidate: 60 }
  });

  if (!res.ok) {
    console.error("Article list fetch failed", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as Article[];

  if (!Array.isArray(data)) {
    console.error("Article list response is not an array");
    return null;
  }

  // Önce id ile arıyoruz
  let found =
    (id && data.find((a) => a.id === id)) ||
    // id bulunamazsa slug ile arıyoruz
    (slug && data.find((a) => a.slug === slug));

  if (!found) {
    console.warn("Article not found in list", { id, slug });
    return null;
  }

  return found;
}

export async function generateMetadata(
  { params, searchParams }: PageProps
): Promise<Metadata> {
  const slug = params?.slug ?? null;
  const id = getIdFromSearchParams(searchParams);

  if (!slug && !id) {
    return {
      title: "Haber bulunamadı | SkyNews.Tr",
      description: "Aradığınız haber bulunamadı."
    };
  }

  const article = await fetchArticle(id, slug);

  if (!article) {
    return {
      title: "Haber bulunamadı | SkyNews.Tr",
      description: "Aradığınız haber bulunamadı."
    };
  }

  const title = article.seoTitle ?? article.title;
  const description =
    article.summary ??
    `SkyNews.Tr – ${article.title} başlıklı havacılık haberi.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}/news/${article.slug}?id=${article.id}`,
      images: article.mainImageUrl
        ? [{ url: article.mainImageUrl }]
        : [{ url: "/og-default.jpg" }]
    }
  };
}

export default async function NewsArticlePage({
  params,
  searchParams
}: PageProps) {
  const slug = params?.slug ?? null;
  const id = getIdFromSearchParams(searchParams);

  if (!slug && !id) {
    console.error("Slug ve ID eksik:", { slug, id });
    notFound();
  }

  const article = await fetchArticle(id, slug);

  if (!article) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Kategori + tarih */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          {article.category && (
            <span className="rounded-full border border-slate-700 px-3 py-1 uppercase tracking-wide">
              {article.category}
            </span>
          )}
          {article.published && (
            <span>
              {new Date(article.published).toLocaleString("tr-TR")}
            </span>
          )}
        </div>

        {/* Başlık */}
        <h1 className="mb-4 text-3xl font-semibold leading-tight md:text-4xl">
          {article.title}
        </h1>

        {/* Kaynak satırı */}
        {(article.source || article.sourceUrl) && (
          <p className="mb-6 text-sm text-slate-400">
            Kaynak:{" "}
            {article.sourceUrl ? (
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                {article.source ?? article.sourceUrl}
              </a>
            ) : (
              article.source
            )}
          </p>
        )}

        {/* Kapak görseli */}
        {article.mainImageUrl && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-slate-800">
            <img
              src={article.mainImageUrl}
              alt={article.title}
              className="h-auto w-full object-cover"
            />
          </div>
        )}

        {/* Özet kutusu */}
        {article.summary && (
          <div className="mb-6 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 text-sm text-slate-100">
            <p className="mb-1 font-semibold">Kısa Özet</p>
            <p>{article.summary}</p>
          </div>
        )}

        {/* İçerik */}
        <article className="prose prose-invert prose-sky max-w-none">
          {article.html ? (
            <div dangerouslySetInnerHTML={{ __html: article.html }} />
          ) : (
            <p>Bu haberin ayrıntılı içeriği henüz hazırlanmadı.</p>
          )}
        </article>

        {/* Debug kutusu */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-500">
          <p>
            Debug — slug (URL&apos;den): <code>{slug}</code>
          </p>
          <p>
            Debug — id (query param): <code>{id}</code>
          </p>
          <p>
            Debug — article.id (API&apos;den): <code>{article.id}</code>
          </p>
        </div>
      </div>
    </main>
  );
}
