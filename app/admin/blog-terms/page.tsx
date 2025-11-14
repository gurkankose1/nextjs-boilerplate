// app/admin/blog-terms/page.tsx
import { adminDb } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/adminAuth";

export const revalidate = 0;

type BlogTerm = {
  id: string;
  title: string;
  slug: string;
  termKey?: string;
  publishedAt?: string | null;
  mainImageUrl?: string | null;
};

export default async function AdminBlogTermsPage() {
  // Basit admin oturum kontrolü
  const cookieStore = cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE_NAME);

  if (!session || session.value !== "1") {
    redirect("/admin/login");
  }

  // Firestore'dan son 50 terim blog yazısını çek
  const snap = await adminDb
    .collection("blog_posts")
    .orderBy("publishedAt", "desc")
    .limit(50)
    .get();

  const items: BlogTerm[] = snap.docs.map((doc) => {
    const data = doc.data() as any;
    return {
      id: doc.id,
      title: data.title ?? "(Başlıksız)",
      slug: data.slug ?? "",
      termKey: data.termKey ?? "",
      publishedAt: data.publishedAt ?? null,
      mainImageUrl: data.mainImageUrl ?? null,
    };
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:py-8">
        {/* Üst başlık */}
        <header className="mb-5 border-b border-slate-800 pb-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-sky-400">
            Admin / Blog – Havacılık Terimleri
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
            Otomatik Üretilen Terim Yazıları
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Burada cron ile otomatik üretilen havacılık terimi blog yazılarını
            görüyorsun. Bir sonraki adımda, buraya düzenleme formu ve AI görselini
            yeniden üretme butonları ekleyeceğiz.
          </p>
        </header>

        {/* Kayıt yoksa */}
        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
            Şu anda kayıtlı hiçbir terim blog yazısı bulunamadı. cron-job.org üzerinden
            <span className="font-mono text-sky-300">
              {" /api/cron/blog "}
            </span>
            endpoint&apos;ini tetiklediğinden ve Firestore&apos;da
            <span className="font-mono text-sky-300"> blog_posts </span>
            koleksiyonunda veri oluştuğundan emin ol.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
            <table className="min-w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Başlık</th>
                  <th className="px-4 py-3">Terim Anahtarı</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Yayın Tarihi</th>
                  <th className="px-4 py-3 text-center">Görsel</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-900/80 hover:bg-slate-900/60"
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="max-w-xs">
                        <div className="text-[13px] font-medium text-slate-50">
                          {item.title}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          ID:{" "}
                          <span className="font-mono text-slate-400">
                            {item.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-[11px] text-slate-300">
                      {item.termKey || "-"}
                    </td>
                    <td className="px-4 py-3 align-top text-[11px] text-slate-300">
                      <span className="font-mono text-slate-200">
                        {item.slug || "(slug yok)"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-[11px] text-slate-300">
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleString("tr-TR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td className="px-4 py-3 align-top text-center text-[11px]">
                      {item.mainImageUrl ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-900/40 px-2 py-[2px] text-emerald-300">
                          Var
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-slate-800 px-2 py-[2px] text-slate-300">
                          Yok
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
