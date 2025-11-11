// app/api/cron/fetch/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { adminDb } from "../../../../lib/firebaseAdmin"; // ← yolu kendi yapına göre kontrol et
import crypto from "node:crypto";
import fs from "node:fs/promises";

// ——— CRON auth ———
function ensureCronAuth(req: NextRequest) {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

// ——— tipler ———
type FeedConfig = { airports: string[]; airlines: string[]; ground: string[]; authorities: string[] };

function hash(s: string) { return crypto.createHash("sha1").update(s).digest("hex"); }
function pick(text?: string) { return (text || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim(); }

// Basit RSS/Atom ayıklama (regex)
function parseItems(xml: string) {
  const items: { title: string; link: string; summary?: string }[] = [];

  // RSS <item>
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const item of itemMatches) {
    const title = pick((item.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]);
    const link = pick((item.match(/<link>([\s\S]*?)<\/link>/i) || [])[1]);
    const desc = pick((item.match(/<description>([\s\S]*?)<\/description>/i) || [])[1]);
    if (title && link) items.push({ title, link, summary: desc });
  }

  // Atom <entry>
  const entryMatches = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  for (const entry of entryMatches) {
    const title = pick((entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
    const linkTag = (entry.match(/<link\b[^>]*>/i) || [])[0] || "";
    const href = (linkTag.match(/href="([^"]+)"/i) || [])[1] || "";
    const summary =
      pick((entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) || [])[1] ||
           (entry.match(/<content[^>]*>([\s\S]*?)<\/content>/i) || [])[1]);
    if (title && href) items.push({ title, link: href, summary });
  }

  return items;
}

export async function GET(req: NextRequest) {
  const unauth = ensureCronAuth(req);
  if (unauth) return unauth;

  try {
    // feeds.json
    const buf = await fs.readFile(process.cwd() + "/config/feeds.json", "utf8");
    const feeds = JSON.parse(buf) as Partial<FeedConfig>;
    const groups = Object.entries(feeds);

    let added = 0;
    for (const [category, urls] of groups) {
      if (!Array.isArray(urls)) continue;

      // her grup için makul sınır
      for (const url of urls.slice(0, 20)) {
        try {
          const r = await fetch(url, { headers: { "User-Agent": "SkyNewsBot/1.0" } });
          if (!r.ok) continue;

          const xml = await r.text();
          // her feed’den 15 maddeye kadar
          const items = parseItems(xml).slice(0, 15);

          for (const it of items) {
            const key = hash((it.link || it.title).toLowerCase());
            const ref = adminDb.collection("ingest_queue").doc(key);
            const snap = await ref.get();
            if (snap.exists) continue; // zaten kuyruğa alınmış

            await ref.set({
              category,
              title: it.title,
              url: it.link,
              summary: it.summary || null,
              status: "pending",
              createdAt: new Date().toISOString()
            });
            added++;
          }
        } catch {
          // feed hatasını sessiz geç
        }
      }
    }

    return NextResponse.json({ ok: true, added });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
