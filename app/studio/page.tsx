"use client";

import { useEffect, useState } from "react";
import { auth, googleProvider } from "@/lib/firebaseClient";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";

type AllowResp = { ok: boolean; error?: string };

export default function StudioPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setErr(null);
      setAllowed(null);
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

  // allowed === true
  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h1>/studio</h1>
        <span style={{ fontSize: 14, color: "#666" }}>{userEmail}</span>
        <button onClick={logout} style={{ marginLeft: "auto", padding: 8, border: "1px solid #ccc" }}>
          Çıkış
        </button>
      </div>

      <hr style={{ margin: "16px 0" }} />

      <p>Giriş başarılı ve yetkilisin. Bir sonraki adımda “Generate News” düğmesi ve kuyruk ekranını ekleyeceğiz.</p>
    </main>
  );
}
