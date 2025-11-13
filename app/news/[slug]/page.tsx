// app/news/[slug]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type ImageInfo = {
  url: string;
  alt?: string;
  credit?: string;
};

type ArticleData = {
  id?: string;
  title?: string;
  seoTitle?: string;
  html?: string;
  body?: string;
  category?: string;
  metaDesc?: string;
  publishedAt?: string | null;
  createdAt?: string | null;
  images?: ImageInfo[];
};

type ApiOk = {
  ok: true;
  id: string;
  article: ArticleData;
};

type ApiErr = {
  ok: false;
  error: string;
};

const CATEGORY_EDITOR_MAP: Record<string, string> = {
  airlines: "Metehan Özülkü",
  airports: "Kemal Kahraman",
  "ground-handling": "Hafife Kandemir",
  "military-aviation": "Musa Demirbilek",
  accidents: "Editör Ekibi",
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  airlines: "Havayolları",
  airports: "Havalimanları",
  "ground-handling": "Yer Hizmetleri",
  accidents: "Uçak Kazaları",
  "military-aviation": "Askeri Havacılık",
};

// Okuma süresi (dakika)
function calculateReadingTime(html: string) {
  if (!html) return 1;
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 180));
  return minutes;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("tr-TR");
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const searchParams = useSearchParams();
  const articleId = searchParams.get("id") || undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [resolvedId, setResolvedId] = useState<string | null>(null);

  // Haberi çek
  useEffect(() => {
    const id: string = articleId ?? "";

    if (!id) {
      setLoading(false);
      setError("Geçersiz haber adresi (id parametresi eksik).");
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/articles/get?id=${encodeURIComponent(id)}`
        );
        const json: ApiOk | ApiErr = await res.json();

        if (cancelled) return;

        if (!json.ok) {
          setError(json.error || "Haber bulunamadı.");
          setArticle(null);
          setLoading(false);
          return;
        }

        setArticle(json.article);
        setResolvedId(json.id);
        setLoading(false);
      } catch (e: any) {
        if (cancelled) return;
        setError("Haber yüklenirken bir hata oluştu.");
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [articleId]);

  // View sayacını artır
  useEffect(() => {
    if (!resolvedId) return;
    fetch("/api/articles/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: resolvedId }),
    }).catch(() => {});
  }, [resolvedId]);

  const {
    title,
    categoryLabel,
    editorName,
    publishedAtText,
    readingTime,
    heroImage,
  } = useMemo(() => {
    if (!article) {
      return {
        title: "",
        categoryLabel: "",
        editorName: "",
        publishedAtText: null as string | null,
        readingTime: 1,
        heroImage: null as ImageInfo | null,
      };
    }

    const cat = article.category || "other";
    const label = CATEGORY_LABEL_MAP[cat] || cat || "Havacılık";
    const editor = CATEGORY_EDITOR_MAP[cat] || "Editör Ekibi";

    const html = article.html || article.body || "";
    const rt = calculateReadingTime(html);

    const publishedText =
      formatDate(article.publishedAt || article.createdAt) || null;

    const img =
      (Array.isArray(article.images) ? article.images : []).find(
        (x) => x && typeof x.url === "string"
      ) || null;

    const ttl =
      article.title || article.seoTitle || "Havacılık Haberi";

    return {
      title: ttl,
      categoryLabel: label,
      editorName: editor,
      publishedAtText: publishedText,
      readingTime: rt,
      heroImage: img,
    };
  }, [article]);

  const cleanedHtml = useMemo(() => {
    if (!article) return "";
    const raw = article.html || article.body || "";
    if (!raw) return "";
    return raw;
  }, [article]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8 md:px-8 lg:px-16">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumbs */}
        <nav className="text-xs text-slate-400 flex items-center gap-2">
          <Link href="/" className="hover:text-sky-300 transition">
            Ana Sayfa
          </Link>
          {categoryLabel && (
            <>
              <span>/</span>
              <span className="text-slate-500">{categoryLabel}</span>
            </>
          )}
          {title && (
            <>
              <span>/</span>
              <span className="text-slate-500 line-clamp-1">{title}</span>
            </>
          )}
        </nav>

        {/* Yükleniyor / Hata Durumu */}
        {loading && (
          <div className="space-y-3">
            <div className="h-8 w-2/3 bg-slate-800/60 rounded animate-pulse" />
            <div className="h-4 w-1/3 bg-slate-800/60 rounded animate-pulse" />
            <div className="h-64 w-full bg-slate-900/60 rounded-xl animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-full bg-slate-900/60 rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-slate-900/60 rounded animate-pulse" />
              <div className="h-4 w-4/6 bg-slate-900/60 rounded animate-pulse" />
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="space-y-3">
            <h1 className="text-xl font-semibold">
              Haber yüklenirken bir hata oluştu
            </h1>
            <p className="text-sm text-slate-400">{error}</p>
            <Link
              href="/"
              className="inline-flex text-sm text-sky-300 hover:text-sky-200"
            >
              ← Ana sayfaya dön
            </Link>
          </div>
        )}

        {!loading && !error && article && (
          <>
            {/* Başlık */}
            <header className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-snug">
                {title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                {categoryLabel && (
                  <span className="px-2 py-1 rounded-full border border-slate-700/80">
                    {categoryLabel}
                  </span>
                )}
                {publishedAtText && <span>{publishedAtText}</span>}
                <span>{readingTime} dk okuma</span>
                <span>Yazar: {editorName}</span>
              </div>
            </header>

            {/* Kapak Görseli */}
            {heroImage && (
              <div className="rounded-xl overflow-hidden border border-slate-800 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImage.url}
                  alt={heroImage.alt || title}
                  className="w-full max-h-[420px] object-cover"
                />
                {heroImage.credit && (
                  <div className="text-[10px] text-slate-500 px-3 py-2 bg-slate-900 border-t border-slate-800">
                    {heroImage.credit}
                  </div>
                )}
              </div>
            )}

            {/* Gövde */}
            {cleanedHtml ? (
              <article
                className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-sky-300"
                dangerouslySetInnerHTML={{ __html: cleanedHtml }}
              />
            ) : (
              <p className="text-sm text-slate-400">
                Bu haber henüz tam metinle güncellenmedi. Kısa süre içinde
                editörlerimiz içeriği tamamlayacak.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
