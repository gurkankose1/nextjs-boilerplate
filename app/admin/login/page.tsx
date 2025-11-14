// app/admin/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Giriş başarısız");
        setLoading(false);
        return;
      }

      // Başarılı giriş → admin blog terim listesine gidelim
      router.push("/admin/blog-terms");
    } catch (err) {
      console.error(err);
      setError("Beklenmeyen bir hata oluştu");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-950/40">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-400">
            SkyNews.Tr
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50">
            Admin Girişi
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Bu panel sadece yönetici ve editörler içindir. Lütfen kullanıcı adı
            ve şifreni gir.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-200">
                Kullanıcı adı
              </label>
              <input
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-200">
                Şifre
              </label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-sky-400 disabled:opacity-60"
            >
              {loading ? "Giriş yapılıyor..." : "Giriş yap"}
            </button>
          </form>

          <p className="mt-4 text-[11px] text-slate-500">
            Varsayılan bilgiler: <span className="font-mono">admin</span> /
            <span className="font-mono"> Gg.113355</span> (env üzerinden
            tanımlanıyor).
          </p>
        </div>
      </div>
    </main>
  );
}
