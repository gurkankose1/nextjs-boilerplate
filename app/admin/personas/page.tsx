
import { getPersonas } from "@/lib/personas";
import Link from "next/link";
import Image from "next/image";

export default async function PersonasPage() {
  const personas = await getPersonas();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 text-white bg-dots">
      <div className="w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-lg shadow-slate-950/40">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-50">Sanal Yazar Yönetimi</h1>
          <Link href="/admin/personas/new" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Yeni Yazar Ekle
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {personas.map((persona) => (
            <div key={persona.id} className="rounded-xl border border-slate-800 bg-slate-800/40 p-5 flex flex-col items-center text-center shadow-md">
                <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-slate-700">
                    {persona.avatar ? (
                        <Image 
                            src={persona.avatar} 
                            alt={`${persona.name} profili`} 
                            width={96} 
                            height={96} 
                            className="object-cover w-full h-full"
                        />
                    ) : (
                       <div className="w-full h-full bg-slate-700 flex items-center justify-center text-slate-500">?</div>
                    )}
                </div>
              <h3 className="font-bold text-lg text-slate-100">{persona.name}</h3>
              <p className="text-xs text-slate-400 mt-1 h-16 overflow-hidden text-ellipsis">
                {persona.prompt}
              </p>
              <Link href={`/admin/personas/${persona.id}`} className="mt-4 text-sm font-semibold text-sky-400 hover:text-sky-300">
                Düzenle →
              </Link>
            </div>
          ))}
        </div>
         <p className="mt-8 text-xs text-slate-500">
           Bu bölümde, yapay zekanın makaleleri yazarken bürüneceği sanal yazar kimliklerini yönetebilirsiniz. Her bir yazarın kendine özgü bir uzmanlık alanı, yazım stili ve profili olacaktır. Buradaki "prompt" alanı, o yazarın nasıl davranacağını belirleyen en kritik talimatları içerir.
        </p>
      </div>
    </main>
  );
}
