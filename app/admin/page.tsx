
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebaseClient'; 
import { User } from 'firebase/auth';

// Standart Firebase User tipini genişleterek 'role' özelliğini ekleyen arayüz
interface AuthUser extends User {
  role?: string;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!loading && isClient) {
      if (!user) {
        // Kullanıcı giriş yapmamışsa, login sayfasına yönlendir
        router.push('/admin/login');
        return;
      }

      // Kullanıcının ID token'ını al ve rolünü kontrol et
      user.getIdTokenResult().then(idTokenResult => {
        const userRole = idTokenResult.claims.role;
        if (userRole !== 'admin') {
          // Rolü admin değilse ana sayfaya yönlendir
          router.push('/');
        }
      });
    }
  }, [user, loading, isClient, router]);

  // Yükleniyor veya yönlendirme beklenirken gösterilecek içerik
  if (loading || !user) {
    return <div>Yükleniyor...</div>; 
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Yönetici Paneli</h1>
      <p>Yönetici paneline hoş geldiniz. Buradan site ayarlarını, kullanıcıları ve içeriği yönetebilirsiniz.</p>
    </div>
  );
}
