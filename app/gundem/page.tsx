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

const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME && process.env.NEXT_PUBLIC_SITE_NAME.trim()
    ? process.env.NEXT_PUBLIC_SITE_NAME
    : "SkyNews.Tr";

export const revalidate = 30;

async function getLatestMessages(): Promise<GundemMessage[]> {
  const snap = await adminDb
    .collection("gundem_messages")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() || {};
    return {
      id: doc.id,
      displayName: data.displayName || "Anonim",
      company: data.company || null,
      message: data.message || "",
      createdAt: data.createdAt || null,
    };
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function GundemPage() {
  const messages = await getLatestMessages();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6">
        {/* HEADER – İKİ SÜTUNUN ÜSTÜNDE TAM GENİŞLİK */}
        <header className="border-b border-slate-800 pb-4 mb-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-sky-400 mb-1">
            Gündem Havacılık
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">
            {SITE_NAME} okurlarının buluşma noktası
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Ramp, kule, yer hizmetleri, teknik, kabin, operasyon… Havacılığın
            nabzını tutan herkes burada. Gündemi konuşun, deneyim paylaşın,
            soru sorun, dertleşin.
          </p>
        </header>

        {/* ALT: 2 SÜTUN GRID – SOLDA GÜNDEM, SAĞDA ANKET + KUTULAR */}
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          {/* SOL SÜTUN: MESAJ FORMU + AKIŞ */}
          <section className="space-y-4">
            {/* Mesaj yazma alanı – şimdilik pasif tasarım */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-100">
                  Gündeme mesaj bırak
                </h2>
                <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
                  Yakında aktif olacak
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Bu alan şu an sadece tasarım amacıyla pasif. Bir sonraki adımda
                burayı /api/gundem/messages endpoint&apos;ine bağlayıp gerçek
                zamanlı mesaj göndermeyi etkinleştireceğiz.
              </p>

              <div className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] mb-3">
                <div className="space-y-2">
                  <label className="block">
                    <span className="text-[11px] text-slate-300">
                      Rumuz / Görünecek isim
                    </span>
                    <input
                      type="text"
                      disabled
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 placeholder:text-slate-600 cursor-not-allowed"
                      placeholder="Örn: Rampçı34, ATCspotter..."
                    />
                  </label>
                </div>
                <div className="space-y-2">
                  <label className="block">
                    <span className="text-[11px] text-slate-300">
                      Şirket / Birim (opsiyonel)
                    </span>
                    <input
                      type="text"
                      disabled
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 placeholder:text-slate-600 cursor-not-allowed"
                      placeholder="Örn: Yer Hizmeti, ATC, Hava yolu, Teknik..."
                    />
                  </label>
                </div>
              </div>

              <label className="block mb-3">
                <span className="text-[11px] text-slate-300">
                  Mesajın (gündemi, yaşadığın olayı, sorunu, fikrini yaz)
                </span>
                <textarea
                  rows={4}
                  disabled
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-400 placeholder:text-slate-600 cursor-not-allowed resize-none"
                  placeholder="Bu alan bir sonraki adımda aktif olacak. Gündemde ne varsa yazabileceksin..."
                />
              </label>

              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-800/80 px-4 py-2 text-[11px] font-semibold text-slate-400 cursor-not-allowed"
              >
                Mesaj gönder • Çok yakında
              </button>

              <p className="mt-2 text-[10px] text-slate-500">
                Kurallar: Kişisel hedef gösterme, hakaret, küfür, ifşa ve ticari
                reklam içerikleri yayına alınmaz; moderasyon ekibi dilediği
                mesajı saklı tutma / silme hakkını kullanır.
              </p>
            </section>

            {/* Mesaj listesi */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-100">
                  Son mesajlar
                </h2>
                <span className="text-[11px] text-slate-500">
                  Toplam {messages.length} mesaj gösteriliyor
                </span>
              </div>

              {messages.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Henüz Gündem Havacılık&apos;a mesaj gelmemiş. İlk yorumu sen
                  yazacaksın – birazdan bu alanı aktif edeceğiz.
                </p>
              ) : (
                <ul className="space-y-3">
                  {messages.map((msg) => (
                    <li
                      key={msg.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2.5"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className="flex flex-col">
                          <span className="text-[11px] font-semibold text-sky-300">
                            {msg.displayName}
                            {msg.company ? (
                              <span className="text-slate-400">
                                {" "}
                                · {msg.company}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        {msg.createdAt && (
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">
                            {formatDate(msg.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-100 whitespace-pre-line">
                        {msg.message}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </section>

          {/* SAĞ SÜTUN: HAFTANIN ANKETİ + KUTULAR */}
          <aside className="w-full space-y-4">
            {/* Haftanın Anketi - geniş kart */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h2 className="text-sm uppercase tracking-[0.18em] text-slate-300 mb-1">
                Haftanın Anketi
              </h2>
              <p className="text-[11px] text-slate-400 mb-3">
                Bu sayfada gördüğün anket tasarımı şu an sahte verilerle
                çalışıyor. Bir sonraki adımda burayı /api/polls/active ve
                /api/polls/vote endpoint&apos;lerine bağlayacağız.
              </p>

              <p className="text-xs font-medium text-slate-100 mb-3">
                Sizce şu anda Türkiye&apos;de havacılık sektörünü en çok zorlayan
                başlık hangisi?
              </p>

              <form className="space-y-1.5">
                {[
                  "Slot / kapasite kısıtları",
                  "Personel planlama ve vardiya yükü",
                  "Bakım / teknik operasyon maliyetleri",
                  "Regülasyon ve otorite süreçleri",
                ].map((opt, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-2 text-[11px] text-slate-200"
                  >
                    <input
                      type="radio"
                      name="weekly-poll-gundem-preview"
                      className="h-3 w-3 rounded border-slate-600 bg-slate-900"
                      disabled
                    />
                    <span>{opt}</span>
                  </label>
                ))}

                <button
                  type="button"
                  disabled
                  className="mt-2 w-full rounded-full bg-slate-800 text-[11px] font-semibold text-slate-400 py-2 border border-slate-700 cursor-not-allowed"
                >
                  Yakında oy kullanabileceksiniz
                </button>
              </form>

              <p className="mt-3 text-[10px] text-slate-500">
                Haftalık anket sonuçları, her hafta sonu otomatik olarak haber
                formatında yayımlanacak:{" "}
                <span className="text-sky-300">
                  “Haftalık Anket Sonuçları – [Soru]”
                </span>
                .
              </p>
            </section>

            {/* Bilgi kutusu: Gündem kuralları */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="text-xs font-semibold text-slate-100 mb-1">
                Kısa kurallar
              </h3>
              <ul className="space-y-1.5 text-[11px] text-slate-400">
                <li>• Kişi ve kurum isimleri hedef gösterilmez.</li>
                <li>• Küfür, hakaret ve ifşa içeren mesajlar yayına alınmaz.</li>
                <li>
                  • Operasyonel sır sayılabilecek hassas bilgiler paylaşılmaz.
                </li>
                <li>
                  • Moderasyon ekibi, gerekli gördüğü mesajları saklama / silme
                  hakkına sahiptir.
                </li>
              </ul>
            </section>

            {/* Bilgi kutusu: Ana sayfaya dönüş */}
            <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <h3 className="text-xs font-semibold text-slate-100 mb-1">
                Ana sayfaya dön
              </h3>
              <p className="text-[11px] text-slate-400 mb-2">
                Gündemi okuduktan sonra, editörlü havacılık haberlerine devam
                etmek için ana sayfaya dönebilirsin.
              </p>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-sky-500/60 bg-sky-500/10 px-4 py-1.5 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20 transition"
              >
                Ana sayfaya dön
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
