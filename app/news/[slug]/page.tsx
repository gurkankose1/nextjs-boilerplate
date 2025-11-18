type PageProps = {
  params: {
    slug: string;
  };
  searchParams?: {
    [key: string]: string | string[] | undefined;
  };
};

function getIdFromSearchParams(
  searchParams: PageProps["searchParams"]
): string | null {
  if (!searchParams) return null;
  const raw = searchParams.id;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw;
}

export default function NewsArticleDebugPage({
  params,
  searchParams
}: PageProps) {
  const slug = params?.slug ?? null;
  const id = getIdFromSearchParams(searchParams);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        color: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      <div
        style={{
          maxWidth: "640px",
          width: "100%",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid #1f2937",
          backgroundColor: "#020617"
        }}
      >
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 600,
            marginBottom: "12px"
          }}
        >
          News Debug Sayfası
        </h1>
        <p style={{ fontSize: "14px", color: "#9ca3af", marginBottom: "16px" }}>
          Bu sayfa sadece rotanın çalışıp çalışmadığını test etmek için
          gösteriliyor.
        </p>

        <div
          style={{
            fontSize: "13px",
            backgroundColor: "#020617",
            borderRadius: "12px",
            border: "1px solid #374151",
            padding: "12px",
            lineHeight: 1.6
          }}
        >
          <p>
            <strong>URL slug:</strong>{" "}
            <code style={{ color: "#38bdf8" }}>{slug}</code>
          </p>
          <p>
            <strong>Query id:</strong>{" "}
            <code style={{ color: "#38bdf8" }}>{id}</code>
          </p>
        </div>

        <p
          style={{
            marginTop: "16px",
            fontSize: "12px",
            color: "#6b7280"
          }}
        >
          Eğer bu kutuyu görebiliyorsan, <code>/app/news/[slug]/page.tsx</code>{" "}
          rotası çalışıyor demektir.
        </p>
      </div>
    </main>
  );
}
