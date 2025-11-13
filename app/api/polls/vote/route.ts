// app/api/polls/vote/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type ApiErr = {
  ok: false;
  error: string;
};

type ApiOk = {
  ok: true;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      pollId?: string;
      optionId?: string;
    };

    const pollId = (body.pollId ?? "").toString().trim();
    const optionId = (body.optionId ?? "").toString().trim();

    if (!pollId || !optionId) {
      return NextResponse.json<ApiErr>(
        { ok: false, error: "pollId ve optionId zorunludur." },
        { status: 400 }
      );
    }

    const pollSnap = await adminDb.collection("polls").doc(pollId).get();

    if (!pollSnap.exists) {
      return NextResponse.json<ApiErr>(
        { ok: false, error: "Anket bulunamadı." },
        { status: 404 }
      );
    }

    const pollData = pollSnap.data() as {
      status?: string;
      weekStart?: string;
      weekEnd?: string;
      options?: { id: string; label: string }[];
    };

    if (pollData.status !== "active") {
      return NextResponse.json<ApiErr>(
        { ok: false, error: "Bu ankete oy verme süresi sona ermiş." },
        { status: 200 }
      );
    }

    const nowIso = new Date().toISOString();
    if (
      pollData.weekStart &&
      pollData.weekEnd &&
      (nowIso < pollData.weekStart || nowIso > pollData.weekEnd)
    ) {
      return NextResponse.json<ApiErr>(
        { ok: false, error: "Bu ankete oy verme süresi sona ermiş." },
        { status: 200 }
      );
    }

    const options = Array.isArray(pollData.options)
      ? pollData.options
      : [];
    const optionExists = options.some((o) => o.id === optionId);

    if (!optionExists) {
      return NextResponse.json<ApiErr>(
        { ok: false, error: "Geçersiz seçenek." },
        { status: 400 }
      );
    }

    await adminDb.collection("poll_votes").add({
      pollId,
      optionId,
      createdAt: nowIso,
    });

    return NextResponse.json<ApiOk>({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error("[polls/vote][POST] error:", error);
    return NextResponse.json<ApiErr>(
      {
        ok: false,
        error: String(error?.message || "Oy kaydedilirken hata oluştu."),
      },
      { status: 500 }
    );
  }
}
