// ===============================
// 1) app/api/drafts/list/route.ts
// ===============================
import { NextRequest } from "next/server";
import { adminDb } from "../../../lib/firebaseAdmin";


export const runtime = "edge";


export async function GET(_req: NextRequest) {
try {
const snap = await adminDb
.collection("drafts")
.orderBy("createdAt", "desc")
.limit(100)
.get();
const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
return Response.json({ ok: true, items });
} catch (e: any) {
return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
}
}
