// app/gundem/page.tsx
import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";

type GundemMessage = {
  id: string;
  displayName: string;
  company?: string | null;
  message: string;
  createdAt: string | null;
};

async function getLatestMessages(): Promise<GundemMessage[]> {
  const snap = await adminDb
    .collection("gundem_messages")
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() || {};
    const createdAt =
      typeof data.createdAt === "string"
        ? data.createdAt
        : typeof (data.createdAt as any)?.toDate === "function"
        ? (data.createdAt as any).toDate().toISOString()
        : null;

    return {
      id: doc.id,
      displayName: data.displayName || "Anonim",
      company: data.company || null,
      message: data.message || "",
      createdAt,
    };
  });
}

export const revalidate = 60;

export default async function GundemPage() {
  const messages = await getLatestMessages();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Başlık */}
        <header className="mb-6 border-b border-slate-800 pb-4">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-sky-400">
            GÜNDEM HAVACILIK
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-50">
            SkyNews.Tr okurlarının buluşma noktası
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Ramp, kule, yer hizmetleri, teknik, kabin, operasyon… Havacılığın
            nabzını tutan herkes burada. Gündemi konuşun, deneyim paylaşın,
            soru sorun, dertleşin.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          {/* Sol kolon */}
          <div className="space-y-6">
            {/* Mesaj formu (şimdilik pasif / soon) */}
            <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    Gündeme mesaj bırak
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    Bu alan şu an sadece tasarım amaçlı pasif. Bir sonraki
                    adımda /api/gundem/messages endpoint’ine bağlayıp gerçek
                    zamanlı mesaj gönderimi etkinleştireceğiz.
                  </p>
                </div>
                <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                  Yakında aktif olacak
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">
                    Rumuz / Görünecek isim
                  </label>
                  <input
                    disabled
                    className="h-9 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 text-xs text-slate-300 placeholder:text-slate-600"
                    placeholder="Örn: Ramp34, ATCspotter..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">
                    Şirket / Birim (opsiyonel)
                  </label>
                  <input
                    disabled
                    className="h-9 w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 text-xs text-slate-300 placeholder:text-slate-600"
                    placeholder="Örn: Yer hizmeti, ATC, Hava yolu, TGS..."
                  />
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <label className="text-[11px] text-slate-400">
                  Mesaj (gündem, yaşadığın olayı, sorunu, fikrini yaz)
                </label>
                <textarea
                  disabled
                  rows={4}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-slate-300 placeholder:text-slate-600"
                  placeholder="Bu alan bir sonraki adımda aktif olacak. Gündemde ne varsa yazabileceksin..."
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <button
                  disabled
                  className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-400"
                >
                  Mesaj gönder • Çok yakında
                </button>
                <p className="flex-1 text-[10px] text-slate-500">
                  Kurallar: Kişisel hedef gösterme, hakaret, küfür, ifşa ve
                  ticari reklam içerikleri yayına alınmaz; moderasyon ekibi
                  dilediği mesajı tutma / silme hakkını kullanır.
                </p>
              </div>
            </section>

            {/* Son mesajlar */}
            <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-100">
                  Son mesajlar
                </h2>
                <p className="text-[11px] text-slate-400">
                  Toplam {messages.length} mesaj gösteriliyor
                </p>
              </div>

              <div className="space-y-2">
                {messages.map((msg) => {
                  const created =
                    msg.createdAt && !Number.isNaN(Date.parse(msg.createdAt))
                      ? new Date(msg.createdAt)
                      : null;

                  return (
                    <div
                      key={msg.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-medium text-slate-100">
                          {msg.displayName}
                          {msg.company && (
                            <span className="text-[10px] text-slate-400">
                              {" "}
                              • {msg.company}
                            </span>
                          )}
                        </div>
                        {created && (
                          <div className="text-[10px] text-slate-500">
                            {created.toLocaleDateString("tr-TR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-200">
                        {msg.message}
                      </p>
                    </div>
                  );
                })}

                {messages.length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    Henüz kayıtlı bir gündem mesajı yok. İlk mesajı sen
                    yazacaksın.
                  </p>
                )}
              </div>
            </section>
          </div>

          {/* Sağ kolon */}
          <div className="space-y-6">
            {/* Kurallar kutusu */}
            <aside className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
              <h2 className="mb-2 text-sm font-semibold text-slate-100">
                Kısa kurallar
              </h2>
              <ul className="list-disc space-y-1 pl-4 text-[11px] text-slate-300">
                <li>Kişi ve kurum isimleri hedef gösterilemez.</li>
                <li>
                  Küfür, hakaret ve ifşa içeren mesajlar yayına alınmaz.
                </li>
                <li>
                  Operasyonel sır sayılabilecek hassas bilgiler
                  paylaşma.
                </li>
                <li>
                  Moderasyon ekibi, gerekli gördüğü mesajları saklama /
                  silme hakkına sahiptir.
                </li>
              </ul>
            </aside>

            {/* Ana sayfaya dön */}
            <aside className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
              <h2 className="mb-2 text-sm font-semibold text-slate-100">
                Ana sayfaya dön
              </h2>
              <p className="mb-4 text-[11px] text-slate-400">
                Gündemi okuduktan sonra, editörlü havacılık haberlerine
                devam etmek için ana sayfaya dönebilirsin.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-400"
              >
                Ana sayfaya dön
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
