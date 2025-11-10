// lib/firebaseAdmin.ts
import * as admin from "firebase-admin";

// Firebase admin uygulaması daha önce başlatıldıysa tekrar başlatma
let app: admin.app.App;

try {
  app = admin.app();
} catch {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Eksik FIREBASE_* environment değişkenleri var!");
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
export default app;
