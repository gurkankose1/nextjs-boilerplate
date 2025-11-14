// app/admin/blog-terms/[id]/page.tsx
import { adminDb } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/adminAuth";

export const revalidate = 0;

type PageProps = {
  params: { id?: string | string[] };
};

export default async function AdminBlogTermDetailPage({ params }: PageProps) {
  // 1) Admin oturum kontrolü
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE_NAME);

  if (!session || session.value !== "1") {
    redirect("/admin/login");
  }

  // 2) URL'den gelen id parametresini güvenli şekilde normalize et
  const rawId = params?.id;
  const id =
    typeof rawId === "string"
      ? rawId
      : Array.isArray(rawId)
      ? rawId[0]
      : "";

  const normalizedId = (id ?? "").trim();

  // Eğer id boşsa, Firestore'a hiç gitmeden kullanıcıya göster
  if (!normalizedId) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
          <h1 className="mb-4 text-xl font-semibold">
            Geçersiz ID parametresi
          </h1>
          <p className="text-sm text-slate-300 mb-3">
            URL&apos;den alınan <code className="font-mono">id</code> parametresi
            boş veya kullanılamaz durumda. Bu nedenle Firestore&apos;a istek
            yapılmadı.
          </p>
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
            <div className="text-xs text-slate-400 mb-1">
              params.id (ham değer):
            </div>
            <pre className="max-h-64 overflow-auto rounded bg-slate-950/80 p-2 font-mono text-[11px] text-sky-200">
{JSON.stringify(rawId, null, 2)}
            </pre>
          </div>
        </div>
      </main>
    );
  }

  // 3) Firestore'dan ilgili dokümanı çek
  let data: any = null;
  try {
    const docRef = adminDb.collection("blog_posts").doc(normalizedId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return (
        <main className="min-h-screen bg-slate-950 text-slate-50">
          <div className="mx-auto w-full max-w-3xl px-4 py-10">
            <h1 className="text-xl font-semibold mb-4">
              Kayıt bulunamadı
            </h1>
            <p className="text-sm text-slate-300">
              blog_posts koleksiyonunda bu ID ile bir kayıt bulunamadı:
            </p>
            <p className="mt-2 font-mono text-xs text-slate-200 break-all">
              {normalizedId}
            </p>
          </div>
        </main>
      );
    }

    data = snap.data() || null;
  } catch (err: any) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
          <h1 className="text-xl font-semibold mb-4">
            Sunucu tarafında bir hata oluştu
          </h1>
          <p className="text-sm text-slate-300 mb-3">
            Firestore&apos;dan doküman okunurken bir sorun oluştu.
          </p>
          <p className="mt-2 text-xs text-red-300 whitespace-pre-wrap">
            {String(err?.message || err)}
          </p>
          <div className="mt-4 text-[11px] text-slate-500">
            Doküman ID (normalize edilmiş):{" "}
            <span className="font-mono text-slate-200">{normalizedId}</span>
          </div>
        </div>
      </main>
    );
  }

  // 4) Veriyi ham JSON olarak göster
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <header className="mb-6 border-b border-slate-800 pb-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-sky-400">
            Admin / Blog – Havacılık Terimleri
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
            Terim Doküman Detayı (Ham JSON Görünümü)
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Şu an debug modundayız. Bu sayfa Firestore&apos;daki dokümanı olduğu gibi
            JSON formatında gösteriyor. Önce hatasız çalıştığından emin olalım,
            ardından burayı tekrar şık bir detay/düzenleme ekranına çevireceğiz.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-50">
            Doküman ID
          </h2>
          <p className="font-mono text-[11px] text-slate-200 break-all mb-4">
            {normalizedId}
          </p>

          <h2 className="mb-2 text-sm font-semibold text-slate-50">
            Doküman Verisi (JSON)
          </h2>
          <pre className="max-h-[480px] overflow-auto rounded-xl bg-slate-950/80 p-3 font-mono text-[11px] text-sky-200">
{JSON.stringify(data, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
