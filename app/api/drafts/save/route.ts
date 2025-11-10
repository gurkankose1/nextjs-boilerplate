// app/api/drafts/save/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "../../../../lib/firebaseAdmin";

type ImageItem = {
  id?: string;
  url: string;
  alt?: string;
  credit?: string;
  link?: string;
  width?: number;
  height?: number;
};

type DraftIn = {
  seoTitle: string;
  metaDesc: string;
  slug: string;
  tags: string[];
  keywords: string[];
  html: string;
  images: ImageItem[];
  imageQuery?: string;
};

function normalizeSlug(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const draft = (body?.draft || {}) as DraftIn;
    const actor = String(body?.actor || "").trim().toLowerCase(); // /studio'dan göndereceğiz

    // Basit doğrulama
    if (!draft || !draft.seoTitle || !draft.html) {
      return NextResponse.json(
        { ok: false, error: "Eksik veri: seoTitle ve html zorunludur." },
        { status: 400 }
      );
    }

    // Slug'ı normalize et
    let slug = normalizeSlug(draft.slug || draft.seoTitle);
    if (!slug) slug = "haber-" + Date.now();

    // Çakışma kontrolü: aynı slug varsa -{ts} ekle
    const existing = await adminDb.collection("drafts").doc(slug).get();
    if (existing.exists) slug = `${slug}-${Date.now()}`;

    const now = new Date().toISOString();

    const doc = {
      seoTitle: draft.seoTitle,
      metaDesc: draft.metaDesc || "",
      slug,
      tags: Array.isArray(draft.tags) ? draft.tags : [],
      keywords: Array.isArray(draft.keywords) ? draft.keywords : [],
      html: draft.html,
      images: Array.isArray(draft.images) ? draft.images : [],
      imageQuery: draft.imageQuery || "",
      status: "draft",        // ileride: draft -> published
      createdAt: now,
      updatedAt: now,
      createdBy: actor || null,
    };

    await adminDb.collection("drafts").doc(slug).set(doc);

    return NextResponse.json({ ok: true, id: slug }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
