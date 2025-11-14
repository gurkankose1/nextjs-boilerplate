// app/admin/page.tsx

export const revalidate = 0;

const NAV_ITEMS = [
  { key: "dashboard", label: "Genel Bakış", badge: "studio" },
  { key: "drafts", label: "Haber Taslakları", badge: "articles" },
  { key: "blog-terms", label: "Blog – Havacılık Terimleri", badge: "blog" },
  { key: "gundem", label: "Gündem Mesajları", badge: "chat" },
  { key: "polls", label: "Haftalık Anketler", badge: "beta" },
];

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-6 lg:py-8">
        {/* SOL: Sidebar */}
        <aside className="hidden w-60 flex-shrink-0 flex-col rounded-2xl border border-slate-800 bg-slate-950/60 p-4 shadow-lg shadow-slate-950/40 lg:flex">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-400">
              SkyNews.Tr
            </p>
            <p className="text-sm font-semibold text-slate-50">
              Editör Studio / Admin
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Haberler, blog yazıları, gündem mesajları ve anketleri buradan
              yöneteceksin.
            </p>
          </div>

          <nav className="space-y-1 text-sm">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-slate-300 hover:bg-slate-900 hover:text-sky-300"
              >
                <span>{item.label}</span>
                <span className="rounded-full bg-slate-900 px-2 py-[2px] text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  {item.badge}
                </span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-4 text-[11px] text-slate-500">
            İlk aşamada sadece okuma ve temel düzenleme ekranları gelecek.
            Daha sonra yayın akışı, loglar ve yetkilendirme eklenecek.
          </div>
        </aside>

        {/* SAĞ: İçerik alanı */}
        <section className="flex-1">
          {/* Üst başlık */}
          <header className="mb-5 border-b border-slate-800 pb-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-sky-400">
              Admin / Editör Paneli
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
              SkyNews.Tr Studio&apos;ya hoş geldin
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Burası sadece editörlerin ve yöneticilerin göreceği arka ofis.
              Haber taslaklarını, havacılık terimi blog yazılarını, Gündem
              Havacılık mesajlarını ve haftalık anketleri buradan
              yöneteceğiz.
            </p>
          </header>

          {/* Bilgi kartları */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/40">
              <h2 className="text-sm font-semibold text-slate-50">
                Haber Taslakları
              </h2>
              <p className="mt-2 text-xs text-slate-300">
                RSS ile gelen haberler önce taslak olarak kaydedilecek. Burada
                başlık, kategori, kapak görseli ve SEO alanlarını düzenleyip
                tek tıkla yayına alabileceksin.
              </p>
              <p className="mt-3 text-[11px] text-slate-500">
                Bir sonraki adımda buraya gerçek taslak listesini bağlayacağız.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/40">
              <h2 className="text-sm font-semibold text-slate-50">
                Blog – Havacılık Terimleri
              </h2>
              <p className="mt-2 text-xs text-slate-300">
                Otomatik üretilen terim yazılarını burada düzenleyebileceksin.
                Başlık, slug, HTML gövde, image prompt ve AI / stok görseller
                buradan yönetilecek.
              </p>
              <p className="mt-3 text-[11px] text-slate-500">
                Şimdilik sadece iskelet; ileride &quot;düzenle&quot; formu ve
                &quot;AI görselini yeniden üret&quot; butonu eklenecek.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/40">
              <h2 className="text-sm font-semibold text-slate-50">
                Gündem Havacılık Mesajları
              </h2>
              <p className="mt-2 text-xs text-slate-300">
                Gerçek zamanlı gelen sohbet mesajlarını buradan filtreleyip
                saklayacak veya gizleyeceğiz. Küfür / spam içeren mesajlar
                için hızlı moderasyon araçları eklenecek.
              </p>
              <p className="mt-3 text-[11px] text-slate-500">
                İlk aşamada sadece liste + görünür/gizli toggle gelecek.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/40">
              <h2 className="text-sm font-semibold text-slate-50">
                Haftalık Anketler
              </h2>
              <p className="mt-2 text-xs text-slate-300">
                Her hafta için tek bir aktif anket olacak. Soru ve seçenekleri
                buradan belirleyeceğiz. Haftası biten anketlerin sonuçları,
                otomatik olarak haber formatında yayımlanacak.
              </p>
              <p className="mt-3 text-[11px] text-slate-500">
                Anket mantığını daha sonra birlikte kurarız; şimdilik sadece
                panelde yerini işaretliyoruz.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
