// app/api/admin/blog-terms/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  // 1) Basit admin kontrolü (admin panelde login olmayan update atamasın)
  const cookieStore = cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE_NAME);

  if (!session || session.value !== "1") {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const {
    id,
    title,
    slug,
    termKey,
    summary,
    metaDesc,
    category,
    source,
    imagePrompt,
    mainImageUrl,
    html,
  } = body ?? {};

  if (!id || typeof id !== "string" || !id.trim()) {
    return NextResponse.json(
      { ok: false, error: "Field 'id' is required and must be a non-empty string." },
      { status: 400 }
    );
  }

  const update: Record<string, any> = {};

  if (typeof title === "string") {
    update.title = title;
    // seoTitle boşsa veya güncellenmesini istiyorsak onunla hizalayalım
    update.seoTitle = title;
  }
  if (typeof slug === "string") {
    update.slug = slug;
  }
  if (typeof termKey === "string") {
    update.termKey = termKey;
  }
  if (typeof summary === "string") {
    update.summary = summary;
  }
  if (typeof metaDesc === "string") {
    update.metaDesc = metaDesc;
  }
  if (typeof category === "string") {
    update.category = category;
  }
  if (typeof source === "string") {
    update.source = source;
  }
  if (typeof imagePrompt === "string") {
    update.imagePrompt = imagePrompt;
  }
  if (typeof mainImageUrl === "string") {
    update.mainImageUrl = mainImageUrl;
  }
  if (typeof html === "string") {
    update.html = html;
  }

  // Her update'te timestamps’i güncelle
  update.updatedAt = new Date().toISOString();

  if (Object.keys(update).length === 1 && update.updatedAt) {
    // Sadece updatedAt varsa, anlamlı bir update yok demektir
    return NextResponse.json(
      { ok: false, error: "No updatable fields were provided." },
      { status: 400 }
    );
  }

  try {
    await adminDb
      .collection("blog_posts")
      .doc(id.trim())
      .set(update, { merge: true });

    return NextResponse.json({
      ok: true,
      id: id.trim(),
      updatedKeys: Object.keys(update),
    });
  } catch (err: any) {
    console.error("Error in /api/admin/blog-terms/update:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Firestore update error: " + String(err?.message || err),
      },
      { status: 500 }
    );
  }
}
