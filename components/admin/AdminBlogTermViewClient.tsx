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

type FormState = {
  title: string;
  slug: string;
  termKey: string;
  summary: string;
  metaDesc: string;
  category: string;
  source: string;
  imagePrompt: string;
  mainImageUrl: string;
  html: string;
};

// Gemini HTML'inde <body> varsa temizle
function normalizeHtml(raw: string | undefined | null): string {
  if (!raw) return "";
  let html = String(raw).trim();
  html = html.replace(/<\/?body[^>]*>/gi, "");
  return html.trim();
}

function buildFormFromDoc(doc: any): FormState {
  return {
    title: doc?.title ?? "",
    slug: doc?.slug ?? "",
    termKey: doc?.termKey ?? "",
    summary: doc?.summary ?? "",
    metaDesc: doc?.metaDesc ?? "",
    category: doc?.category ?? "",
    source: doc?.source ?? "",
    imagePrompt: doc?.imagePrompt ?? "",
    mainImageUrl: doc?.mainImageUrl ?? "",
    html: doc?.html ?? "",
  };
}

export function AdminBlogTermViewClient() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id");
  const [state, setState] = useState<State>({ status: "idle" });

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Dokümanı çek
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
    setForm(null);
    setSaveMessage(null);
    setSaveError(null);

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
            // ignore
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
        setForm(buildFormFromDoc(json.data));
      } catch (err: any) {
        setState({
          status: "error",
          message: String(err?.message || err),
        });
      }
    };

    fetchDoc();
  }, [idFromUrl]);

  function handleChange<K extends keyof FormState>(field: K, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function handleSave() {
    if (state.status !== "loaded" || !form) return;

    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);

    try {
      const res = await fetch("/api/admin/blog-terms/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: state.id,
          ...form,
        }),
      });

      const json = (await res.json()) as ApiResponseOk | ApiResponseErr;

      if (!res.ok || !json.ok) {
        throw new Error(
          (json as ApiResponseErr)?.error ||
            `HTTP ${res.status}`
        );
      }

      setSaveMessage("Değişiklikler kaydedildi.");
      setSaveError(null);
    } catch (err: any) {
      setSaveError(
        "Kaydetme sırasında bir hata oluştu: " +
          String(err?.message || err)
      );
      setSaveMessage(null);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (state.status === "loaded") {
      setForm(buildFormFromDoc(state.data));
      setSaveMessage(null);
      setSaveError(null);
    }
  }

  // Yükleniyor
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

  // Hata
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

  // loaded ama form henüz hazırlanmadıysa
  if (!form) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-50">
          Form hazırlanıyor…
        </h2>
        <p className="text-xs text-slate-300">
          Doküman verileri form alanlarına aktarılıyor.
        </p>
      </section>
    );
  }

  const normalizedHtml = normalizeHtml(form.html);

  return (
    <section className="space-y-6">
      {/* Üstte Kaydet / Reset barı */}
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-slate-300">
          ID:&nbsp;
          <span className="font-mono text-[11px] text-slate-100 break-all">
            {state.id}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {saveMessage && (
            <span className="text-[11px] text-emerald-300">
              {saveMessage}
            </span>
          )}
          {saveError && (
            <span className="text-[11px] text-red-300">
              {saveError}
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-slate-600 px-3 py-1 text-[11px] text-slate-100 hover:bg-slate-800"
            disabled={saving}
          >
            Değişiklikleri Sıfırla
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}
          </button>
        </div>
      </div>

      {/* Üst bilgi kartları */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Temel bilgiler (EDITABLE) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-50">
            Temel Bilgiler
          </h2>
          <div className="mt-3 space-y-3 text-xs text-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300">
                Başlık
              </label>
              <input
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300">
                Slug
              </label>
              <input
                value={form.slug}
                onChange={(e) => handleChange("slug", e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 font-mono text-[11px] text-slate-100 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300">
                Terim Anahtarı (termKey)
              </label>
              <input
                value={form.termKey}
                onChange={(e) => handleChange("termKey", e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300">
                Kategori
              </label>
              <input
                value={form.category}
                onChange={(e) => handleChange("category", e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300">
                Kaynak (source)
              </label>
              <input
                value={form.source}
                onChange={(e) => handleChange("source", e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300">
                Meta Açıklama (metaDesc)
              </label>
              <textarea
                value={form.metaDesc}
                onChange={(e) => handleChange("metaDesc", e.target.value)}
                rows={3}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Görsel bilgisi (EDITABLE) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-50">
            Görsel Bilgisi
          </h2>
          <div className="mt-3 space-y-3 text-xs text-slate-200">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300">
                Image prompt
              </label>
              <textarea
                value={form.imagePrompt}
                onChange={(e) => handleChange("imagePrompt", e.target.value)}
                rows={3}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300">
                Ana görsel URL (mainImageUrl)
              </label>
              <input
                value={form.mainImageUrl}
                onChange={(e) => handleChange("mainImageUrl", e.target.value)}
                className="mt-1 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
              />
            </div>

            {form.mainImageUrl && (
              <div className="mt-3">
                <div className="mb-1 text-[11px] text-slate-400">
                  Önizleme:
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.mainImageUrl}
                    alt={form.title ?? ""}
                    className="h-40 w-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Özet (EDITABLE) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="text-sm font-semibold text-slate-50">
          Kısa Özet (summary)
        </h2>
        <textarea
          value={form.summary}
          onChange={(e) => handleChange("summary", e.target.value)}
          rows={4}
          className="mt-2 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
        />
      </div>

      {/* HTML gövdesi (EDITABLE + PREVIEW) */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        {/* Edit alanı */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-50">
            İçerik Gövdesi (HTML Düzenleme)
          </h2>
          <p className="mb-2 text-[11px] text-slate-400">
            Buraya doğrudan HTML yazabilirsin. Örneğin:
            <br />
            <code className="text-[10px] text-sky-300">
              {`<h2>Başlık</h2>`, " ", `<p><strong>Kalın metin</strong></p>`, " ", `<p style="text-align:center;">Ortalanmış paragraf</p>`}
            </code>
          </p>
          <textarea
            value={form.html}
            onChange={(e) => handleChange("html", e.target.value)}
            rows={18}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 font-mono text-[11px] text-slate-100 outline-none focus:border-sky-500"
          />
        </div>

        {/* Önizleme */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-50">
            Canlı Önizleme
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
              Henüz HTML içeriği bulunmuyor.
            </p>
          )}
        </div>
      </div>

      {/* Debug JSON (istersen sonra silebiliriz) */}
      <div className="rounded-2xl border border-slate-900 bg-slate-950/60 p-4">
        <h2 className="mb-2 text-xs font-semibold text-slate-400">
          Debug – Ham JSON (Firestore verisi)
        </h2>
        <pre className="max-h-[320px] overflow-auto rounded-xl bg-slate-950/90 p-3 font-mono text-[10px] text-sky-200">
{JSON.stringify(state.data, null, 2)}
        </pre>
      </div>
    </section>
  );
}
