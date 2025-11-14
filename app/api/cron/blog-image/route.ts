// app/api/cron/blog-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const PEXELS_KEY = process.env.PEXELS_API_KEY;
  if (!PEXELS_KEY) {
    return NextResponse.json(
      { ok: false, error: "PEXELS_API_KEY missing" },
      { status: 500 }
    );
  }

  try {
    // 1) Görseli olmayan blog postunu bul
    const snap = await adminDb
      .collection("blog_posts")
      .where("mainImageUrl", "==", null)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "No blog post requires an image.",
      });
    }

    const doc = snap.docs[0];
    const data = doc.data() || {};
    const prompt = data.imagePrompt || data.title;

    // 2) Pexels API çağrısı
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(prompt)}&per_page=1`,
      {
        headers: {
          Authorization: PEXELS_KEY,
        },
      }
    );

    if (!res.ok) {
      console.error("PEXELS ERROR:", await res.text());
      return NextResponse.json(
        { ok: false, error: "Pexels request failed" },
        { status: 500 }
      );
    }

    const json = await res.json();
    if (!json.photos || json.photos.length === 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "No suitable Pexels image found.",
      });
    }

    const photo = json.photos[0];
    const imageUrl = photo.src.landscape || photo.src.large;

    // 3) Firestore’a kaydet
    await adminDb.collection("blog_posts").doc(doc.id).update({
      mainImageUrl: imageUrl,
    });

    return NextResponse.json({
      ok: true,
      updatedId: doc.id,
      imageUrl,
      promptUsed: prompt,
    });
  } catch (error) {
    console.error("CRON BLOG IMAGE ERROR:", error);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
