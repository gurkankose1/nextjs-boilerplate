// app/api/polls/active/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type PollOption = {
  id: string;
  label: string;
};

type PollDoc = {
  question: string;
  options: PollOption[];
  weekStart: string; // ISO
  weekEnd: string;   // ISO
  status: "active" | "closed";
};

type PollWithResults = PollDoc & {
  id: string;
  optionResults: {
    id: string;
    label: string;
    count: number;
    percentage: number;
  }[];
};

type ApiPollOk = {
  ok: true;
  poll: PollWithResults;
};

type ApiErr = {
  ok: false;
  error: string;
};

export async function GET() {
  try {
    const now = new Date().toISOString();

    const snap = await adminDb
      .collection("polls")
      .where("status", "==", "active")
      .where("weekStart", "<=", now)
      .where("weekEnd", ">=", now)
      .orderBy("weekStart", "desc")
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json<ApiErr>(
        { ok: false, error: "Şu anda aktif bir anket yok." },
        { status: 200 }
      );
    }

    const doc = snap.docs[0];
    const data = doc.data() as PollDoc;

    const pollId = doc.id;
    const options = Array.isArray(data.options) ? data.options : [];

    const votesSnap = await adminDb
      .collection("poll_votes")
      .where("pollId", "==", pollId)
      .get();

    const counts: Record<string, number> = {};
    votesSnap.docs.forEach((v) => {
      const d = v.data() as Record<string, unknown>;
      const optId = (d.optionId as string) || "";
      if (!optId) return;
      counts[optId] = (counts[optId] ?? 0) + 1;
    });

    const totalVotes = Object.values(counts).reduce(
      (sum, c) => sum + c,
      0
    );

    const optionResults = options.map((opt) => {
      const count = counts[opt.id] ?? 0;
      const percentage =
        totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      return {
        id: opt.id,
        label: opt.label,
        count,
        percentage,
      };
    });

    const result: PollWithResults = {
      id: pollId,
      question: data.question,
      options,
      weekStart: data.weekStart,
      weekEnd: data.weekEnd,
      status: data.status,
      optionResults,
    };

    return NextResponse.json<ApiPollOk>(
      { ok: true, poll: result },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[polls/active][GET] error:", error);
    return NextResponse.json<ApiErr>(
      {
        ok: false,
        error: String(
          error?.message || "Aktif anket yüklenirken hata oluştu."
        ),
      },
      { status: 500 }
    );
  }
}
