
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Persona } from '@/lib/personas'; 

export default function NewArticlePage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState('');
  const [topic, setTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Sayfa yüklendiğinde sanal yazarları çekmek için API route'u
  useEffect(() => {
    async function fetchPersonas() {
      try {
        const response = await fetch('/api/admin/personas');
        if (!response.ok) {
          throw new Error('Yazarlar yüklenemedi.');
        }
        const data = await response.json();
        setPersonas(data.personas);
      } catch (err: any) {
        setError(err.message);
      }
    }
    fetchPersonas();
  }, []);

  const handleGenerate = async () => {
    if (!selectedPersona || !topic) {
      setError('Lütfen bir yazar seçin ve bir konu belirtin.');
      return;
    }
    setLoading(true);
    setError('');
    setGeneratedContent('');
    setTitle('');

    try {
      const response = await fetch('/api/admin/articles/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: selectedPersona, topic }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'İçerik üretilemedi.');
      }

      const { title, content } = await response.json();
      setTitle(title);
      setGeneratedContent(content);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title || !generatedContent || !selectedPersona) {
      setError('Kaydedilecek başlık, içerik ve yazar bilgisi mevcut değil.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/admin/articles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: generatedContent, personaId: selectedPersona }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'İçerik kaydedilemedi.');
      }
      
      // Başarılı kayıttan sonra kullanıcıyı bilgilendir ve yönlendir
      alert('İçerik başarıyla kaydedildi ve yayımlandı!');
      router.push('/admin'); // veya makale listesine yönlendirilebilir
      router.refresh();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };


  return (
    <main className="min-h-screen p-4 sm:p-8 md:p-12 lg:p-24 bg-dots text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-50 mb-8">Otomatik İçerik Üretimi</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* ADIM 1: Kontrol Paneli */}
          <div className="md:col-span-1 space-y-6">
            <div>
              <label htmlFor="persona" className="block text-sky-400 text-sm font-bold mb-2">1. Yazar Seçin</label>
              <select
                id="persona"
                value={selectedPersona}
                onChange={(e) => setSelectedPersona(e.target.value)}
                className="shadow-inner appearance-none border border-slate-700 rounded-lg w-full py-2 px-3 bg-slate-800/60 text-slate-50 leading-tight focus:outline-none focus:ring-2 focus:ring-sky-600"
              >
                <option value="">Bir sanal yazar seçin...</option>
                {personas.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="topic" className="block text-sky-400 text-sm font-bold mb-2">2. Konuyu Belirtin</label>
              <textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="shadow-inner appearance-none border border-slate-700 rounded-lg w-full py-2 px-3 bg-slate-800/60 text-slate-50 leading-tight focus:outline-none focus:ring-2 focus:ring-sky-600 h-24"
                placeholder="Örn: Airbus A350’nin yeni yakıt verimliliği teknolojileri"
              />
            </div>

            <button onClick={handleGenerate} disabled={loading || saving} className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-4 rounded-lg disabled:bg-slate-600 transition-colors flex items-center justify-center">
              {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
              ) : (
                '3. Haberi Oluştur'
              )}
            </button>

            {error && <p className="text-red-500 text-xs italic mt-4">{error}</p>}
          </div>

          {/* ADIM 2: İçerik Editörü */}
          <div className="md:col-span-2">
             <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40 min-h-[400px]">
                {generatedContent ? (
                  <div className="prose prose-invert max-w-none">
                    <input 
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      className="text-2xl font-bold bg-transparent border-b-2 border-slate-700 w-full mb-4 p-1 focus:outline-none focus:border-sky-500"
                    />
                    <textarea
                      value={generatedContent}
                      onChange={(e) => setGeneratedContent(e.target.value)}
                      className="w-full h-96 bg-transparent text-slate-300 focus:outline-none resize-none"
                    />
                     <div className="mt-6 flex justify-end gap-4">
                        <button onClick={() => { setGeneratedContent(''); setTitle('');}} disabled={saving} className="text-sm font-semibold text-slate-400 hover:text-slate-200 disabled:text-slate-600">Temizle</button>
                        <button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-600">
                            {saving ? 'Kaydediliyor...' : 'Kaydet ve Yayımla'}
                        </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                    <p className="font-semibold">İçerik burada görünecek.</p>
                    <p className="text-sm">Başlamak için bir yazar seçip konuyu belirtin ve 'Haberi Oluştur' butonuna tıklayın.</p>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </main>
  );
}
