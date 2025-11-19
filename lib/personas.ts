
import { db } from "@/lib/firebaseAdmin";

export interface Persona {
  id: string;
  name: string;
  prompt: string;
  avatar?: string; // Profil resmi URL'si, opsiyonel
}

export async function getPersonas(): Promise<Persona[]> {
  const personasSnapshot = await db.collection('personas').get();
  if (personasSnapshot.empty) {
    return [];
  }
  return personasSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      prompt: data.prompt,
      avatar: data.avatar,
    };
  }) as Persona[];
}

export async function getPersona(id: string): Promise<Persona | null> {
  const doc = await db.collection('personas').doc(id).get();
  if (!doc.exists) {
    return null;
  }
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    prompt: data.prompt,
    avatar: data.avatar,
  } as Persona;
}
