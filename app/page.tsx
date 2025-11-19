
import { getArticles, Article } from "@/lib/articles";
import Link from "next/link";
import Image from "next/image";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// HTML temizleme fonksiyonunu daha güvenli hale getiriyoruz
function stripHtml(html: string | null | undefined): string {
  // Girdi null veya undefined ise, .replace hatasını önlemek için boş string döndür
  if (!html) return "";

  // Sunucu tarafında veya istemcide güvenli bir şekilde temizle
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return doc.body.textContent || "";
  }
  // Fallback: Sunucu tarafı veya eski tarayıcılar için regex kullan
  return html.replace(/<[^>]+>/g, '');
}

function ArticleCard({ article }: { article: Article }) {
  // article.content null veya undefined olsa bile uygulamanın çökmemesini sağla
  const summary = stripHtml(article.content).substring(0, 100);

  return (
    <Link href={`/article/${article.id}`} className="block rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40 hover:bg-slate-800/50 transition-colors group">
      <div className="flex items-start gap-4">
        <Image 
          src={article.authorAvatar || 'https://source.unsplash.com/512x512/?pilot'}
          alt={`${article.authorName} profili`}
          width={48}
          height={48}
          className="rounded-full w-12 h-12 object-cover border-2 border-slate-700"
        />
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-50 group-hover:text-sky-400 transition-colors">
            {article.title}
          </h3>
          <p className="text-sm text-slate-400 mt-2">
            {summary}...
          </p>
          <div className="text-xs text-slate-500 mt-3">
            <span>{article.authorName}</span> &middot; <span>{format(new Date(article.createdAt), 'dd MMMM yyyy', { locale: tr })}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default async function HomePage() {
  const articles = await getArticles();

  return (
    <main className="min-h-screen p-4 sm:p-8 md:p-12 lg:p-24 bg-dots">
      <div className="mx-auto max-w-4xl">
        <header className="text-center mb-12">
            <h1 className="text-5xl font-bold tracking-tight text-slate-50">
                SkyNews TR
            </h1>
            <p className="mt-4 text-lg text-slate-400">
                Geleceğin havacılık haberleri, yapay zeka ile şimdi sizinle.
            </p>
        </header>

        <div className="space-y-6">
          {articles.length > 0 ? (
            articles.map(article => (
              <ArticleCard key={article.id} article={article} />
            ))
          ) : (
            <div className="text-center py-16 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60">
                <p className="text-slate-400">Henüz yayımlanmış bir haber bulunmuyor.</p>
                <p className="text-sm text-slate-500 mt-2">Yönetim panelinden ilk yapay zeka haberinizi oluşturun!</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
