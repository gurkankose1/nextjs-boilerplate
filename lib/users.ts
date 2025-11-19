
import { db } from "@/lib/firebaseAdmin";

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'editor' | 'chief-editor';
}

export async function getUsers(): Promise<User[]> {
  const usersSnapshot = await db.collection('users').get();
  if (usersSnapshot.empty) {
    return [];
  }
  return usersSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      email: data.email,
      role: data.role,
    };
  }) as User[];
}
