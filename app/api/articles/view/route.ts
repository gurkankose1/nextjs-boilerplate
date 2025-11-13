// app/api/articles/view/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id missing" },
        { status: 400 }
      );
    }

    const ref = adminDb.collection("articles").doc(id);

    await ref.set(
      {
        views: FieldValue.increment(1),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
