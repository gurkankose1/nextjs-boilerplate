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
};

type ApiListOk = {
  ok: true;
  messages: (MessageDoc & { id: string })[];
};

type ApiErr = {
  ok: false;
  error: string;
};

// Son 50 mesajı getir
export async function GET(): Promise<NextResponse<ApiListOk | ApiErr>> {
  try {
    const snap = await adminDb
      .collection("gundem_messages")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const messages: (MessageDoc & { id: string })[] = snap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;

      return {
        id: doc.id,
        displayName:
          (data.displayName as string | undefined) || "Anonim kullanıcı",
        company: (data.company as string | undefined) ?? null,
        message: (data.message as string | undefined) || "",
        createdAt:
          (data.createdAt as string | undefined) ||
          new Date().toISOString(),
      };
    });

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

// Yeni mesaj oluştur
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
    const company =
      (body.company ?? "").toString().trim() || null;
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

    // Çok kaba bir uzunluk limiti
    if (message.length > 2000) {
      return NextResponse.json(
        {
          ok: false,
          error: "Mesaj çok uzun (2000 karakter sınırı).",
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    await adminDb.collection("gundem_messages").add({
      displayName,
      company,
      message,
      createdAt: nowIso,
      status: "visible",
    });

    // Mesaj eklendikten sonra güncel listeyi döndür (son 50)
    const snap = await adminDb
      .collection("gundem_messages")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const messages: (MessageDoc & { id: string })[] = snap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;

      return {
        id: doc.id,
        displayName:
          (data.displayName as string | undefined) || "Anonim kullanıcı",
        company: (data.company as string | undefined) ?? null,
        message: (data.message as string | undefined) || "",
        createdAt:
          (data.createdAt as string | undefined) ||
          new Date().toISOString(),
      };
    });

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
