// components/admin/AdminBlogTermViewClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type ApiResponseOk = {
  ok: true;
  id: string;
  data: any;
};

type ApiResponseErr = {
  ok: false;
  error: string;
};

type State =
  | { status: "idle" }
  | { status: "loading"; id: string }
  | { status: "error"; message: string }
  | { status: "loaded"; id: string; data: any };

// Gemini'nin ürettiği HTML gövdesinde <body> etiketi varsa onu temizleyelim
function normalizeHtml(raw: string | undefined | null): string {
  if (!raw) return "";
  let html = String(raw).trim();
  // <body> ve </body> etiketlerini at
  html = html.replace(/<\/?body[^>]*>/gi, "");
  return html.trim();
}

export function AdminBlogTermViewClient() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id");
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    const id = (idFromUrl ?? "").trim();

    if (!id) {
      setState({
        status: "error",
        message:
          "URL'de ?id=... parametresi yok veya boş. Liste sayfasından tekrar deneyebilirsin.",
      });
      return;
    }

    setState({ status: "loading", id });

    const fetchDoc = async () => {
      try {
        const res = await fetch(
          `/api/admin/blog-terms/view?id=${encodeURIComponent(id)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!res.ok) {
          let msg = `Sunucu hatası (HTTP ${res.status})`;
          try {
            const json = (await res.json()) as ApiResponseErr;
            if (json?.error) msg = json.error;
          } catch {
            // yut
          }
          setState({ status: "error", message: msg });
          return;
        }

        const json = (await res.json()) as ApiResponseOk | ApiResponseErr;
        if (!json.ok) {
          setState({
            status: "error",
            message:
              "API hatası: " +
              ("error" in json ? json.error : "Bilinmeyen hata"),
          });
          return;
        }

        setState({
          status: "loaded",
          id: json.id,
          data: json.data,
        });
      } catch (err: any) {
        setState({
          status: "error",
          message: String(err?.message || err),
        });
      }
    };

    fetchDoc();
  }, [idFromUrl]);

  // Yükleniyor ekranı
  if (state.status === "idle" || state.status === "loading") {
    const loadingId =
      state.status === "loading" ? state.id : idFromUrl ?? "(yok)";
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-50">
          Doküman yükleniyor…
        </h2>
        <p className="text-xs text-slate-300 mb-2">
          ID:&nbsp;
          <span className="font-mono text-[11px] text-slate-100 break-all">
            {loadingId}
          </span>
        </p>
        <p className="text-[11px] text-slate-500">
          Firestore&apos;dan blog_posts koleksiyonundaki doküman çekiliyor.
        </p>
      </section>
    );
  }

  // Hata ekranı
  if (state.status === "error") {
    return (
      <section className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4">
        <h2 className="mb-2 text-sm font-semibold text-red-100">
          Hata oluştu
        </h2>
        <p className="text-xs text-red-200 whitespace-pre-wrap">
          {state.message}
        </p>
        <div className="mt-3 rounded border border-red-900/60 bg-slate-950/40 p-2 text-[11px] text-slate-300">
          URL arama parametreleri (debug):
          <pre className="mt-1 max-h-40 overflow-auto font-mono text-[10px] text-sky-200">
{JSON.stringify(
  Object.fromEntries(searchParams.entries()),
  null,
  2
)}
          </pre>
        </div>
      </section>
    );
  }

  // Yüklendi → Şık detay görünümü
  const doc = state.data || {};
  const normalizedHtml = normalizeHtml(doc.html);

  return (
    <section className="space-y-6">
      {/* Üst bilgi kartları */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Temel bilgiler */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-50">
            Temel Bilgiler
          </h2>
          <dl className="mt-3 space-y-2 text-xs text-slate-200">
            <div>
              <dt className="font-semibold text-slate-300">Başlık</dt>
              <dd className="mt-1 text-slate-100">
                {doc.title ?? "(Başlıksız)"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-300">Slug</dt>
              <dd className="mt-1 font-mono text-[11px] text-slate-200">
                {doc.slug ?? "(yok)"}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-300">Terim Anahtarı</dt>
              <dd className="mt-1 text-slate-100">
                {doc.termKey ?? <span className="text-slate-500">(yok)</span>}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-300">Meta Açıklama</dt>
              <dd className="mt-1 text-slate-200">
                {doc.metaDesc ?? (
                  <span className="text-slate-500">(yok)</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-300">Kategori</dt>
              <dd className="mt-1 text-slate-200">
                {doc.category ?? <span className="text-slate-500">(yok)</span>}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-300">Kaynak</dt>
              <dd className="mt-1 text-slate-200">
                {doc.source ?? <span className="text-slate-500">(yok)</span>}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-300">Yayın Tarihi</dt>
              <dd className="mt-1 text-slate-200">
                {doc.publishedAt
                  ? new Date(doc.publishedAt).toLocaleString("tr-TR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "(yok)"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Görsel bilgisi */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-50">
            Görsel Bilgisi
          </h2>
          <div className="mt-3 text-xs text-slate-200 space-y-2">
            <div>
              <div className="font-semibold text-slate-300">
                Image prompt:
              </div>
              <p className="mt-1 text-slate-200">
                {doc.imagePrompt ?? (
                  <span className="text-slate-500">(tanımlı değil)</span>
                )}
              </p>
            </div>
            <div>
              <div className="font-semibold text-slate-300">
                Ana görsel URL:
              </div>
              <p className="mt-1 break-all text-slate-200">
                {doc.mainImageUrl ? (
                  doc.mainImageUrl
                ) : (
                  <span className="text-slate-500">(henüz görsel yok)</span>
                )}
              </p>
            </div>

            {doc.mainImageUrl && (
              <div className="mt-3">
                <div className="mb-1 text-[11px] text-slate-400">
                  Önizleme:
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={doc.mainImageUrl}
                    alt={doc.title ?? ""}
                    className="h-40 w-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Özet */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="text-sm font-semibold text-slate-50">
          Kısa Özet (summary)
        </h2>
        <p className="mt-2 text-xs text-slate-200 whitespace-pre-wrap">
          {doc.summary ?? <span className="text-slate-500">(yok)</span>}
        </p>
      </div>

      {/* HTML gövdesi */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-50">
          İçerik Gövdesi (HTML)
        </h2>
        {normalizedHtml ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <div
              className="text-xs leading-relaxed"
              dangerouslySetInnerHTML={{ __html: normalizedHtml }}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-400">
            Bu terim için henüz HTML içerik bulunmuyor.
          </p>
        )}
      </div>

      {/* İstersen debug için JSON'u da altta tutalım */}
      <div className="rounded-2xl border border-slate-900 bg-slate-950/60 p-4">
        <h2 className="mb-2 text-xs font-semibold text-slate-400">
          Debug – Ham JSON
        </h2>
        <pre className="max-h-[320px] overflow-auto rounded-xl bg-slate-950/90 p-3 font-mono text-[10px] text-sky-200">
{JSON.stringify(doc, null, 2)}
        </pre>
      </div>
    </section>
  );
}
