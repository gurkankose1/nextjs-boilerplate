
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import { verifyAdmin } from '@/lib/adminAuth';

export async function POST(request: Request) {
  // Yalnızca adminlerin bu işlemi yapabildiğinden emin ol
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ message: 'Yetkiniz yok.' }, { status: 403 });
  }

  try {
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ message: 'Email ve rol alanları zorunludur.' }, { status: 400 });
    }

    // Kullanıcının zaten var olup olmadığını kontrol et
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (!snapshot.empty) {
      return NextResponse.json({ message: 'Bu email adresiyle bir kullanıcı zaten mevcut.' }, { status: 409 });
    }

    // Yeni kullanıcıyı Firestore'a ekle
    const newUserRef = await usersRef.add({
      email,
      role,
      createdAt: new Date(),
    });

    return NextResponse.json({ id: newUserRef.id, email, role }, { status: 201 });

  } catch (error) {
    console.error("Kullanıcı oluşturma hatası:", error);
    return NextResponse.json({ message: 'Kullanıcı oluşturulurken bir hata oluştu.' }, { status: 500 });
  }
}
