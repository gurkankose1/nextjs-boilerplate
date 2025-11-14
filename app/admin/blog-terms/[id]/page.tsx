// app/admin/blog-terms/[id]/page.tsx
import { adminDb } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/adminAuth";
import { BlogTermEditorClient } from "@/components/admin/BlogTermEditorClient";

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

  const initialData = {
    id,
    title: data.title ?? "",
    slug: data.slug ?? "",
    termKey: data.termKey ?? "",
    summary: data.summary ?? "",
    html: data.html ?? "",
    imagePrompt: data.imagePrompt ?? "",
    mainImageUrl: data.mainImageUrl ?? null,
    publishedAt: data.publishedAt ?? null,
    metaDesc: data.metaDesc ?? "",
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:py-8">
        {/* Breadcrumb / üst başlık */}
        <header className="mb-6 border-b border-slate-800 pb-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-sky-400">
            Admin / Blog – Havacılık Terimleri
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
            Terim Düzenleme
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Bu sayfada seçili havacılık terimi blog yazısının başlığını, slug&apos;ını,
            özetini, meta açıklamasını, HTML gövdesini ve image prompt&apos;unu
            düzenleyebilirsin. Şimdilik kaydet butonu sadece form verisini
            console.log ile yazıyor – bir sonraki adımda Firestore&apos;a kaydetme
            özelliği ekleyeceğiz.
          </p>
        </header>

        {/* Editör formu */}
        <BlogTermEditorClient initialData={initialData} />
      </div>
    </main>
  );
}
