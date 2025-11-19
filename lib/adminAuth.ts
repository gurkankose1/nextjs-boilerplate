
import { headers } from 'next/headers';

export const ADMIN_SESSION_COOKIE_NAME = 'admin-session';

/**
 * Gelen isteğin yönetici yetkisine sahip olup olmadığını doğrular.
 * @param request Gelen HTTP isteği.
 * @returns Yönetici ise `true`, değilse `false` döner.
 */
export async function verifyAdmin(request: Request): Promise<boolean> {
  const headersList = headers();
  const adminSecret = headersList.get('Authorization');

  // Gelen gizli anahtarın ortam değişkenindeki ile eşleşip eşleşmediğini kontrol et
  if (adminSecret && adminSecret === `Bearer ${process.env.ADMIN_SECRET}`) {
    return true;
  }

  // Eğer üstteki kontrol başarısız olursa, cookielerdeki secreti de kontrol et
  // Bu, tarayıcı-içi client-side istekler için bir fallback sağlar
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
  const adminCookieSecret = cookies['admin-secret'];

  if (adminCookieSecret && adminCookieSecret === process.env.ADMIN_SECRET) {
    return true;
  }

  return false;
}
