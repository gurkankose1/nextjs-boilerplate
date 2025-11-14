// app/admin/blog-terms/[id]/page.tsx
import { adminDb } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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

  // 2) Firestore'dan ilgili dokümanı çek (hata üretmemesi için çok defansif)
  let data: any = null;
  try {
    const docRef = adminDb.collection("blog_posts").doc(id);
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
              {id}
            </p>
          </div>
        </main>
      );
    }

    data = snap.data() || null;
  } catch (err: any) {
    // Firestore tarafında bir exception olursa, sayfayı çökerteceğine
    // ekranda basit bir hata gösterelim.
    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
          <h1 className="text-xl font-semibold mb-4">
            Sunucu tarafında bir hata oluştu
          </h1>
          <p className="text-sm text-slate-300">
            Firestore&apos;dan doküman okunurken bir sorun oluştu.
          </p>
          <p className="mt-4 text-xs text-red-300 whitespace-pre-wrap">
            {String(err?.message || err)}
          </p>
        </div>
      </main>
    );
  }

  // 3) Veriyi ham JSON olarak göster
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
            {id}
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
