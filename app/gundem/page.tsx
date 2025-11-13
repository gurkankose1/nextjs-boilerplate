// app/gundem/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

type PollOption = {
  id: string;
  label: string;
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
  const [submitted, setSubmitted] = useState(false);

  const handleVote = () => {
    if (!selected) return;
    // İLERDE: Burada Firestore'a oy kaydı atacağız.
    setSubmitted(true);
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
            saldırılar kesinlikle kabul edilmez.
          </p>
        </header>

        {/* Anket + Gündem kutuları */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
          {/* Gündem Notları - İLERDE: Firestore'dan gerçek mesajlar gelecek */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:p-5 space-y-4">
            <h2 className="text-sm font-semibold text-sky-300 uppercase tracking-wide">
              Çalışanların Gündemi
            </h2>
            <p className="text-sm text-slate-300">
              Buraya yakında; kullanıcıların açtığı başlıklar, en çok konuşulan
              şirketler ve en çok etkileşim alan tartışmalar gelecek.
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• TGS 2025 zamları ve farklı birimlerdeki yansımaları</li>
              <li>• IGA yemek / servis hizmetleri ile ilgili yorumlar</li>
              <li>• Vardiya planlarının aile hayatına etkisi</li>
              <li>• Yer hizmetleri ekipman kalitesi ve iş güvenliği</li>
            </ul>
            <p className="text-xs text-slate-500">
              İLERİ AŞAMA: Firestore üzerinde{" "}
              <code className="bg-slate-800 px-1 rounded">
                gundem_threads
              </code>{" "}
              ve{" "}
              <code className="bg-slate-800 px-1 rounded">
                gundem_messages
              </code>{" "}
              koleksiyonları ile gerçek zamanlı sohbet/yorum sistemi
              kurulacak. Şu anda tasarım ve kurguyu hazırlıyoruz.
            </p>
          </section>

          {/* Günlük Anket */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:p-5 space-y-4">
            <h2 className="text-sm font-semibold text-emerald-300 uppercase tracking-wide">
              Günün Anketi
            </h2>
            <p className="text-sm text-slate-200">{DAILY_POLL_QUESTION}</p>

            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleVote();
              }}
            >
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
                disabled={!selected || submitted}
                className="mt-2 inline-flex items-center rounded-full bg-emerald-500/90 px-4 py-1.5 text-xs font-semibold text-slate-950 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-emerald-400 transition"
              >
                {submitted ? "Oy kullanıldı" : "Oylamaya katıl"}
              </button>
            </form>

            {submitted && (
              <p className="text-xs text-emerald-300">
                Teşekkürler! Bu anketin sonuçlarını ileride “haber” formatında
                yayınlayarak çalışanların sesini daha görünür hale
                getireceğiz.
              </p>
            )}

            <p className="text-[11px] text-slate-500">
              İLERİ AŞAMA: Bu anketler Firestore&apos;a{" "}
              <code className="bg-slate-800 px-1 rounded">polls</code> ve{" "}
              <code className="bg-slate-800 px-1 rounded">
                poll_votes
              </code>{" "}
              koleksiyonları olarak kaydedilecek. Bazı anketler, editör
              yorumuyla birlikte manşet haberi olarak da yayınlanabilecek.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
