// app/news/[slug]/page.tsx
import { adminDb } from "@/lib/firebaseAdmin";
import { notFound } from "next/navigation";
import Link from "next/link";

const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "SkyNews.Tr";

const CATEGORY_EDITOR_MAP: Record<string, string> = {
  "airlines": "Metehan Özülkü",
  "airports": "Kemal Kahraman",
  "ground-handling": "Hafife Kandemir",
  "military-aviation": "Musa Demirbilek",
  "accidents": "Editör Ekibi",
};

const CATEGORY_LABEL_MAP: Record<string, string> = {
  "airlines": "Havayolları",
  "airports": "Havalimanları",
  "ground-handling": "Yer Hizmetleri",
  "accidents": "Uçak Kazaları",
  "military-aviation": "Askeri Havacılık",
};

function toIsoString(v: any) {
  if (!v) return null;
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (v instanceof Date) return v.toISOString();
  return null;
}

function calculateReadingTime(html: string) {
  if (!html) return 1;
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 180));
  return minutes;
}

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const slug = params.slug;

  const snapshot = await adminDb
    .collection("articles")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return notFound();
  }

  const doc = snapshot.docs[0];
  const data = doc.data() ?? {};

  const html =
    typeof data.html === "string"
      ? data.html
      : (typeof data.body === "string" ? data.body : "");

  const title =
    (typeof data.title === "string" && data.title) ||
    (typeof data.seoTitle === "string" && data.seoTitle) ||
    "Havacılık Haberi";

  const category =
    (typeof data.category === "string" && data.category) || "other";

  const metaDesc =
    (typeof data.metaDesc === "string" && data.metaDesc) || "";

  const publishedAt =
    toIsoString(data.publishedAt) || toIsoString(data.createdAt);

  const rawImages = Array.isArray(data.images) ? data.images : [];
  const images = rawImages.filter(
    (img: any) => img && typeof img.url === "string"
  );

  const readingTime = calculateReadingTime(html);
  const editorName =
    CATEGORY_EDITOR_MAP[category] || "Editör Ekibi";
  const categoryLabel
