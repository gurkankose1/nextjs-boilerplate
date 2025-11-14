// app/api/admin/blog-terms/view/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") ?? "").trim();

  if (!id) {
    return NextResponse.json(
      { ok: false, error: "Missing or empty 'id' query parameter." },
      { status: 400 }
    );
  }

  try {
    const docRef = adminDb.collection("blog_posts").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        {
          ok: false,
          error: `blog_posts koleksiyonunda bu ID ile doküman bulunamadı: ${id}`,
        },
        { status: 404 }
      );
    }

    const data = snap.data() || {};

    return NextResponse.json({
      ok: true,
      id,
      data,
    });
  } catch (err: any) {
    console.error("Error in /api/admin/blog-terms/view:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Firestore'dan doküman okunurken bir hata oluştu: " +
          String(err?.message || err),
      },
      { status: 500 }
    );
  }
}
