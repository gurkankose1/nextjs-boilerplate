
import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { getPersona } from '@/lib/personas';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: Request) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ message: 'Yetkiniz yok.' }, { status: 403 });
  }

  try {
    const { personaId, topic } = await request.json();

    if (!personaId || !topic) {
      return NextResponse.json({ message: 'Yazar ve konu seçimi zorunludur.' }, { status: 400 });
    }

    const persona = await getPersona(personaId);
    if (!persona) {
      return NextResponse.json({ message: 'Geçersiz sanal yazar seçimi.' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    
    const fullPrompt = `
      Sen bir havacılık haber portalı için yazan bir yazarsın.
      Kimliğin ve yazım stilin aşağıda tanımlanmıştır:
      ---KİMLİK---
      ${persona.prompt}
      ---KİMLİK SONU---

      Şimdi, bu kimliği ve üslubu kullanarak aşağıdaki konu hakkında, SEO uyumlu, dikkat çekici bir başlık ve detaylı bir haber metni oluştur.
      Haber, okuyucunun ilgisini çekecek bir giriş, konunun detaylandırıldığı bir gelişme ve bir sonuç bölümünden oluşmalıdır. Havacılık terimlerini doğru kullanmaya özen göster.

      KONU: "${topic}"

      Çıktıyı aşağıdaki gibi JSON formatında ver. Başka hiçbir metin ekleme.

      {
        "title": "Buraya ilgi çekici başlığı yaz",
        "content": "Buraya paragflar halinde haber metnini yaz. Paragraflar arasına \n\n koy."
      }
    `;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    let text = response.text();

    // Yapay zeka çıktısındaki markdown formatını temizle
    text = text.replace(/```json/g, '').replace(/```/g, '');
    
    const generatedData = JSON.parse(text);

    return NextResponse.json(generatedData);

  } catch (error) {
    console.error("İçerik üretme hatası:", error);
    return NextResponse.json({ message: 'Yapay zeka ile içerik üretilirken bir hata oluştu.' }, { status: 500 });
  }
}
