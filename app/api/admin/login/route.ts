
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    const isAdmin = password === process.env.ADMIN_PASSWORD;

    if (!isAdmin) {
      return NextResponse.json({ message: 'Geçersiz şifre.' }, { status: 401 });
    }

    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret) {
        console.error("ADMIN_SECRET is not set in .env.local");
        throw new Error("Sunucu yapılandırma hatası.");
    }
    
    cookies().set('admin-secret', adminSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      path: '/',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 1 day
    });

    return NextResponse.json({ message: 'Giriş başarılı.' });

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ message: 'Giriş yapılırken bir hata oluştu.' }, { status: 500 });
  }
}
