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
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://skynews-web.vercel.app";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://nextjs-boilerplate-sand-mu-98.vercel.app";

/**
 * Belirli bir slug'a ait haberi API'den çeker.
 * Backend'ine göre endpoint'i uyarlayabilirsin.
 */
async function fetchArticle(slug: string): Promise<Article | null> {
  if (!slug) return null;

  const base = API_BASE.replace(/\/$/, "");

  // Eğer backend'in /articles/:slug şeklinde çalışıyorsa:
  const url = `${base}/articles/${encodeURIComponent(slug)}`;

  // Eğer backend /articles?slug=... ile çalışıyorsa üstteki satırı şu şekilde değiştir:
  // const url = `${base}/articles?slug=${encodeURIComponent(slug)}`;

  const res = await fetch(url, {
    next: { revalidate: 60 }
  });

  if (!res.ok) {
    console.error("Article fetch failed", res.status, await res.text());
    return null;
  }

  const data = (await res.json()) as Article | null;

  if (!data || !data.slug) {
    return null;
  }

  return data;
}

export async function generateMetadata(
  { params }: PageProps
): Promise<Metadata> {
  const slug = params?.slug;

  if (!slug) {
    return {
      title: "Haber bulunamadı | SkyNews.Tr",
      description: "Aradığınız haber bulunamadı."
    };
  }

  const article = await fetchArticle(slug);

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
      url: `${SITE_URL}/news/${article.slug}`,
      images: article.mainImageUrl
        ? [{ url: article.mainImageUrl }]
        : [{ url: "/og-default.jpg" }]
    }
  };
}

export default async function NewsArticlePage({ params }: PageProps) {
  const slug = params?.slug;

  if (!slug) {
    console.error("Slug boş geldi");
    notFound();
  }

  const article = await fetchArticle(slug);

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

        {/* Debug */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-500">
          <p>
            Debug — slug: <code>{slug}</code>
          </p>
          <p>
            Debug — article.id: <code>{article.id}</code>
          </p>
        </div>
      </div>
    </main>
  );
}
