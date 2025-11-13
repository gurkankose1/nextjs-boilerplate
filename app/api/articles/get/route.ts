// app/api/articles/get/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

// Node.js runtime (firebase-admin için)
export const runtime = "nodejs";

function toIsoString(v: any): string | null {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id missing" },
        { status: 400 }
      );
    }

    const ref = adminDb.collection("articles").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json(
        { ok: false, error: "not found" },
        { status: 404 }
      );
    }

    const raw = snap.data() || {};

    const article = {
      ...raw,
      id: snap.id,
      // Tarihleri string'e çeviriyoruz ki client tarafta rahat kullanabilelim
      publishedAt: toIsoString((raw as any).publishedAt),
      createdAt: toIsoString((raw as any).createdAt),
    };

    return NextResponse.json({ ok: true, id: snap.id, article });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: String(error?.message || error) },
      { status: 500 }
    );
  }
}
