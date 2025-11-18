"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";

type Article = {
  id: string;
  title: string;
  seoTitle?: string;
  summary?: string;
  slug: string;
  html?: string;
  category?: string;
  source?: string;
  sourceUrl?: string;
  published?: string;
  createdAt?: string;
  mainImageUrl?: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://skynews-web.vercel.app/";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "not-found" }
  | { status: "success"; article: Article };

export default function NewsArticlePageClient() {
  const params = useParams();
  const searchParams = useSearchParams();

  // slug ve id'yi client tarafında alıyoruz
  const slug = useMemo(() => {
    const value = params?.["slug"];
    if (Array.isArray(value)) return value[0];
    return (value as string) ?? "";
  }, [params]);

  const id = useMemo(() => {
    if (!searchParams) return "";
    const value = searchParams.get("id");
    return value ?? "";
  }, [searchParams]);

  const [state, setState] = useState<FetchState>({ status: "idle" });

  useEffect((
