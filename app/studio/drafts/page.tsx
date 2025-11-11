"use client";
import { useEffect, useState } from "react";
import { auth, googleProvider } from "../../../lib/firebaseClient";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";


type Draft = { id: string; seoTitle?: string; html?: string; createdAt?: any; metaDesc?: string; slug?: string; tags?: string[] };


type AllowResp = { ok: boolean; error?: string };


export default function DraftsPage() {
const [userEmail, setUserEmail] = useState<string | null>(null);
const [allowed, setAllowed] = useState<boolean | null>(null);
const [items, setItems] = useState<Draft[]>([]);
const [loading, setLoading] = useState(true);
const [err, setErr] = useState<string | null>(null);


useEffect(() => {
const unsub = onAuthStateChanged(auth, async (u) => {
setErr(null);
setAllowed(null);
setItems([]);
if (!u) { setUserEmail(null); setLoading(false); return; }
const email = u.email || null;
setUserEmail(email);
if (!email) { setAllowed(false); setLoading(false); return; }
try {
const res = await fetch("/api/allowlist", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ email }) });
const data = (await res.json()) as AllowResp;
setAllowed(data.ok);
if (data.ok) await refresh();
} catch (e: any) { setErr(String(e?.message || e)); setAllowed(false); }
finally { setLoading(false); }
});
return () => unsub();
}, []);


async function refresh() {
const r = await fetch("/api/drafts/list");
const j = await r.json();
if (!j.ok) throw new Error(j.error);
setItems(j.items as Draft[]);
}


const login = async () => { await signInWithPopup(auth, googleProvider); };
const logout = async () => { await signOut(auth); setAllowed(null); setUserEmail(null); };


async function publish(id: string) {
if (!confirm("Yayınlansın mı?")) return;
setErr(null);
try {
const r = await fetch("/api/drafts/publish", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ draftId: id }) });
const j = await r.json();
if (!j.ok) throw new Error(j.error);
await refresh();
alert("Yayınlandı: /news/" + j.slug);
} catch (e: any) { setErr(String(e?.message || e)); }
}


if (loading) return <main style={{ padding: 24 }}>Yükleniyor…</main>;
if (!userEmail) return <main style={{ padding: 24 }}>
<h1>Taslaklar</h1>
<button onClick={login}>Google ile Giriş</button>
{err && <p style={{ color: "crimson" }}>{err}</p>}
</main>;
if (allowed === false) return <main style={{ padding: 24 }}>
<p>Bu sayfa için yetkin yok.</p>
<button onClick={logout}>Çıkış</button>
</main>;


return (
<main style={{ padding: 24 }}>
<h1>/studio/drafts</h1>
<div style={{ display: "grid", gap: 12 }}>
{items.map((d) => (
<article key={d.id} style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}>
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
<h3 style={{ margin: 0 }}>{d.seoTitle || d.slug || d.id}</h3>
<div style={{ display: "flex", gap: 8 }}>
<button onClick={() => window.open(`/preview/draft/${d.id}`, "_blank")}>Önizle</button>
<button onClick={() => publish(d.id)}>Publish</button>
</div>
</div>
<p style={{ opacity: 0.8, marginTop: 6 }}>{(d.metaDesc || "").slice(0, 160)}</p>
</article>
))}
</div>
{items.length === 0 && <p>Hiç taslak yok.</p>}
{err && <p style={{ color: "crimson" }}>{err}</p>}
</main>
);
}
