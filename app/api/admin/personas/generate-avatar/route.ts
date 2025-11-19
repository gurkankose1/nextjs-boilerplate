
import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Bu fonksiyon şimdilik temsili bir URL döndürecektir.
// Gerçek bir imaj üretme servisine (örn: DALL-E, Midjourney API) bağlanabilir.
async function generateImageFromPrompt(prompt: string): Promise<string> {
    // TODO: Gerçek bir imaj üretme servisi entegrasyonu yapılacak.
    // Şimdilik, verilen prompt'a göre temsili bir görsel URL'si döndürelim.
    const seed = prompt.split(' ').join('_');
    return Promise.resolve(`https://source.unsplash.com/512x512/?${seed}`);
}

export async function POST(request: Request) {
  if (!await verifyAdmin(request)) {
    return NextResponse.json({ message: 'Yetkiniz yok.' }, { status: 403 });
  }

  try {
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json({ message: 'Yazar adı zorunludur.' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro"});
    const imagePromptInstruction = `Aşağıdaki uzman için fotogerçekçi, 4k, stüdyo ışığı altında çekilmiş, omuzdan yukarı vesikalık bir profil resmi oluşturmak için İngilizce bir prompt hazırla. Bu prompt, o kişinin mesleğini, deneyimini ve karakterini yansıtmalı. Uzman: ${name}`;
    
    const result = await model.generateContent(imagePromptInstruction);
    const response = await result.response;
    const imagePrompt = response.text();

    // Oluşturulan prompt ile görseli üret (şimdilik simülasyon)
    const avatarUrl = await generateImageFromPrompt(imagePrompt);

    return NextResponse.json({ avatar: avatarUrl });

  } catch (error) {
    console.error("Avatar oluşturma hatası:", error);
    return NextResponse.json({ message: 'Yapay zeka ile avatar oluşturulurken bir hata oluştu.' }, { status: 500 });
  }
}
