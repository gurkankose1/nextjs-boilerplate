// app/api/cron/generate/route.ts
import { NextRequest } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminDb } from "@/lib/firebaseAdmin";  // ← DÜZELTİLDİ

// ——— CRON auth ———
function ensureCronAuth(req: NextRequest) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function baseUrlFrom(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const unauth = ensureCronAuth(req);
  if (unauth) return unauth;

  try {
    // 1) Kuyruktan N adet pending (FIFO)
    const q = await adminDb
      .collection("ingest_queue")
      .where("status", "==", "pending")
      .orderBy("createdAt", "asc")
      .limit(5)
      .get();

    if (q.empty) return NextResponse.json({ ok: true, processed: 0 });

    const origin = baseUrlFrom(req);
    let processed = 0;

    for (const doc of q.docs) {
      const item = doc.data() as any;

      // optimistic lock: status→processing (başkası aynı anda almasın)
      try {
        await doc.ref.update({ status: "processing", startedAt: new Date().toISOString() });
      } catch {
        continue; // başka worker aldıysa geç
      }

      const topic = `${item.title}\n${item.url}\n${item.summary || ""}`.trim();

      try {
        // 2) Generate (fast:false → görselleri de dene)
        const res = await fetch(`${origin}/api/generate/dry-run`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ input: topic, fast: false })
        });

        // güvenli parse
        const raw = await res.text();
        let j: any;
        try {
          j = JSON.parse(raw);
        } catch {
          throw new Error("generate raw: " + raw.slice(0, 500));
        }
        if (!j?.ok) throw new Error(j?.error || "generate failed");

        const result = j.result as {
          seoTitle: string; metaDesc: string; slug: string;
          tags: string[]; keywords: string[]; html: string;
          images?: any[]; imageQuery?: string;
        };

        // 3) Draft olarak kaydet
        const draftRef = await adminDb.collection("drafts").add({
          ...result,
          sourceUrl: item.url || null,
          category: item.category || "general",
          status: "draft",
          createdAt: new Date().toISOString()
        });

        // 4) Kuyruğu kapat
        await doc.ref.update({
          status: "done",
          draftId: draftRef.id,
          processedAt: new Date().toISOString()
        });

        processed++;
      } catch (e: any) {
        await doc.ref.update({
          status: "error",
          error: String(e?.message || e),
          processedAt: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({ ok: true, processed });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
