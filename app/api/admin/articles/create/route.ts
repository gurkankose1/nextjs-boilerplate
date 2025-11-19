
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';
import { getPersona } from '@/lib/personas';

export async function POST(request: Request) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ message: 'Yetkiniz yok.' }, { status: 403 });
  }

  try {
    const { title, content, personaId } = await request.json();

    if (!title || !content || !personaId) {
      return NextResponse.json({ message: 'Başlık, içerik ve yazar kimliği zorunludur.' }, { status: 400 });
    }

    // Yazar bilgilerini al
    const persona = await getPersona(personaId);
    if (!persona) {
      return NextResponse.json({ message: 'Geçersiz sanal yazar.' }, { status: 400 });
    }

    const articlesRef = db.collection('articles');
    
    const newArticle = {
      title,
      content,
      personaId,
      authorName: persona.name,      // Yazar adını ekle
      authorAvatar: persona.avatar || '', // Yazar avatarını ekle
      createdAt: new Date(),
      status: 'published', // 'published' veya 'draft' olabilir
    };

    const newArticleRef = await articlesRef.add(newArticle);

    return NextResponse.json({ id: newArticleRef.id, ...newArticle }, { status: 201 });

  } catch (error) {
    console.error("Makale oluşturma hatası:", error);
    return NextResponse.json({ message: 'Makale oluşturulurken bir hata oluştu.' }, { status: 500 });
  }
}
