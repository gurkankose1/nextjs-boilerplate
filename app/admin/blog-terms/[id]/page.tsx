// app/admin/blog-terms/[id]/page.tsx
import { adminDb } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/adminAuth";

export const revalidate = 0;

type PageProps = {
  params: { id: string };
};

export default async function AdminBlogTermDetailPage({ params }: PageProps) {
  // 1) Admin oturum kontrolü
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE_NAME);

  if (!session || session.value !== "1") {
    redirect("/admin/login");
  }

  const id = params.id;

  // 2) Firestore'dan ilgili dokümanı çek
  const docRef = adminDb.collection("blog_posts").doc(id);
  const snap = await docRef.get();

  if (!snap.exists) {
    notFound();
  }

  const data = snap.data() as any;

  const title: string = data.title ?? "(Başlıksız)";
  const slug: string = data.slug ?? "";
  const termKey: string = data.termKey ?? "";
  const summary: string = data.summary ?? "";
  const html: string = data.html ?? "";
  const imagePrompt: string = data.imagePrompt ?? "";
  const mainImageUrl: string | null = data.mainImageUrl ?? null;
  const publishedAt: string | null = data.publishedAt ?? null;
  const metaDesc: string = data.metaDesc ?? "";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:py-8">
        {/* Breadcrumb / üst başlık */}
        <header className="mb-6 border-b border-slate-800 pb-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-sky-400">
            Admin / Blog – Havacılık Terimleri
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
            Terim Detayı
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Bu sayfada seçili havacılık terimi blog yazısının detaylarını
            görebilirsin. Bir sonraki adımda buraya düzenleme (edit) ve kaydetme
            (save) işlemlerini ekleyeceğiz.
          </p>
        </header>

        {/* Temel bilgiler kartı */}
        <section className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold text-slate-50">
              Temel Bilgiler
            </h2>
            <dl className="mt-3 space-y-2 text-xs text-slate-200">
              <div>
                <dt className="font-semibold text-slate-300">Başlık</dt>
                <dd className="mt-1 text-slate-100">{title}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-300">Slug</dt>
                <dd className="mt-1 font-mono text-[11px] text-slate-200">
                  {slug || "(yok)"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-300">Terim anahtarı</dt>
                <dd className="mt-1 text-slate-100">
                  {termKey || <span className="text-slate-500">(yok)</span>}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-300">Meta açıklama</dt>
                <dd className="mt-1 text-slate-200">
                  {metaDesc || <span className="text-slate-500">(yok)</span>}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-300">Yayın tarihi</dt>
                <dd className="mt-1 text-slate-200">
                  {publishedAt
                    ? new Date(publishedAt).toLocaleString("tr-TR", {
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

          {/* Görsel durumu kartı */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold text-slate-50">
              Görsel Bilgisi
            </h2>
            <div className="mt-3 text-xs text-slate-200">
              <p className="mb-2">
                <span className="font-semibold text-slate-300">
                  Image prompt:
                </span>{" "}
                {imagePrompt || (
                  <span className="text-slate-500">(tanımlı değil)</span>
                )}
              </p>

              <p className="mb-2">
                <span className="font-semibold text-slate-300">
                  Ana görsel URL:
                </span>{" "}
                {mainImageUrl ? (
                  <span className="break-all text-slate-100">
                    {mainImageUrl}
                  </span>
                ) : (
                  <span className="text-slate-500">(henüz görsel yok)</span>
                )}
              </p>

              {mainImageUrl && (
                <div className="mt-3">
                  <div className="mb-1 text-[11px] text-slate-400">
                    Önizleme:
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mainImageUrl}
                      alt={title}
                      className="h-40 w-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Özet kartı */}
        <section className="mb-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold text-slate-50">
              Kısa Özet (summary)
            </h2>
            <p className="mt-2 text-xs text-slate-200 whitespace-pre-wrap">
              {summary || <span className="text-slate-500">(yok)</span>}
            </p>
          </div>
        </section>

        {/* HTML gövde önizleme */}
        <section>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-50">
              İçerik Gövdesi (HTML)
            </h2>
            {html ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <div
                  className="text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Bu terim için henüz HTML içerik bulunmuyor.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
