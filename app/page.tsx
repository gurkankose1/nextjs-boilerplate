"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Article = {
  id: string;
  title: string;
  summary?: string;
  slug?: string;
  category?: string;
  mainImageUrl?: string;
  createdAt?: string;
  published?: string;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; items: Article[] };

const API_URL = "/api/articles";

export default function HomePage() {
  const [state, setState] = useState<FetchState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState({ status: "loading" });

      try {
        const res = await fetch(API_URL);
        if (!res.ok) {
          const text = await res.text();
          if (!cancelled) {
            setState({
              status: "error",
              error: `Liste çekilemedi: ${res.status} ${text}`,
            });
          }
          return;
        }

        const data = (await res.json()) as Article[];

        if (!Array.isArray(data)) {
          if (!cancelled) {
            setState({
              status: "error",
              error: "API yanıtı dizi formatında değil.",
            });
          }
          return;
        }

        // En son eklenenler en üstte olsun diye gerekirse createdAt'e göre sıralayabiliriz
        const sorted = [...data].sort((a, b) => {
          const aTime = a.published ?? a.createdAt ?? "";
          const bTime = b.published ?? b.createdAt ?? "";
          return aTime < bTime ? 1 : aTime > bTime ? -1 : 0;
        });

        if (!cancelled) {
          setState({ status: "success", items: sorted });
        }
      } catch (err: any) {
        if (!cancelled) {
          setState({
            status: "error",
            error: err?.message ?? "Bilinmeyen hata",
          });
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Durumlara göre ekran

  if (state.status === "idle" || state.status === "loading") {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <HeaderHero />

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <HeaderHero />
          <div className="mt-10 rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm">
            <p className="font-semibold mb-2">Hata oluştu</p>
            <p className="whitespace-pre-wrap text-red-200">
              {state.error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const items = state.items;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <HeaderHero />

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300">
            Henüz yayınlanmış haber bulunmuyor. Firestore'daki{" "}
            <code className="text-xs bg-slate-800 px-1 py-0.5 rounded">
              articles
            </code>{" "}
            koleksiyonuna doküman eklediğinde burada otomatik görünecek.
          </div>
        ) : (
          <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {items.map((article) => {
              const hasSlug = !!article.slug;
              const linkHref = hasSlug
                ? `/news/${article.slug}?id=${article.id}`
                : `/news/${article.id}?id=${article.id}`;

              const dateText = article.published ?? article.createdAt ?? "";

              return (
                <Link
                  key={article.id}
                  href={linkHref}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 transition hover:border-sky-500/60 hover:bg-slate-900"
                >
                  {/* Kapak görseli */}
                  {article.mainImageUrl ? (
                    <div className="relative h-44 w-full overflow-hidden">
                      <img
                        src={article.mainImageUrl}
                        alt={article.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      {article.category && (
                        <span className="absolute left-3 top-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-100">
                          {article.category}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {article.category && (
                          <span className="inline-flex w-fit rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                            {article.category}
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {dateText
                            ? new Date(dateText).toLocaleString("tr-TR")
                            : "Tarih bilgisi yok"}
                        </span>
                      </div>
                      <div className="h-12 w-12 rounded-xl border border-slate-700 bg-slate-800/60" />
                    </div>
                  )}

                  {/* Metin kısmı */}
                  <div className="flex flex-1 flex-col px-4 py-3">
                    <h2 className="line-clamp-2 text-sm font-semibold leading-snug md:text-base">
                      {article.title || "Başlıksız haber"}
                    </h2>

                    {article.summary && (
                      <p className="mt-2 line-clamp-3 text-xs text-slate-400 md:text-sm">
                        {article.summary}
                      </p>
                    )}

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                      {dateText && (
                        <span>
                          {new Date(dateText).toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-sky-400 group-hover:text-sky-300">
                        Habere git
                        <span aria-hidden>↗</span>
                      </span>
                    </div>
                  </div>
                </Link>
            );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

/** Üst kısımdaki basit hero / header */
function HeaderHero() {
  return (
    <header className="mb-4">
      <p className="text-xs uppercase tracking-[0.35em] text-sky-400/80">
        SkyNews.Tr
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-50 md:text-3xl">
        Havacılık gündemini tek ekranda toplayan{" "}
        <span className="text-sky-400">SkyNews.Tr</span>
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400 md:text-base">
        Firestore&apos;daki{" "}
        <code className="rounded bg-slate-800 px-1 py-0.5 text-xs">
          articles
        </code>{" "}
        koleksiyonuna eklediğin haberler burada otomatik listelenir. Kartlara
        tıklayınca detay sayfası açılır.
      </p>
    </header>
  );
}
