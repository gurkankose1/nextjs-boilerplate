
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';

export async function POST(request: Request) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ message: 'Yetkiniz yok.' }, { status: 403 });
  }

  try {
    const { name, prompt, avatar } = await request.json();

    if (!name || !prompt) {
      return NextResponse.json({ message: 'İsim ve prompt alanları zorunludur.' }, { status: 400 });
    }

    const personasRef = db.collection('personas');
    
    const newPersonaRef = await personasRef.add({
      name,
      prompt,
      avatar: avatar || '', // Avatar opsiyonel olduğu için boş string olarak kaydedilebilir
      createdAt: new Date(),
    });

    return NextResponse.json({ id: newPersonaRef.id, name, prompt, avatar }, { status: 201 });

  } catch (error) {
    console.error("Sanal yazar oluşturma hatası:", error);
    return NextResponse.json({ message: 'Sanal yazar oluşturulurken bir hata oluştu.' }, { status: 500 });
  }
}
