
import { db } from "@/lib/firebaseAdmin";

export interface Article {
  id: string;
  title: string;
  content: string;
  personaId: string;
  authorName: string;
  authorAvatar: string;
  createdAt: string; // Tarihleri ISO string olarak işleyeceğiz
  status: 'published' | 'draft';
}

// Gelen verinin tipine göre tarihi güvenli bir şekilde işleyen yardımcı fonksiyon
function getSafeISOString(dateInput: any): string {
  // Eğer Firestore Timestamp ise (toDate fonksiyonu varsa)
  if (dateInput && typeof dateInput.toDate === 'function') {
    return dateInput.toDate().toISOString();
  }
  // Zaten bir string ise veya başka bir formatta ise Date objesi üzerinden işle
  return new Date(dateInput).toISOString();
}

// Tüm makaleleri getirir (ana sayfa için)
export async function getArticles(): Promise<Article[]> {
  const articlesSnapshot = await db.collection('articles')
                                   .where('status', '==', 'published')
                                   .orderBy('createdAt', 'desc')
                                   .get();
  
  if (articlesSnapshot.empty) {
    return [];
  }

  return articlesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      content: data.content,
      personaId: data.personaId,
      authorName: data.authorName,
      authorAvatar: data.authorAvatar,
      status: data.status,
      createdAt: getSafeISOString(data.createdAt),
    } as Article;
  });
}

// Tek bir makaleyi getirir (detay sayfası için)
export async function getArticle(id: string): Promise<Article | null> {
  const doc = await db.collection('articles').doc(id).get();
  
  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  if (data.status !== 'published') {
    return null;
  }

  return {
    id: doc.id,
    title: data.title,
    content: data.content,
    personaId: data.personaId,
    authorName: data.authorName,
    authorAvatar: data.authorAvatar,
    status: data.status,
    createdAt: getSafeISOString(data.createdAt),
  } as Article;
}
