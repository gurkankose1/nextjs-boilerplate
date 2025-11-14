// components/admin/AdminBlogTermViewClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type ApiResponseOk = {
  ok: true;
  id: string;
  data: any;
};

type ApiResponseErr = {
  ok: false;
  error: string;
};

type State =
  | { status: "idle" }
  | { status: "loading"; id: string }
  | { status: "error"; message: string }
  | { status: "loaded"; id: string; data: any };

export function AdminBlogTermViewClient() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id");
  const [state, setState] = useState<State>({ status: "idle" });

  useEffect(() => {
    const id = (idFromUrl ?? "").trim();

    if (!id) {
      setState({
        status: "error",
        message:
          "URL'de ?id=... parametresi yok veya boş. Liste sayfasından tekrar deneyebilirsin.",
      });
      return;
    }

    setState({ status: "loading", id });

    const fetchDoc = async () => {
      try {
        const res = await fetch(
          `/api/admin/blog-terms/view?id=${encodeURIComponent(id)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!res.ok) {
          let msg = `Sunucu hatası (HTTP ${res.status})`;
          try {
            const json = (await res.json()) as ApiResponseErr;
            if (json?.error) msg = json.error;
          } catch {
            // yut
          }
          setState({ status: "error", message: msg });
          return;
        }

        const json = (await res.json()) as ApiResponseOk | ApiResponseErr;
        if (!json.ok) {
          setState({
            status: "error",
            message:
              "API hatası: " +
              ("error" in json ? json.error : "Bilinmeyen hata"),
          });
          return;
        }

        setState({
          status: "loaded",
          id: json.id,
          data: json.data,
        });
      } catch (err: any) {
        setState({
          status: "error",
          message: String(err?.message || err),
        });
      }
    };

    fetchDoc();
  }, [idFromUrl]);

  if (state.status === "idle" || state.status === "loading") {
    const loadingId =
      state.status === "loading" ? state.id : idFromUrl ?? "(yok)";
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-50">
          Doküman yükleniyor…
        </h2>
        <p className="text-xs text-slate-300 mb-2">
          ID:&nbsp;
          <span className="font-mono text-[11px] text-slate-100 break-all">
            {loadingId}
          </span>
        </p>
        <p className="text-[11px] text-slate-500">
          Firestore&apos;dan blog_posts koleksiyonundaki doküman çekiliyor.
        </p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="rounded-2xl border border-red-900/60 bg-red-950/40 p-4">
        <h2 className="mb-2 text-sm font-semibold text-red-100">
          Hata oluştu
        </h2>
        <p className="text-xs text-red-200 whitespace-pre-wrap">
          {state.message}
        </p>
        <div className="mt-3 rounded border border-red-900/60 bg-slate-950/40 p-2 text-[11px] text-slate-300">
          URL arama parametreleri (debug):
          <pre className="mt-1 max-h-40 overflow-auto font-mono text-[10px] text-sky-200">
{JSON.stringify(
  Object.fromEntries(searchParams.entries()),
  null,
  2
)}
          </pre>
        </div>
      </section>
    );
  }

  // loaded
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <h2 className="mb-3 text-sm font-semibold text-slate-50">
        Doküman Detayı (Ham JSON)
      </h2>
      <p className="mb-2 text-xs text-slate-300">
        ID:&nbsp;
        <span className="font-mono text-[11px] text-slate-100 break-all">
          {state.id}
        </span>
      </p>
      <pre className="mt-3 max-h-[480px] overflow-auto rounded-xl bg-slate-950/80 p-3 font-mono text-[11px] text-sky-200">
{JSON.stringify(state.data, null, 2)}
      </pre>
    </section>
  );
}
