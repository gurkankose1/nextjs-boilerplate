import { NextResponse } from "next/server";

const REMOTE_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://skynews-web.vercel.app";

/**
 * Bu route, frontend'den gelen istekleri
 * asıl SkyNews API'sine (REMOTE_API_BASE) proxy'ler.
 *
 * Örnek:
 *   /api/articles?turkey_first=true
 *  ---> REMOTE_API_BASE/articles?turkey_first=true
 */
export async function GET(request: Request) {
  try {
    const incomingUrl = new URL(request.url);
    const search = incomingUrl.search; // ?turkey_first=true vs.

    const remoteBase = REMOTE_API_BASE.replace(/\/$/, "");
    const remoteUrl = `${remoteBase}/articles${search}`;

    const res = await fetch(remoteUrl, {
      // İstersen cache davranışını burada da ayarlayabilirsin
      next: { revalidate: 60 }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Remote /articles error:", res.status, text);
      return NextResponse.json(
        {
          error: "Remote articles endpoint failed",
          status: res.status,
          body: text
        },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Proxy /api/articles error:", err);
    return NextResponse.json(
      {
        error: err?.message ?? "Unknown error while proxying /api/articles"
      },
      { status: 500 }
    );
  }
}
