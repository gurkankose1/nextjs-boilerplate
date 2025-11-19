
import { getArticle, Article } from "@/lib/articles";
import { notFound } from 'next/navigation';
import Image from "next/image";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// Bileşen prop arayüzü
interface ArticlePageProps {
  params: { id: string };
}

// SEO için dinamik metadata oluşturma
// Not: Next.js, veriyi `generateMetadata` ve `Page` arasında paylaşılan bir fetch ile otomatik olarak tekilleştirir.
export async function generateMetadata({ params }: ArticlePageProps) {
    const article = await getArticle(params.id);
    
    if (!article) {
        return { title: 'Haber Bulunamadı' };
    }

    // İçerikten güvenli bir açıklama metni oluştur
    const description = article.content.replace(/<[^>]+>/g, '').substring(0, 155);

    return {
        title: `${article.title} | SkyNews TR`,
        description: description,
        openGraph: {
            title: article.title,
            description: description,
            // OpenGraph için resim URL'si mutlak bir yol olmalıdır
            images: article.authorAvatar ? [article.authorAvatar] : [],
        },
    };
}

// Makale detay sayfası
export default async function ArticlePage({ params }: ArticlePageProps) {
  const article = await getArticle(params.id);

  if (!article) {
    notFound();
  }

  // Gelen ISO string formatındaki tarihi güvenli bir şekilde Date objesine çevir
  const publishedDate = new Date(article.createdAt);

  return (
    <main className="min-h-screen p-4 sm:p-8 md:p-12 lg:p-24 bg-dots text-white">
      <div className="mx-auto max-w-3xl">
        <article>
          {/* Başlık */}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-50 leading-tight mb-6">
            {article.title}
          </h1>

          {/* Yazar Bilgileri */}
          <div className="flex items-center gap-4 mb-8">
            <Image 
              src={article.authorAvatar || 'https://source.unsplash.com/512x512/?pilot'}
              alt={`${article.authorName} profili`}
              width={56}
              height={56}
              className="rounded-full w-14 h-14 object-cover border-2 border-slate-700"
            />
            <div>
              <p className="font-semibold text-slate-200">{article.authorName}</p>
              <p className="text-sm text-slate-400">
                {/* Güvenli Date objesini formatla */}
                Yayımlanma Tarihi: {format(publishedDate, 'dd MMMM yyyy, HH:mm', { locale: tr })}
              </p>
            </div>
          </div>

          {/* İçerik */}
          <div 
            className="prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-slate-100 prose-a:text-sky-400 prose-strong:text-slate-100 prose-blockquote:border-sky-700 prose-blockquote:text-slate-400"
            dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br />') }}
          />

        </article>
      </div>
    </main>
  );
}
