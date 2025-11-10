// app/api/allowlist/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const raw = process.env.ALLOWED_EMAILS || "";
    const allowed = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const ok = !!email && allowed.includes(String(email).toLowerCase());

    return NextResponse.json({ ok });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 400 });
  }
}
