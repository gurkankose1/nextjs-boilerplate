// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/adminAuth";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "Gg.113355";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const username = String(formData.get("username") || "").trim();
    const password = String(formData.get("password") || "").trim();

    if (username !== ADMIN_USER || password !== ADMIN_PASS) {
      return NextResponse.json(
        { ok: false, error: "Geçersiz kullanıcı adı veya şifre" },
        { status: 401 }
      );
    }

    // Cookie TÜM site için geçerli
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE_NAME, "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",            // 🔴 ÖNEMLİ: /api çağrılarında da gönderilecek
      maxAge: 60 * 60 * 8,  // 8 saat
    });

    // Başarılı login → admin ana sayfaya yönlendir
    return NextResponse.redirect(new URL("/admin", req.url));
  } catch (err: any) {
    console.error("Error in /api/admin/login POST:", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
