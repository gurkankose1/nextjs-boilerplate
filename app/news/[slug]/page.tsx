// app/news/[slug]/page.tsx
import { adminDb } from "@/lib/firebaseAdmin";
import { notFound } from "next/navigation";
import Link from "next/link";

// Site adı env’den yönetilebilir, domain değişirse burada kontrol edilir
const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "SkyNews.Tr";

// Sanal Editörler
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
  if (v.toDate) return v.toDate().toISOString();
  if (typeof v === "string") return new Date(v).toISOString();
  return null;
}

// Okuma süresi (dakika)
function calculateReadingTime(html: string) {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 180));
  return minutes;
}

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const slug = params.slug;

  const snapshot = await adminDb
    .collection("articles")
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapshot.empty) return notFound();

  const doc = snapshot.docs[0];
  const data = doc.data();

  const html = data.html as string;
  const title = (data.title as string) || (data.seoTitle as string);
  const category = (data.category as string) ?? "other";
  const metaDesc = (data.metaDesc as string) ?? "";
  const publishedAt = toIsoString(data.publishedAt);
  const images = (data.images as any[]) ?? [];

  const readingTime = calculateReadingTime(html);

  const editorName =
    CATEGORY_EDITOR_MAP[category] || "Editör Ekibi";

  const categoryLabel =
    CATEGORY_LABEL_MAP[category] || category;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 px-4 py-8 md:px-8 lg:px-16">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Breadcrumbs */}
        <nav className="text-xs text-slate-400 flex items-center gap-2">
          <Link href="/" className="hover:text-sky-300 transition">Ana Sayfa</Link>
          <span>/</span>
          <Link
            href={`/?category=${category}`}
            className="hover:text-sky-300 transition"
          >
            {categoryLabel}
          </Link>
          <span>/</span>
          <span className="text-slate-500">{title}</span>
        </nav>

        {/* Başlık */}
        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-snug">
            {title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="px-2 py-1 rounded-full border border-slate-700/80">
              {categoryLabel}
            </span>
            {publishedAt && (
              <span>{new Date(publishedAt).toLocaleString("tr-TR")}</span>
            )}
            <span>{readingTime} dk okuma</span>
            <span>Yazar: {editorName}</span>
          </div>
        </header>

        {/* Kapak Görseli */}
        {images.length > 0 && (
          <div className="rounded-xl overflow-hidden border border-slate-800 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[0].url}
              alt={images[0].alt || title}
              className="w-full max-h-[420px] object-cover"
            />
            {images[0].credit && (
              <div className="text-[10px] text-slate-500 px-3 py-2 bg-slate-900 border-t border-slate-800">
                {images[0].credit}
              </div>
            )}
          </div>
        )}

        {/* Haber İçeriği */}
        <article
          className="prose prose-invert max-w-none prose-p:leading-relaxed prose-headings:text-sky-300"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {/* Haber Görüntüleme Sayacı */}
        <ViewCounter articleId={doc.id} />

      </div>
    </main>
  );
}

function ViewCounter({ articleId }: { articleId: string }) {
  // Client Component hack
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          fetch('/api/articles/view', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: '${articleId}' })
          });
        `,
      }}
    />
  );
}
