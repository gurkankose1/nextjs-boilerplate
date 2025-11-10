"use client";

import { useEffect, useState } from "react";
import { auth, googleProvider } from "../../lib/firebaseClient";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";

type AllowResp = { ok: boolean; error?: string };
type GenImage = { id?: string; url: string; alt?: string; credit?: string; link?: string; width?: number; height?: number };
type GenResult = {
  seoTitle: string;
  metaDesc: string;
  slug: string;
  tags: string[];
  html: string;
  keywords: string[];
  images: GenImage[];
  imageQuery?: string;
};

export default function StudioPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // form/dry-run state
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<GenResult | null>(null);

  // save draft state
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setErr(null);
      setAllowed(null);
      setResult(null);
      setSavedId(null);
      if (!u) {
        setUserEmail(null);
        setLoading(false);
        return;
      }
      const email = u.email || null;
      setUserEmail(email);
      if (!email) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch("/api/allowlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = (await res.json()) as AllowResp;
        setAllowed(data.ok);
      } catch (e: any) {
        setErr(String(e?.message || e));
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const login = async () => {
    setErr(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  };

  const logout = async () => {
    await signOut(auth);
    setAllowed(null);
    setUserEmail(null);
  };

  const generate = async () => {
    setErr(null);
    setResult(null);
    setSavedId(null);
    setRunning(true);
    try {
      const res = await fetch("/api/generate/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Generate failed");
      setResult(j.result as GenResult);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setRunning(false);
    }
  };

  const saveDraft = async () => {
    if (!result) return;
    setErr(null);
    setSaving(true);
    setSavedId(null);
    try {
      const res = await fetch("/api/drafts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actor: userEmail,
          draft: result,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Save failed");
      setSavedId(j.id as string);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main style={{ padding: 24 }}>Yükleniyor…</main>;

  if (!userEmail) {
    return (
      <main style={{ padding: 24 }}>
        <h1>/studio</h1>
        <p>Giriş yapman gerekiyor.</p>
        <button onClick={login} style={{ padding: 8, border: "1px solid #ccc" }}>
          Google ile Giriş
        </button>
        {err && <p style={{ color: "crimson" }}>{err}</p>}
      </main>
    );
  }

  if (allowed === false) {
    return (
      <main style={{ padding: 24 }}>
        <p>
          <strong>{userEmail}</strong> yetkili listesinde değil.
        </p>
        <button onClick={logout} style={{ padding: 8, border: "1px solid #ccc" }}>
          Çıkış
        </button>
        {err && <p style={{ color: "crimson" }}>{err}</p>}
      </main>
    );
  }

  return (
    <main style={{ padding: 24, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h1>/studio</h1>
        <span style={{ fontSize: 14, color: "#666" }}>{userEmail}</span>
        <button onClick={logout} style={{ marginLeft: "auto", padding: 8, border: "1px solid #ccc" }}>
          Çıkış
        </button>
      </div>

      {/* --- ÜSTTE GÖRÜNÜR BUTONLAR --- */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={generate} disabled={running || !input.trim()} style={{ padding: 10, border: "1px solid #333" }}>
          {running ? "Üretiyor..." : "Generate News (dry-run)"}
        </button>
        <button
          onClick={saveDraft}
          disabled={!result || saving}
          style={{ padding: 10, border: "1px solid #28a745", opacity: !result ? 0.5 : 1 }}
          title={!result ? "Önce Generate yap" : "Taslağı kaydet"}
        >
          {saving ? "Kaydediyor..." : "Save Draft"}
        </button>
        {savedId && <span style={{ color: "#28a745" }}>Kaydedildi ✓ (id: {savedId})</span>}
      </div>

      <section style={{ display: "grid", gap: 8 }}>
        <label>
          <strong>Kaynak başlığı / linki / kısa özet</strong>
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Örn: 'THY, filoya 20 yeni uçak eklemeyi planlıyor...' vb."
          rows={5}
          style={{ width: "100%", padding: 8, border: "1px solid #ccc" }}
        />
        {err && <p style={{ color: "crimson" }}>{err}</p>}
      </section>

      {result && (
        <section style={{ display: "grid", gap: 12 }}>
          <h2>Önizleme</h2>
          <div style={{ display: "grid", gap: 4 }}>
            <div><strong>SEO Title:</strong> {result.seoTitle}</div>
            <div><strong>Meta Description:</strong> {result.metaDesc}</div>
            <div><strong>Slug:</strong> {result.slug}</div>
            <div><strong>Etiketler:</strong> {result.tags?.join(", ")}</div>
            <div><strong>Anahtar Kelimeler:</strong> {result.keywords?.join(", ")}</div>
          </div>

          <div>
            <strong>Gövde (HTML):</strong>
            <div
              style={{ border: "1px solid #eee", padding: 12, marginTop: 6 }}
              dangerouslySetInnerHTML={{ __html: result.html || "<p>(boş)</p>" }}
            />
          </div>

          {Array.isArray(result.images) && result.images.length > 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              <strong>Görsel Adayları (Pexels):</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                {result.images.map((img, idx) => (
                  <a key={img.id || idx} href={img.link || img.url} target="_blank" style={{ border: "1px solid #eee", padding: 6 }}>
                    <img src={img.url} alt={img.alt || ""} style={{ width: "100%", height: 140, objectFit: "cover" }} />
                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                      Fotoğraf: {img.credit || "Pexels"}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
v
