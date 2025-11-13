// app/page.tsx
import Link from "next/link";
import { adminDb } from "@/lib/firebaseAdmin";

type ArticleCard = {
  id: string;
  title: string;
  slug: string;
  metaDesc?: string | null;
  category?: string | null;
  publishedAt?: string | null;
};

function toIsoString(value: unknown): string | null {
  if (!value) return null;

  // Firestore Timestamp (admin SDK) için
  if (typeof (value as any)?.toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (value instanceof Date) return value.toISOString();

  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  return null;
}

async function getLatestArticles(limit = 20): Promise<ArticleCard[]> {
  const snap = await adminDb
    .collection("articles")
    .orderBy("publishedAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown>;

    return {
      id: doc.id,
      title: (data.title as string) || (data.seoTitle as string) || "SkyNews Haberi",
      slug: (data.slug as string) || doc.id,
      metaDesc: (data.metaDesc as string | undefined) ?? null,
      category: (data.category as string | undefined) ?? null,
      publishedAt: toIsoString(data.publishedAt) ?? null,
    };
  });
}

// Kategori butonları için tanımlar
const CATEGORY_FILTERS = [
  { key: "all", label: "Tümü" },
  { key: "turkish-aviation", label: "Türk Havacılığı" },
  { key: "global-aviation", label: "Küresel Havacılık" },
  { key: "mro-tech", label: "MRO & Teknik" },
  { key: "airport-operations", label: "Havalimanı Operasyon" },
  { key: "ground-handling", label: "Yer Hizmetleri" },
  { key: "authorities", label: "Otoriteler" },
] as const;

type CategoryKey = (typeof CATEGORY_FILTERS)[number]["key"];

const CATEGORY_LABEL_MAP: Record<string, string> = CATEGORY_FILTERS.reduce(
  (acc, item) => {
    if (item.key !== "all") {
      acc[item.key] = item.label;
    }
    return acc;
  },
  {} as Record<string, string>
);

// Geçerli kategori anahtarlarını tutan set
const VALID_CATEGORY_KEYS = new Set<string>(
  CATEGORY_FILTERS.map((c) => c.key)
);

// Her request’te en güncel listeyi almak için
export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: {
    [key: string]: string | string[] | undefined;
    c
