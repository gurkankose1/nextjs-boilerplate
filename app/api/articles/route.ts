import { NextResponse } from "next/server";
import admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Firebase Admin'i tek seferlik initialize et
if (!admin.apps.length) {
  if (!projectId || !clientEmail || !privateKey) {
    console.error("Firebase env değişkenleri eksik!");
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
  }
}

const db = admin.apps.length ? admin.firestore() : null;

/**
 * GET /api/articles
 *
 * Firestore'daki "articles" koleksiyonundan verileri çeker.
 * Her doküman:
 *   - doc.id  -> id
 *   - data().slug, title, summary, html, vs.
 */
export async function GET(request: Request) {
  try {
    if (!db) {
      return NextResponse.json(
        {
          error:
            "Firebase Admin başlatılamadı. Env değişkenlerini kontrol edin."
        },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const turkeyFirst = url.searchParams.get("turkey_first");

    let query: FirebaseFirestore.Query = db
      .collection("articles")
      .orderBy("createdAt", "desc");

    // İstersen turkey_first gibi filter'ları ileride burada kullanabiliriz
    // if (turkeyFirst === "true") { ... }

    const snap = await query.limit(200).get();

    const items = snap.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        title: data.title ?? "",
        seoTitle: data.seoTitle ?? "",
        summary: data.summary ?? "",
        slug: data.slug ?? "",
        html: data.html ?? "",
        category: data.category ?? "",
        source: data.source ?? "",
        sourceUrl: data.sourceUrl ?? "",
        published: data.published ?? data.createdAt ?? null,
        createdAt: data.createdAt ?? null,
        mainImageUrl: data.mainImageUrl ?? ""
      };
    });

    return NextResponse.json(items);
  } catch (err: any) {
    console.error("GET /api/articles hata:", err);
    return NextResponse.json(
      {
        error: err?.message ?? "Bilinmeyen hata"
      },
      { status: 500 }
    );
  }
}
