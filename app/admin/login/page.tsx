// app/admin/login/page.tsx
export default function AdminLoginPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 px-6 py-6">
        <h1 className="text-lg font-semibold tracking-tight text-slate-50">
          Admin Girişi
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Lütfen yönetim paneline erişmek için kullanıcı adı ve şifrenizi girin.
        </p>

        <form
          action="/api/admin/login"
          method="POST"
          className="mt-4 space-y-4"
        >
          <div>
            <label className="block text-[11px] font-semibold text-slate-300">
              Kullanıcı Adı
            </label>
            <input
              name="username"
              autoComplete="username"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
              defaultValue="admin"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-300">
              Şifre
            </label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
              defaultValue="Gg.113355"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-sky-500 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
          >
            Giriş Yap
          </button>
        </form>

        <p className="mt-3 text-[10px] text-slate-500">
          Varsayılan bilgiler: <span className="font-mono">admin / Gg.113355</span>
        </p>
      </div>
    </main>
  );
}
