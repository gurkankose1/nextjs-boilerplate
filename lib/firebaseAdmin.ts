import * as admin from "firebase-admin";
import { ServiceAccount } from "firebase-admin";

// Ortam değişkenlerini al. İsimler, Firebase'in rezerve ettiği isimlerle çakışmayacak şekilde değiştirildi.
const projectId = process.env.ADMIN_PROJECT_ID;
const clientEmail = process.env.ADMIN_CLIENT_EMAIL;
// Private key, Google Secrets'tan tek satır olarak gelir,
// bu yüzden '\\n' karakterlerini gerçek satır sonlarına çevirmemiz gerekir.
const privateKey = process.env.ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

let app: admin.app.App;

function initializeFirebaseAdmin() {
  // Firebase Admin SDK'sının daha önce başlatılıp başlatılmadığını kontrol et
  if (!admin.apps.length) {
    if (!projectId || !clientEmail || !privateKey) {
      console.error("Firebase Admin SDK başlatılamadı: Gerekli ortam değişkenleri eksik. Lütfen App Hosting ayarlarından secrets'ları (ADMIN_PROJECT_ID, ADMIN_CLIENT_EMAIL, ADMIN_PRIVATE_KEY) kontrol edin.");
      throw new Error("Eksik Firebase environment değişkenleri.");
    }
    
    try {
      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        } as ServiceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    } catch (error) {
      console.error("Firebase Admin SDK başlatılırken kritik bir hata oluştu:", error);
      throw error;
    }
  }
  
  const firestore = admin.firestore();
  const auth = admin.auth();
  const storage = admin.storage();

  return { app, firestore, auth, storage };
}

export const { app, firestore, auth, storage } = initializeFirebaseAdmin();
