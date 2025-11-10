// app/api/health/route.ts
import { NextResponse } from "next/server";
// alias yoksa aşağıdaki satırı KULLAN:
import { adminDb } from "../../../lib/firebaseAdmin";
// alias varsa şu satırı kullanabilirsin:
// import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    // küçük bir yazma/okuma testi
    const ref = adminDb.collection("jobs").doc("health");
    await ref.set({ ok: true, ts: new Date().toISOString() }, { merge: true });
    const snap = await ref.get();

    return NextResponse.json({
      status: "ok",
      hasEnv: {
        projectId: !!process.env.FIREBASE_PROJECT_ID,
        clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
        apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      },
      firestoreWrite: snap.exists,
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "error", message: err?.message || String(err) },
      { status: 500 }
    );
  }
}
