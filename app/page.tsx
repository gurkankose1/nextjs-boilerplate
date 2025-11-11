// app/page.tsx
export default function Home() {  //dikkat
  return (
    <main style={{ padding: 24 }}>
      <h1>SkyNews AI — Starter</h1>
      <p>Hızlı bağlantılar:</p>
      <ul>
        <li><a href="/api/health">/api/health</a></li>
        <li><a href="/studio">/studio</a></li>
      </ul>
    </main>
  );
}
