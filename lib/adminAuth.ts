// lib/adminAuth.ts

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Gg.113355";

/**
 * Admin kullanıcı adı / şifre kontrolü
 */
export function validateAdminCredentials(username: string, password: string) {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

/**
 * Admin cookie adı – tüm projede aynı ismi kullanalım
 */
export const ADMIN_SESSION_COOKIE_NAME = "admin_session";
