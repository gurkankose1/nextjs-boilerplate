
import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/adminAuth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
    const prompt = `Aşağıdaki havacılık uzmanı için, haber yazarken kullanması gereken bir kimlik ve yazım stili talimatı (prompt) oluştur. Bu prompt, o kişinin uzmanlık alanını, bakış açısını, üslubunu ve genellikle ne tür konulara odaklandığını net bir şekilde belirtmelidir. Bu uzman: ${name}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ prompt: text });

  } catch (error) {
    console.error("Prompt oluşturma hatası:", error);
    return NextResponse.json({ message: 'Yapay zeka ile prompt oluşturulurken bir hata oluştu.' }, { status: 500 });
  }
}
