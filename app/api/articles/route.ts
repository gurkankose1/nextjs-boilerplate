import { NextResponse } from "next/server";

const REMOTE_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://skynews-web.vercel.app";

/**
 * /api/articles
 *
 * Frontend'den gelen istekleri uzaktaki gerçek API'ye proxy'ler.
 * Hem /articles hem de /api/articles path'lerini dener.
 */
export async function GET(request: Request) {
  try {
    const incomingUrl = new URL(request.url);
    const search = incomingUrl.search; // ?turkey_first=true vs.

    const remoteBase = REMOTE_API_BASE.replace(/\/$/, "");

    const candidateUrls = [
      `${remoteBase}/articles${search}`,
      `${remoteBase}/api/articles${search}`
    ];

    let lastStatus = 0;
    let lastBody = "";

    for (const remoteUrl of candidateUrls) {
      try {
        const res = await fetch(remoteUrl, {
          // İstersen burayı cache'li yapabilirsin
          cache: "no-store"
        });

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        }

        lastStatus = res.status;
        lastBody = await res.text();

        // Sadece 404 ise bir sonrakini dene, diğer durumlarda direkt hata dön
        if (res.status !== 404) {
          console.error(
            "Remote articles error (non-404):",
            res.status,
            lastBody
          );
          return NextResponse.json(
            {
              error: "Remote articles endpoint failed",
              status: res.status,
              body: lastBody,
              tried: [remoteUrl]
            },
            { status: res.status }
          );
        }
      } catch (err: any) {
        console.error("Fetch error for", remoteUrl, err);
        lastStatus = 500;
        lastBody = err?.message ?? "Unknown fetch error";
      }
    }

    // Buraya geldiysek her iki URL de 404 (veya hiçbiri başarılı değil)
    console.error("All remote article URLs failed", {
      tried: candidateUrls,
      lastStatus,
      lastBody
    });

    return NextResponse.json(
      {
        error: "Remote articles endpoint not found on any candidate URL",
        status: lastStatus || 404,
        body: lastBody,
        tried: candidateUrls
      },
      { status: lastStatus || 404 }
    );
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
