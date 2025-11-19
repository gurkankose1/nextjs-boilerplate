
'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewUserPage() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Lütfen bir email adresi girin.');
      return;
    }

    try {
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Kullanıcı oluşturulamadı.');
      }
      
      router.push('/admin/users');
      router.refresh(); // Sayfayı yenileyerek yeni kullanıcıyı listede göster

    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-lg shadow-slate-950/40">
        <h1 className="text-2xl font-semibold text-slate-50 mb-6">Yeni Kullanıcı Oluştur</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-slate-400 text-sm font-bold mb-2">
              Email Adresi
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow-inner appearance-none border border-slate-700 rounded-lg w-full py-2 px-3 bg-slate-800/60 text-slate-50 leading-tight focus:outline-none focus:ring-2 focus:ring-sky-600"
              placeholder="kullanici@example.com"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="role" className="block text-slate-400 text-sm font-bold mb-2">
              Rol
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
               className="shadow-inner appearance-none border border-slate-700 rounded-lg w-full py-2 px-3 bg-slate-800/60 text-slate-50 leading-tight focus:outline-none focus:ring-2 focus:ring-sky-600"
            >
              <option value="editor">Editör</option>
              <option value="admin">Yönetici</option>
              <option value="chief-editor">Genel Yayın Yönetmeni</option>
            </select>
          </div>
          {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors"
            >
              Oluştur
            </button>
             <button
              type="button"
              onClick={() => router.back()}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
