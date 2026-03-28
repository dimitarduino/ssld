import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { User } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'ssld-secret-key-12345';

export async function createToken(user: User): Promise<string> {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function verifyToken(token: string): Promise<any> {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function getSession(): Promise<any | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  
  if (!token) return null;
  
  return verifyToken(token);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('auth_token');
}
