// app/gundem/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

type PollOption = {
  id: string;
  label: string;
};

type Message = {
  id: string;
  displayName: string;
  company: string | null;
  message: string;
  createdAt: string | null;
};

type ApiListOk = {
  ok: true;
  messages: Message[];
};

type ApiErr = {
  ok: false;
  error: string;
};

const DAILY_POLL_QUESTION =
  "2025 için açıklanan zam oranlarından genel olarak memnun musunuz?";

const DAILY_POLL_OPTIONS: PollOption[] = [
  { id: "very-happy", label: "Evet, oldukça memnunum" },
  { id: "ok", label: "Kısmen memnunum" },
  { id: "not-happy", label: "Hayır, memnun değilim" },
  { id: "no-comment", label: "Fikrim yok / Kararsızım" },
];

export default function GundemPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [pollSubmitted, setPollSubmitted] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [company, setCompany] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);

  // Mesajları yükle
  useEffect(() => {
    let cancelled = false;

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        setMessageError(null);

        const res = await fetch("/api/gundem/messages", {
          method: "GET",
          cache: "no-store",
        });

        const json: ApiListOk | ApiErr = await res.json();

        if (cancelled) return;

        if (!json.ok) {
          setMessageError(json.error || "Mesajlar yüklenemedi.");
        } else {
          setMessages(json.messages);
        }
      } catch (err: any) {
        if (cancelled) return;
        setMessageError(
          "Mesajlar yüklenirken beklenmeyen bir hata oluştu."
        );
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    };

    loadMessages();

    // 30 saniyede bir listeyi tazele (hafif polling)
    const interval = setInterval(loadMessages, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleVoteSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selected || pollSubmitted) return;
    // İLERDE: Firestore'a oy kaydı
    setPollSubmitted(true);
  };

  const handleMessageSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    try {
      setSending(true);
      setMessageError(null);

      const res = await fetch("/api/gundem/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || "Anonim kullanıcı",
          company: company.trim() || null,
          message: messageText.trim(),
        }),
      });

      const json: ApiListOk | ApiErr = await res.json();

      if (!json.ok) {
        setMessageError(json.error || "Mesaj gönderilemedi.");
      } else {
        setMessages(json.messages);
        setMessageText("");
      }
    } catch (err: any) {
      setMessageError("Mesaj gönderilirken bir hata oluştu.");
    } finally {
      setSending(false);
    }
  };

  const formatDate = (iso: string | null): string => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("tr-TR");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8 md:px-8 lg:px-16">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <nav className="text-xs text-slate-400 flex items-center gap-2">
          <Link href="/" className="hover:text-sky-300 transition">
            Ana Sayfa
          </Link>
          <span>/</span>
          <span className="text-slate-500">Gündem Havacılık</span>
        </nav>

        {/* Başlık */}
        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Gündem Havacılık
          </h1>
          <p className="text-sm md:text-base text-slate-300 max-w-3xl">
            Bu alan, havacılık çalışanlarının sesi olmak için tasarlandı.
            Havalimanları, havayolları, yer hizmetleri, yükleme ekipleri,
            operasyon, planlama, vardiya düzeni, sosyal haklar, yemek ve
            servis gibi konularda deneyimlerini paylaşabilir, gündemi
            tartışabilir ve sektörde nelerin iyileştirilmesi gerektiğine
            birlikte ışık tutabiliriz.
          </p>
          <p className="text-xs text-slate-500 max-w-3xl">
            Not: Lütfen paylaşımlarınızda kişi isimleri, TC kimlik numarası,
            telefon gibi kişisel veriler paylaşmayın. Marka ve kurumlar
            eleştirilebilir; ancak hakaret, iftira, tehdit ve kişisel
            saldırılar kesinlikle kabul edilmez. Gerekli görülen içerikler
            yayından kaldırılabilir.
          </p>
        </header>

        {/* Ana grid: SOL = sohbet, SAĞ = anket */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
          {/* SOL: Gündem Chat */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-sky-300 uppercase tracking-wide">
                Çalışanların Gündemi (Sohbet)
              </h2>
              <span className="text-[11px] text-slate-500">
                Son 50 mesaj gösterilir
              </span>
            </div>

            {/* Mesaj gönderme formu */}
            <form
              onSubmit={handleMessageSubmit}
              className="space-y-3 border border-slate-800/80 rounded-lg bg-slate-950/40 p-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">
                    Görünecek isim (takma ad)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Örn: Apron Şefi, TGS Yükleme, Hava Trafikçi"
                    className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-400">
                    Kurum / Birim (isteğe bağlı)
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Örn: TGS, Havaş, IGA, THY Teknik..."
                    className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400">
                  Mesajınız
                </label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={3}
                  placeholder="Sektörle ilgili düşüncelerinizi, yaşadığınız sorunları veya iyi uygulama örneklerini paylaşabilirsiniz."
                  className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-400 resize-y"
                />
              </div>

              {messageError && (
                <p className="text-[11px] text-rose-400">{messageError}</p>
              )}

              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-slate-500">
                  Mesajlar editörler tarafından geriye dönük olarak
                  incelenebilir. Hukuka aykırı içerikler silinebilir.
                </p>
                <button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className="inline-flex items-center rounded-full bg-sky-500/90 px-4 py-1.5 text-[11px] font-semibold text-slate-950 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-sky-400 transition"
                >
                  {sending ? "Gönderiliyor..." : "Mesajı paylaş"}
                </button>
              </div>
            </form>

            {/* Mesaj listesi */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                  Son mesajlar
                </h3>
                {loadingMessages && (
                  <span className="text-[10px] text-slate-500">
                    Yükleniyor...
                  </span>
                )}
              </div>

              {messageError && !sending && (
                <p className="text-xs text-rose-400">{messageError}</p>
              )}

              <div className="mt-1 max-h-[420px] overflow-y-auto space-y-2 pr-1">
                {messages.length === 0 && !loadingMessages ? (
                  <p className="text-xs text-slate-500">
                    Henüz mesaj yok. İlk paylaşımı yapan sen olabilirsin.
                  </p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="font-semibold text-sky-300">
                          {msg.displayName}
                        </span>
                        {msg.company && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">
                            {msg.company}
                          </span>
                        )}
                        {msg.createdAt && (
                          <span className="text-slate-500 ml-auto text-[10px]">
                            {formatDate(msg.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-100 whitespace-pre-wrap">
                        {msg.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* SAĞ: Günlük Anket */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:p-5 space-y-4">
            <h2 className="text-sm font-semibold text-emerald-300 uppercase tracking-wide">
              Günün Anketi
            </h2>
            <p className="text-sm text-slate-200">{DAILY_POLL_QUESTION}</p>

            <form className="space-y-3" onSubmit={handleVoteSubmit}>
              {DAILY_POLL_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="daily-poll"
                    value={opt.id}
                    checked={selected === opt.id}
                    onChange={() => setSelected(opt.id)}
                    className="h-3 w-3 accent-emerald-400"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}

              <button
                type="submit"
                disabled={!selected || pollSubmitted}
                className="mt-2 inline-flex items-center rounded-full bg-emerald-500/90 px-4 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-emerald-400 transition"
              >
                {pollSubmitted ? "Oy kullanıldı" : "Oylamaya katıl"}
              </button>
            </form>

            {pollSubmitted && (
              <p className="text-xs text-emerald-300">
                Teşekkürler! Bu anketin sonuçlarını ileride “haftalık anket
                sonuçları” başlığıyla anasayfada yayınlayacağız.
              </p>
            )}

            <p className="text-[11px] text-slate-500">
              İLERİ AŞAMA: Anketler Firestore&apos;a{" "}
              <code className="bg-slate-800 px-1 rounded">polls</code> ve{" "}
              <code className="bg-slate-800 px-1 rounded">
                poll_votes
              </code>{" "}
              koleksiyonları olarak kaydedilecek. Anketler hafta başında
              başlayıp hafta sonunda kapanacak ve sonuçlar haber formatında
              paylaşılacak.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
