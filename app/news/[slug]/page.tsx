"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Article = {
  id?: string;
  docId?: string;
  title: string;
  seoTitle?: string;
  summary?: string;
  slug?: string;
  html?: string;
  category?: string;
  source?: string;
  sourceUrl?: string;
  published?: string;
  createdAt?: string;
  mainImageUrl?: string;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "not-found" }
  | { status: "success"; article: Article };

/**
 * ⛔️ ŞU AN BURASI BOŞ.
 *
 * Buraya gerçekten JSON dönen bir endpoint yazman gerekiyor.
 * Örnek JSON (dizi):
 * [
 *   { "id": "WPsT1eXFf0YPlfQxfyL7", "slug": "turkiyenin-...", "title": "...", ... },
 *   ...
 * ]
 *
 * Örn: "https://senin-backendin.vercel.app/api/articles?turkey_first=true"
 */
const ARTICLES_LIST_URL = process.env.NEXT_PUBLIC_ARTICLES_URL ?? "";

export default function NewsArticlePageClient() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = useMemo(() => {
    const value = params?.["slug"];
    if (Array.isArray(value)) return value[0];
    return (value as string) ?? "";
  }, [params]);

  const id = useMemo(() => {
    if (!searchParams) return "";
    const value = searchParams.get("id");
    return value ?? "";
  }, [searchParams]);

  const [state, setState] = useState<FetchState>({ status: "idle" });

  useEffect(() => {
    if (!slug && !id) return;
    if (!ARTICLES_LIST_URL) {
      setState({
        status: "error",
        error:
          "ARTICLES_LIST_URL tanımlı değil. Lütfen gerçek JSON endpoint adresini NEXT_PUBLIC_ARTICLES_URL ortam değişkenine yaz."
      });
      return;
    }

    let cancelled = false;

    const fetchArticle = async () => {
      setState({ status: "loading" });

      try {
        const url = ARTICLES_LIST_URL;

        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          if (!cancelled) {
            setState({
              status: "error",
              error: `Liste çekilemedi: ${res.status} ${text}`
            });
          }
          return;
        }

        const data = (await res.json()) as Article[];

        if (!Array.isArray(data)) {
          if (!cancelled) {
            setState({
              status: "error",
              error: "API yanıtı dizi formatında değil."
            });
          }
          return;
        }

        const foundById =
          id &&
          data.find((a) => a.id === id || a.docId === id);

        const foundBySlug =
          !foundById && slug
            ? data.find((a) => a.slug === slug)
            : undefined;

        const foundByPartialSlug =
          !foundById && !foundBySlug && slug
            ? data.find(
                (a) =>
                  a.slug &&
                  (a.slug === slug ||
                    a.slug.endsWith(slug) ||
                    slug.endsWith(a.slug))
              )
            : undefined;

        const article = foundById ?? foundBySlug ?? foundByPartialSlug;

        if (!article) {
          if (!cancelled) {
            setState({ status: "not-found" });
          }
          return;
        }

        if (!cancelled) {
          setState({ status: "success", article });
        }
      } catch (err: any) {
        if (!cancelled) {
          setState({
            status: "error",
            error: err?.message ?? "Bilinmeyen hata"
          });
        }
      }
    };

    fetchArticle();
    return () => {
      cancelled = true;
    };
  }, [slug, id]);

  // Durumlar

  if (!slug && !id) {
    return (
      <MainWrapper>
        <CenteredBox title="Geçersiz adres">
          <p className="text-sm text-slate-400">
            Bu haber sayfasını açmak için geçerli bir slug veya id parametresi
            gereklidir.
          </p>
          <DebugBox slug={slug} id={id} />
        </CenteredBox>
      </MainWrapper>
    );
  }

  if (state.status === "idle" || state.status === "loading") {
    return (
      <MainWrapper>
        <CenteredBox title="Yükleniyor...">
          <p className="text-sm text-slate-400">
            Haber içeriği yükleniyor, lütfen bekleyin.
          </p>
          <DebugBox slug={slug} id={id} />
        </CenteredBox>
      </MainWrapper>
    );
  }

  if (state.status === "error") {
    return (
      <MainWrapper>
        <CenteredBox title="Hata oluştu">
          <p className="mb-2 text-sm text-red-400">
            Haber yüklenirken bir hata oluştu.
          </p>
          <p className="text-xs text-slate-400 whitespace-pre-wrap">
            {state.error}
          </p>
          <DebugBox slug={slug} id={id} />
        </CenteredBox>
      </MainWrapper>
    );
  }

  if (state.status === "not-found") {
    return (
      <MainWrapper>
        <CenteredBox title="Haber bulunamadı">
          <p className="text-sm text-slate-400">
            Bu slug/id ile eşleşen bir haber bulunamadı.
          </p>
          <DebugBox slug={slug} id={id} />
        </CenteredBox>
      </MainWrapper>
    );
  }

  const article = state.article;

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

        {/* Kaynak */}
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
            Debug — slug (URL&apos;den): <code>{slug}</code>
          </p>
          <p>
            Debug — id (query param): <code>{id}</code>
          </p>
        </div>
      </div>
    </main>
  );
}

/* Basit layout helper'ları */

function MainWrapper({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      {children}
    </main>
  );
}

function CenteredBox({
  children,
  title
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950 p-6">
      <h1 className="mb-2 text-xl font-semibold">{title}</h1>
      {children}
    </div>
  );
}

function DebugBox({ slug, id }: { slug: string; id: string }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-400">
      <p>
        <strong>URL slug:</strong> <code>{slug || "(boş)"}</code>
      </p>
      <p>
        <strong>Query id:</strong> <code>{id || "(boş)"}</code>
      </p>
    </div>
  );
}
