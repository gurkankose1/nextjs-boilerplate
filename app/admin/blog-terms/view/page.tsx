// app/admin/blog-terms/view/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/adminAuth";
import { AdminBlogTermViewClient } from "@/components/admin/AdminBlogTermViewClient";

export const revalidate = 0;

export default async function AdminBlogTermViewPage() {
  // Admin oturum kontrolü (server tarafında)
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE_NAME);

  if (!session || session.value !== "1") {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <header className="mb-6 border-b border-slate-800 pb-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-sky-400">
            Admin / Blog – Havacılık Terimleri
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
            Terim Doküman Detayı
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Bu sayfa URL&apos;deki <code className="font-mono">?id=...</code>{" "}
            parametresini client tarafta okuyup Firestore&apos;dan ilgili blog
            dokümanını çeker. Önce ham JSON olarak göstereceğiz, sonra burayı
            tam bir editör ekranına çevireceğiz.
          </p>
        </header>

        {/* Asıl iş yapan client component */}
        <AdminBlogTermViewClient />
      </div>
    </main>
  );
}
