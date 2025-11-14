// app/api/gundem/messages/route.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

type MessageDoc = {
  displayName: string;
  company: string | null;
  message: string;
  createdAt: string; // ISO string
  status?: string;
};

type ApiListOk = {
  ok: true;
  messages: (MessageDoc & { id: string })[];
};

type ApiErr = {
  ok: false;
  error: string;
};

const BAD_WORDS = ["küfür", "salak", "aptal"];

function containsBadWords(text: string): boolean {
  const lowered = text.toLowerCase();
  return BAD_WORDS.some((w) => lowered.includes(w));
}

// SON 50 MESAJI GETİR
export async function GET(): Promise<NextResponse<ApiListOk | ApiErr>> {
  try {
    const snap = await adminDb
      .collection("gundem_messages")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const messages: (MessageDoc & { id: string })[] = snap.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;

        const status = (data.status as string | undefined) ?? "visible";
        if (status !== "visible") return null;

        return {
          id: doc.id,
          displayName:
            (data.displayName as string | undefined) || "Anonim kullanıcı",
          company: (data.company as string | undefined) ?? null,
          message: (data.message as string | undefined) || "",
          createdAt:
            (data.createdAt as string | undefined) ||
            new Date().toISOString(),
          status,
        };
      })
      .filter((m): m is MessageDoc & { id: string } => m !== null);

    return NextResponse.json(
      {
        ok: true,
        messages,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[gundem/messages][GET] error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: String(error?.message || "Mesajlar yüklenirken hata oluştu"),
      },
      { status: 500 }
    );
  }
}

// YENİ MESAJ OLUŞTUR
export async function POST(
  req: NextRequest
): Promise<NextResponse<ApiListOk | ApiErr>> {
  try {
    const body = (await req.json()) as {
      displayName?: string;
      company?: string;
      message?: string;
    };

    const displayName =
      (body.displayName ?? "").toString().trim() || "Anonim kullanıcı";
    const company = (body.company ?? "").toString().trim();
    const message = (body.message ?? "").toString().trim();

    if (!message || message.length < 5) {
      return NextResponse.json(
        {
          ok: false,
          error: "Mesaj en az 5 karakter olmalıdır.",
        },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        {
          ok: false,
          error: "Mesaj çok uzun (2000 karakter sınırı).",
        },
        { status: 400 }
      );
    }

    if (containsBadWords(message)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Mesajınızda uygunsuz ifadeler tespit edildi. Lütfen daha yapıcı bir dil kullanın.",
        },
        { status: 400 }
      );
    }

    // ANTI-SPAM: aynı takma ad 1 dakikada en fazla 3 mesaj
    const now = Date.now();
    const oneMinuteAgoIso = new Date(now - 60_000).toISOString();

    const recentSnap = await adminDb
      .collection("gundem_messages")
      .where("displayName", "==", displayName)
      .limit(10)
      .get();

    const recentMessages = recentSnap.docs.filter((doc) => {
      const data = doc.data() as { createdAt?: string };
      const createdAtStr =
        typeof data.createdAt === "string" ? data.createdAt : undefined;
      if (!createdAtStr) return false;
      return createdAtStr >= oneMinuteAgoIso;
    });

    if (recentMessages.length >= 3) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Çok sık mesaj gönderiyorsunuz. Lütfen bir süre bekleyip tekrar deneyin.",
        },
        { status: 429 }
      );
    }

    const nowIso = new Date(now).toISOString();

    await adminDb.collection("gundem_messages").add({
      displayName,
      company: company || null,
      message,
      createdAt: nowIso,
      status: "visible",
    });

    // EKLEME SONRASI: güncel listeyi tekrar çek (index istemeyen sorgu)
    const snap = await adminDb
      .collection("gundem_messages")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const messages: (MessageDoc & { id: string })[] = snap.docs
      .map((doc) => {
        const data = doc.data() as Record<string, unknown>;

        const status = (data.status as string | undefined) ?? "visible";
        if (status !== "visible") return null;

        return {
          id: doc.id,
          displayName:
            (data.displayName as string | undefined) || "Anonim kullanıcı",
          company: (data.company as string | undefined) ?? null,
          message: (data.message as string | undefined) || "",
          createdAt:
            (data.createdAt as string | undefined) ||
            new Date().toISOString(),
          status,
        };
      })
      .filter((m): m is MessageDoc & { id: string } => m !== null);

    return NextResponse.json(
      {
        ok: true,
        messages,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[gundem/messages][POST] error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: String(error?.message || "Mesaj kaydedilirken hata oluştu"),
      },
      { status: 500 }
    );
  }
}
