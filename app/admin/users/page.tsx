
import { getUsers } from "@/lib/users";
import Link from "next/link";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 text-white">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-lg shadow-slate-950/40">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-slate-50">Kullanıcı Yönetimi</h1>
          <Link href="/admin/users/new" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            Yeni Kullanıcı Ekle
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-800/50">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Kullanıcı Adı / Email
                </th>
                <th scope="col" className="px-6 py-3">
                  Rol
                </th>
                <th scope="col" className="px-6 py-3">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                  <td className="px-6 py-4 font-medium text-slate-50 whitespace-nowrap">
                    {user.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-red-200 text-red-800' :
                      user.role === 'editor' ? 'bg-blue-200 text-blue-800' :
                      'bg-green-200 text-green-800'
                    }`}>
                      {user.role === 'admin' ? 'Yönetici' :
                       user.role === 'editor' ? 'Editör' :
                       'Genel Yayın Yönetmeni'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <a href="#" className="font-medium text-sky-500 hover:underline">Düzenle</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
         <p className="mt-6 text-xs text-slate-500">
            Bu arayüz, sistemdeki tüm kullanıcıları yönetmenizi sağlar. Yeni editörler ekleyebilir ve mevcut kullanıcıların rollerini düzenleyebilirsiniz.
          </p>
      </div>
    </main>
  );
}
