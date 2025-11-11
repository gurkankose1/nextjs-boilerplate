// app/api/drafts/publish/route.ts
import { NextRequest } from "next/server";
import { adminDb as db } from "../../../../lib/firebaseAdmin";

// IMPORTANT: firebase-admin => Node.js runtime
export const runtime = "nodejs";

function toSlug(s: string) {
  return s
    .toLowerCase()
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140);
}

async function ensureUniqueSlug(base: string) {
  const baseSlug = toSlug(base) || "haber";
  let slug = baseSlug;
  let i = 2;
  while (true) {
    const q = await db.collection("articles").where("slug", "==", slug).limit(1).get();
    if (q.empty) return slug;
    slug = `${baseSlug}-${i++}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { draftId } = (await req.json()) as { draftId?: string };
    if (!draftId) return Response.json({ ok: false, error: "draftId gerekli" }, { status: 400 });

    const ref = db.collection("drafts").doc(draftId);
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ ok: false, error: "Draft bulunamadı" }, { status: 404 });

    const d: any = snap.data();
    const title = d.seoTitle || d.title || "SkyNews Haberi";
    const slug = await ensureUniqueSlug(d.slug || title);

    const article = {
      title,
      slug,
      html: d.html || "",
      images: d.images || [],
      tags: d.tags || [],
      keywords: d.keywords || [],
      category: d.category || "general",
      sourceUrl: d.sourceUrl || null,
      publishedAt: new Date().toISOString(),
      metaDesc: d.metaDesc || null,
      createdFromDraft: draftId,
    };

    const batch = db.batch();
    const artRef = db.collection("articles").doc();
    batch.set(artRef, article);
    batch.update(ref, { status: "published", publishedArticleId: artRef.id });
    await batch.commit();

    return Response.json({ ok: true, id: artRef.id, slug: article.slug });
  } catch (e: any) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
