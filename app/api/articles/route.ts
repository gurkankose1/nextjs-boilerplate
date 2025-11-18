import { NextResponse } from "next/server";
import admin, { ServiceAccount } from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

// Vercel'de private key genelde \n diye gelir, gerçek satır başına çeviriyoruz
const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, "\n") : undefined;

// Firebase Admin'i tek sefer initialize et
if (!admin.apps.length) {
  if (!projectId || !clientEmail || !privateKey) {
    console.error("Firebase env değişkenleri eksik! FIREBASE_* değerlerini kontrol edin.");
  } else {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      } as ServiceAccount),
    });
  }
}

const db = admin.apps.length ? admin.firestore() : null;

/**
 * GET /api/articles
 * Firestore'daki "articles" koleksiyonundan tüm haberleri çeker.
 */
export async function GET(_request: Request) {
  try {
    if (!db) {
      return NextResponse.json(
        { error: "Firebase Admin başlatılamadı. Env değişkenlerini kontrol edin." },
        { status: 500 }
      );
    }

    // Şimdilik orderBy kullanmıyoruz ki createdAt zorunlu olmasın
    const snap = await db.collection("articles").get();

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
        // Hem "sourceUrl" hem "sourceurl" field'ını destekle
        sourceUrl: data.sourceUrl ?? data.sourceurl ?? "",
        published: data.published ?? null,
        createdAt: data.createdAt ?? null,
        mainImageUrl: data.mainImageUrl ?? "",
      };
    });

    return NextResponse.json(items);
  } catch (err: any) {
    console.error("GET /api/articles hata:", err);
    return NextResponse.json(
      { error: err?.message ?? "Bilinmeyen hata" },
      { status: 500 }
    );
  }
}
