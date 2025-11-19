
'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewPersonaPage() {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAutoGenerate = async () => {
    if (!name) {
      setError('Lütfen yazar için bir isim veya unvan belirtin (örn: Kaptan Pilot, Uçak Teknisyeni).');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // 1. Biyografi (Prompt) oluştur
      const promptRes = await fetch('/api/admin/personas/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!promptRes.ok) throw new Error('Biyografi oluşturulamadı.');
      const { prompt: generatedPrompt } = await promptRes.json();
      setPrompt(generatedPrompt);

      // 2. Profil resmi (Avatar) oluştur
      const avatarRes = await fetch('/api/admin/personas/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }), 
      });
      if (!avatarRes.ok) throw new Error('Profil resmi oluşturulamadı.');
      const { avatar: generatedAvatar } = await avatarRes.json();
      setAvatar(generatedAvatar);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !prompt) {
      setError('İsim ve Prompt alanları zorunludur.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/personas/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, prompt, avatar }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Yazar oluşturulamadı.');
      }
      
      router.push('/admin/personas');
      router.refresh();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 md:p-12 lg:p-24 text-white bg-dots">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-lg shadow-slate-950/40">
        <h1 className="text-2xl font-semibold text-slate-50 mb-6">Yeni Sanal Yazar Oluştur</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-slate-400 text-sm font-bold mb-2">Yazar Adı / Unvanı</label>
            <div className="flex gap-2">
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-grow shadow-inner appearance-none border border-slate-700 rounded-lg w-full py-2 px-3 bg-slate-800/60 text-slate-50 leading-tight focus:outline-none focus:ring-2 focus:ring-sky-600"
                placeholder="Örn: Kaptan Pilot, Kabin Memuru, Hava Trafik Kontrolörü"
              />
              <button type="button" onClick={handleAutoGenerate} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-slate-600 transition-colors">
                {loading ? '...' : 'Oto-Oluştur'}
              </button>
            </div>
             <p className="mt-2 text-xs text-slate-500">Yazarın kimliğini (örn: Kaptan Pilot) girip "Oto-Oluştur"a tıklayarak yapay zekanın otomatik bir biyografi ve profil resmi oluşturmasını sağlayabilirsiniz.</p>
          </div>
          
          <div>
            <label htmlFor="prompt" className="block text-slate-400 text-sm font-bold mb-2">Biyografi / Prompt</label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="shadow-inner appearance-none border border-slate-700 rounded-lg w-full py-2 px-3 bg-slate-800/60 text-slate-50 leading-tight focus:outline-none focus:ring-2 focus:ring-sky-600 h-32"
              placeholder="Bu yazarın kimliğini, uzmanlık alanını ve yazım stilini tanımlayan talimatlar..."
            />
          </div>

          <div>
            <label htmlFor="avatar" className="block text-slate-400 text-sm font-bold mb-2">Profil Resmi URL'si</label>
            <input
              id="avatar"
              type="text"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="shadow-inner appearance-none border border-slate-700 rounded-lg w-full py-2 px-3 bg-slate-800/60 text-slate-50 leading-tight focus:outline-none focus:ring-2 focus:ring-sky-600"
              placeholder="https://..."
            />
            {avatar && <img src={avatar} alt="Profil Resmi Önizleme" className="mt-4 rounded-full w-24 h-24 object-cover"/>}
          </div>

          {error && <p className="text-red-500 text-xs italic">{error}</p>}

          <div className="flex items-center justify-between">
            <button type="submit" disabled={loading} className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline disabled:bg-slate-600 transition-colors">
              {loading ? 'Kaydediliyor...' : 'Yazarı Kaydet'}
            </button>
            <button type="button" onClick={() => router.back()} className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors">
              İptal
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
