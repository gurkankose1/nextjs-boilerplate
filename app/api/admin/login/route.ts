// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  validateAdminCredentials,
  ADMIN_SESSION_COOKIE_NAME,
} from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { username, password } = body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "Eksik bilgi" },
        { status: 400 }
      );
    }

    const valid = validateAdminCredentials(username, password);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "Kullanıcı adı veya şifre hatalı" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({ ok: true });

    res.cookies.set(ADMIN_SESSION_COOKIE_NAME, "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/admin",
      maxAge: 60 * 60 * 8, // 8 saat
    });

    return res;
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json(
      { ok: false, error: "Sunucu hatası" },
      { status: 500 }
    );
  }
}
