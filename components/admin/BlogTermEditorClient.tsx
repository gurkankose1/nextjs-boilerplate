// components/admin/BlogTermEditorClient.tsx
"use client";

import { useState } from "react";

type EditableFields = {
  title: string;
  slug: string;
  termKey: string;
  summary: string;
  html: string;
  imagePrompt: string;
  metaDesc: string;
};

type BlogTermEditorProps = {
  initialData: EditableFields & {
    id: string;
    mainImageUrl: string | null;
    publishedAt: string | null;
  };
};

export function BlogTermEditorClient({ initialData }: BlogTermEditorProps) {
  const [form, setForm] = useState<EditableFields>({
    title: initialData.title || "",
    slug: initialData.slug || "",
    termKey: initialData.termKey || "",
    summary: initialData.summary || "",
    html: initialData.html || "",
    imagePrompt: initialData.imagePrompt || "",
    metaDesc: initialData.metaDesc || "",
  });

  const [saving, setSaving] = useState(false);

  function handleChange<K extends keyof EditableFields>(
    field: K,
    value: EditableFields[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // Şimdilik sadece console.log – bir sonraki adımda Firestore'a kaydedeceğiz
    console.log("BLOG TERM FORM DATA", {
      id: initialData.id,
      ...form,
    });

    // Küçük bir fake delay
    setTimeout(() => {
      setSaving(false);
      alert("Şimdilik sadece önizleme: form verisi console.log ile yazıldı. Bir sonraki adımda Firestore'a kaydedeceğiz.");
    }, 400);
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Temel bilgiler + Görsel bilgisi */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* Temel bilgiler */}
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
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 outline-none focus:border-sky-500"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300">
                Slug
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-[11px] text-slate-50 outline-none focus:border-sky-500"
                value={form.slug}
                onChange={(e) => handleChange("slug", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300">
                Terim anahtarı (termKey)
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 outline-none focus:border-sky-500"
                value={form.termKey}
                onChange={(e) => handleChange("termKey", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300">
                Meta açıklama (metaDesc)
              </label>
              <textarea
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 outline-none focus:border-sky-500"
                rows={3}
                value={form.metaDesc}
                onChange={(e) => handleChange("metaDesc", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300">
                Yayın tarihi (salt okunur)
              </label>
              <div className="mt-1 text-[11px] text-slate-200">
                {initialData.publishedAt
                  ? new Date(initialData.publishedAt).toLocaleString("tr-TR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "(yok)"}
              </div>
            </div>
          </div>
        </div>

        {/* Görsel bilgisi */}
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
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 outline-none focus:border-sky-500"
                rows={3}
                value={form.imagePrompt}
                onChange={(e) => handleChange("imagePrompt", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300">
                Ana görsel URL (salt okunur, şimdilik)
              </label>
              <div className="mt-1 break-all text-[11px] text-slate-200">
                {initialData.mainImageUrl ? (
                  initialData.mainImageUrl
                ) : (
                  <span className="text-slate-500">(henüz görsel yok)</span>
                )}
              </div>
            </div>

            {initialData.mainImageUrl && (
              <div className="mt-3">
                <div className="mb-1 text-[11px] text-slate-400">
                  Önizleme:
                </div>
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={initialData.mainImageUrl}
                    alt={form.title}
                    className="h-40 w-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Özet alanı */}
      <section>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-50">
            Kısa Özet (summary)
          </h2>
          <textarea
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-50 outline-none focus:border-sky-500"
            rows={4}
            value={form.summary}
            onChange={(e) => handleChange("summary", e.target.value)}
          />
        </div>
      </section>

      {/* HTML gövde alanı */}
      <section>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-50">
              İçerik Gövdesi (HTML)
            </h2>
            <span className="text-[10px] text-slate-500">
              Şimdilik ham HTML düzenleniyor – ileride WYSIWYG ekleyebiliriz.
            </span>
          </div>
          <textarea
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-[11px] text-slate-50 outline-none focus:border-sky-500"
            rows={18}
            value={form.html}
            onChange={(e) => handleChange("html", e.target.value)}
          />
        </div>
      </section>

      {/* Alt butonlar */}
      <section className="pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
          >
            {saving ? "Kaydediliyor..." : "Kaydet (şimdilik sadece önizleme)"}
          </button>
          <span className="text-[11px] text-slate-500">
            Bir sonraki adımda bu buton Firestore&apos;a gerçek anlamda kayıt
            yapacak.
          </span>
        </div>
      </section>
    </form>
  );
}
